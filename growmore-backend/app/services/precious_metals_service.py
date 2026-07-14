"""
Precious Metals Service — fetches live gold/silver prices and AI market analysis.

Uses Yahoo Finance API for international prices, converts to PKR.
Uses OpenAI for market analysis and insights.
"""
import logging
import time
from decimal import Decimal
from typing import Any, Dict, List, Optional

import httpx

from app.config.settings import settings

logger = logging.getLogger(__name__)

# Constants
TROY_OZ_TO_GRAMS = Decimal("31.1035")
TOLA_TO_GRAMS = Decimal("11.6638")

# Simple in-memory cache
_price_cache: Dict[str, Any] = {}
_analysis_cache: Dict[str, Any] = {}

PRICE_CACHE_TTL = 900  # 15 minutes
ANALYSIS_CACHE_TTL = 3600  # 1 hour


def _get_cached(cache: dict, key: str, ttl: int) -> Optional[Any]:
    entry = cache.get(key)
    if entry and (time.time() - entry["ts"]) < ttl:
        return entry["data"]
    return None


def _set_cached(cache: dict, key: str, data: Any):
    cache[key] = {"data": data, "ts": time.time()}


async def _fetch_yahoo_chart(symbol: str, range_: str = "1mo", interval: str = "1d") -> Optional[dict]:
    """Fetch chart data from Yahoo Finance API."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    params = {"interval": interval, "range": range_}
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(url, params=params, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error(f"Yahoo Finance error for {symbol}: {e}")
            return None


async def _fetch_exchange_rate() -> Decimal:
    """Get USD to PKR exchange rate."""
    cached = _get_cached(_price_cache, "usd_pkr", PRICE_CACHE_TTL)
    if cached:
        return Decimal(str(cached))

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get("https://api.exchangerate-api.com/v4/latest/USD")
            resp.raise_for_status()
            rate = resp.json()["rates"]["PKR"]
            _set_cached(_price_cache, "usd_pkr", rate)
            return Decimal(str(rate))
        except Exception as e:
            logger.error(f"Exchange rate error: {e}")
            return Decimal("278.50")  # fallback


def _parse_yahoo_price(data: dict) -> Optional[Dict[str, Any]]:
    """Extract current price and change from Yahoo chart response."""
    try:
        result = data["chart"]["result"][0]
        meta = result["meta"]
        current = Decimal(str(meta["regularMarketPrice"]))
        previous = Decimal(str(meta["chartPreviousClose"]))
        change = current - previous
        change_pct = (change / previous * 100) if previous else Decimal("0")
        return {
            "price_usd": current,
            "previous_close_usd": previous,
            "change_usd": change,
            "change_pct": change_pct,
        }
    except (KeyError, IndexError, TypeError):
        return None


def _parse_yahoo_history(data: dict) -> List[Dict[str, Any]]:
    """Extract historical prices from Yahoo chart response."""
    try:
        result = data["chart"]["result"][0]
        timestamps = result["timestamp"]
        closes = result["indicators"]["quote"][0]["close"]
        history = []
        for ts, close in zip(timestamps, closes):
            if close is not None:
                from datetime import datetime, timezone
                dt = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d")
                history.append({"date": dt, "price": close})
        return history
    except (KeyError, IndexError, TypeError):
        return []


async def get_precious_metals_prices() -> Dict[str, Any]:
    """
    Get live gold and silver prices in PKR (per tola and per gram).
    Uses Yahoo Finance for international prices + exchange rate conversion.
    """
    cached = _get_cached(_price_cache, "metals", PRICE_CACHE_TTL)
    if cached:
        return cached

    # Fetch gold (XAU), silver (XAG), and exchange rate in parallel
    import asyncio
    gold_task = _fetch_yahoo_chart("GC=F", range_="5d", interval="1d")
    silver_task = _fetch_yahoo_chart("SI=F", range_="5d", interval="1d")
    rate_task = _fetch_exchange_rate()

    gold_data, silver_data, pkr_rate = await asyncio.gather(gold_task, silver_task, rate_task)

    gold_info = _parse_yahoo_price(gold_data) if gold_data else None
    silver_info = _parse_yahoo_price(silver_data) if silver_data else None

    result = {
        "gold": _build_metal_prices("Gold", gold_info, pkr_rate),
        "silver": _build_metal_prices("Silver", silver_info, pkr_rate),
        "exchange_rate": float(pkr_rate),
        "last_updated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    _set_cached(_price_cache, "metals", result)
    return result


def _build_metal_prices(metal: str, info: Optional[Dict], pkr_rate: Decimal) -> Dict[str, Any]:
    """Convert international troy oz price to PKR per tola and per gram."""
    if not info:
        return {
            "name": metal,
            "price_usd_oz": 0,
            "per_tola": 0,
            "per_gram": 0,
            "per_10_gram": 0,
            "change_amount": 0,
            "change_percentage": 0,
        }

    price_usd = info["price_usd"]
    change_usd = info["change_usd"]
    change_pct = info["change_pct"]

    # Convert: USD/troy oz → PKR/gram → PKR/tola
    price_pkr_per_gram = (price_usd * pkr_rate) / TROY_OZ_TO_GRAMS
    price_pkr_per_tola = price_pkr_per_gram * TOLA_TO_GRAMS
    price_pkr_per_10g = price_pkr_per_gram * 10

    change_pkr_per_tola = (change_usd * pkr_rate) / TROY_OZ_TO_GRAMS * TOLA_TO_GRAMS

    # Gold purities
    purities = {}
    if metal == "Gold":
        for karat, factor in [(24, 1.0), (22, 22/24), (21, 21/24), (18, 18/24)]:
            f = Decimal(str(factor))
            purities[f"{karat}k"] = {
                "per_tola": round(float(price_pkr_per_tola * f), 0),
                "per_gram": round(float(price_pkr_per_gram * f), 2),
                "per_10_gram": round(float(price_pkr_per_10g * f), 0),
            }

    return {
        "name": metal,
        "price_usd_oz": round(float(price_usd), 2),
        "per_tola": round(float(price_pkr_per_tola), 0),
        "per_gram": round(float(price_pkr_per_gram), 2),
        "per_10_gram": round(float(price_pkr_per_10g), 0),
        "change_amount": round(float(change_pkr_per_tola), 0),
        "change_percentage": round(float(change_pct), 2),
        "purities": purities if metal == "Gold" else None,
    }


async def get_price_history(metal: str = "gold", period: str = "1M") -> Dict[str, Any]:
    """Get historical prices for gold or silver."""
    symbol = "GC=F" if metal == "gold" else "SI=F"
    range_map = {"1W": "5d", "1M": "1mo", "3M": "3mo", "6M": "6mo", "1Y": "1y"}
    yahoo_range = range_map.get(period, "1mo")

    cache_key = f"history_{metal}_{period}"
    cached = _get_cached(_price_cache, cache_key, PRICE_CACHE_TTL)
    if cached:
        return cached

    data = await _fetch_yahoo_chart(symbol, range_=yahoo_range, interval="1d")
    pkr_rate = await _fetch_exchange_rate()

    history_usd = _parse_yahoo_history(data) if data else []

    # Convert to PKR per tola
    history = []
    for point in history_usd:
        price_usd = Decimal(str(point["price"]))
        price_pkr_tola = float((price_usd * pkr_rate) / TROY_OZ_TO_GRAMS * TOLA_TO_GRAMS)
        history.append({
            "date": point["date"],
            "price": round(price_pkr_tola, 0),
        })

    result = {"metal": metal, "period": period, "history": history}
    _set_cached(_price_cache, cache_key, result)
    return result


def _analysis_prompt(gold: Dict, silver: Dict, rate: Any) -> str:
    return (
        "You are a precious-metals market strategist writing for Pakistani investors.\n"
        "Use web search to research the MOST RECENT (last few days/weeks) real drivers of the "
        "gold and silver market and how they affect prices in Pakistan.\n"
        "Cover: global spot gold/silver moves, US Fed policy & real yields, USD strength (DXY), "
        "geopolitics & safe-haven demand, central-bank buying, and the USD/PKR rate & local premiums.\n\n"
        "Current live data for context:\n"
        f"- Gold (24K): Rs. {gold.get('per_tola', 'N/A')}/tola (${gold.get('price_usd_oz', 'N/A')}/oz), change {gold.get('change_percentage', 0)}%\n"
        f"- Silver: Rs. {silver.get('per_tola', 'N/A')}/tola (${silver.get('price_usd_oz', 'N/A')}/oz), change {silver.get('change_percentage', 0)}%\n"
        f"- USD/PKR: {rate}\n\n"
        "Base every point on what you actually found via web search.\n"
        "CRITICAL: You MUST cite your real web sources inline like ([outlet](url)) after factual "
        "claims inside the 'summary', 'key_factors', 'outlook', 'gold_insight' and 'silver_insight' "
        "values. Cite at least 3-5 different reputable sources (Reuters, Bloomberg, Kitco, World Gold "
        "Council, local outlets like Business Recorder). This is mandatory.\n\n"
        "Respond with ONLY a valid JSON object (no markdown fences) in this exact shape:\n"
        "{\n"
        '  "summary": "<3-4 sentence market summary of what is moving gold & silver right now>",\n'
        '  "trend": "bullish" | "bearish" | "neutral",\n'
        '  "key_factors": ["<driver 1>", "<driver 2>", "<driver 3>", "<driver 4>"],\n'
        '  "gold_insight": "<2-3 sentences specific to gold, incl. Pakistan angle>",\n'
        '  "silver_insight": "<2-3 sentences specific to silver>",\n'
        '  "outlook": "<2-3 sentence short-term (days/weeks) outlook>",\n'
        '  "what_to_watch": "<1-2 sentences on the next catalysts/levels to watch>"\n'
        "}\n"
        "Keep key_factors to 3-5 items. Do not invent numbers or dates you did not find."
    )


async def get_market_analysis() -> Dict[str, Any]:
    """Web-search-grounded gold/silver market analysis with real cited sources."""
    cached = _get_cached(_analysis_cache, "analysis", ANALYSIS_CACHE_TTL)
    if cached:
        return cached

    prices = await get_precious_metals_prices()
    gold = prices.get("gold", {})
    silver = prices.get("silver", {})

    def _static_fallback(summary: str, outlook: str) -> Dict[str, Any]:
        return {
            "summary": summary,
            "trend": "neutral",
            "key_factors": [
                "Global economic uncertainty & safe-haven demand",
                "US Fed policy and real interest rates",
                "USD/PKR exchange-rate movements",
                "Central-bank gold buying",
            ],
            "gold_insight": f"Gold is trading at Rs. {gold.get('per_tola', 'N/A')} per tola.",
            "silver_insight": f"Silver is trading at Rs. {silver.get('per_tola', 'N/A')} per tola.",
            "outlook": outlook,
            "what_to_watch": "Watch the USD/PKR rate and upcoming US inflation/Fed signals.",
            "sources": [],
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "model": None,
            "_fallback": True,
        }

    if not settings.openai_api_key:
        result = _static_fallback(
            "Gold and silver prices are driven by global economic conditions, geopolitical tensions, "
            "US monetary policy and USD/PKR exchange-rate movements.",
            "Precious metals remain a key hedge against inflation and currency depreciation in Pakistan.",
        )
        _set_cached(_analysis_cache, "analysis", result)
        return result

    # Reuse the exact web-search + citation helpers used by stock Insights & GrowNews.
    from app.services.stock_insights_service import (
        _parse_json, _clean, _clean_list, _extract_sources,
    )

    model = settings.openai_model or "gpt-4.1-mini"
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.responses.create(
            model=model,
            tools=[{"type": "web_search"}],
            input=_analysis_prompt(gold, silver, prices.get("exchange_rate", "N/A")),
        )
        parsed = _parse_json(response.output_text or "")
        if not parsed:
            result = _static_fallback(
                "Market analysis could not be structured right now. Tap refresh to try again.",
                "Check back shortly for an updated, sourced outlook.",
            )
            _set_cached(_analysis_cache, "analysis", result)
            return result

        trend = str(parsed.get("trend", "neutral")).lower()
        if trend not in ("bullish", "bearish", "neutral"):
            trend = "neutral"

        result = {
            "summary": _clean(parsed.get("summary", "")),
            "trend": trend,
            "key_factors": _clean_list(parsed.get("key_factors")),
            "gold_insight": _clean(parsed.get("gold_insight", "")),
            "silver_insight": _clean(parsed.get("silver_insight", "")),
            "outlook": _clean(parsed.get("outlook", "")),
            "what_to_watch": _clean(parsed.get("what_to_watch", "")),
            "sources": _extract_sources(response),
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "model": model,
        }
        _set_cached(_analysis_cache, "analysis", result)
        return result

    except Exception as e:
        logger.error(f"commodities web_search analysis failed: {e}")
        result = _static_fallback(
            "Market analysis is temporarily unavailable. Please check back later.",
            "Check back shortly for updated analysis.",
        )
        _set_cached(_analysis_cache, "analysis", result)
        return result
