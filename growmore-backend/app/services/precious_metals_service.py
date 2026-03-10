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


async def get_market_analysis() -> Dict[str, Any]:
    """Generate AI-powered gold/silver market analysis using OpenAI."""
    cached = _get_cached(_analysis_cache, "analysis", ANALYSIS_CACHE_TTL)
    if cached:
        return cached

    # Get current prices for context
    prices = await get_precious_metals_prices()
    gold = prices.get("gold", {})
    silver = prices.get("silver", {})

    prompt = f"""You are a precious metals market analyst. Provide a brief, insightful analysis of the current gold and silver market conditions. Focus on Pakistan's perspective.

Current market data:
- Gold (24K): Rs. {gold.get('per_tola', 'N/A')}/tola (${gold.get('price_usd_oz', 'N/A')}/oz), change: {gold.get('change_percentage', 0)}%
- Silver: Rs. {silver.get('per_tola', 'N/A')}/tola (${silver.get('price_usd_oz', 'N/A')}/oz), change: {silver.get('change_percentage', 0)}%
- USD/PKR: {prices.get('exchange_rate', 'N/A')}

Provide your analysis in this JSON format:
{{
    "summary": "2-3 sentence market summary",
    "trend": "bullish" or "bearish" or "neutral",
    "key_factors": ["factor 1", "factor 2", "factor 3", "factor 4"],
    "outlook": "1-2 sentence short-term outlook",
    "gold_insight": "1 sentence specific to gold",
    "silver_insight": "1 sentence specific to silver"
}}

Respond ONLY with valid JSON, no markdown or extra text."""

    if not settings.openai_api_key:
        fallback = {
            "summary": "Gold and silver prices are influenced by global economic conditions, geopolitical tensions, and USD/PKR exchange rate movements.",
            "trend": "neutral",
            "key_factors": [
                "Global economic uncertainty",
                "USD/PKR exchange rate fluctuations",
                "Central bank monetary policies",
                "Safe-haven demand dynamics",
            ],
            "outlook": "Precious metals remain a key hedge against inflation and currency depreciation in Pakistan.",
            "gold_insight": f"Gold is trading at Rs. {gold.get('per_tola', 'N/A')} per tola.",
            "silver_insight": f"Silver is trading at Rs. {silver.get('per_tola', 'N/A')} per tola.",
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        _set_cached(_analysis_cache, "analysis", fallback)
        return fallback

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.openai_api_key)

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=500,
        )

        import json
        content = response.choices[0].message.content.strip()
        # Strip markdown code block if present
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        analysis = json.loads(content)
        analysis["generated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        _set_cached(_analysis_cache, "analysis", analysis)
        return analysis

    except Exception as e:
        logger.error(f"OpenAI analysis error: {e}")
        fallback = {
            "summary": "Market analysis is temporarily unavailable. Please check back later.",
            "trend": "neutral",
            "key_factors": ["Data temporarily unavailable"],
            "outlook": "Check back shortly for updated analysis.",
            "gold_insight": f"Gold is trading at Rs. {gold.get('per_tola', 'N/A')} per tola.",
            "silver_insight": f"Silver is trading at Rs. {silver.get('per_tola', 'N/A')} per tola.",
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        _set_cached(_analysis_cache, "analysis", fallback)
        return fallback
