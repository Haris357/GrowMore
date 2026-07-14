"""
Stock Insights — AI-generated market/social sentiment for a stock, grounded in
LIVE web search (OpenAI Responses API + web_search tool). The model finds real
sources itself (news, forums, analyst sites, X/Reddit where they exist) and we
return those real citations alongside the analysis. No third-party API keys
beyond OpenAI are required.
"""
import json
import logging
import re
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse
from uuid import UUID

from app.config.settings import settings
from app.db.supabase import get_supabase_service_client

logger = logging.getLogger(__name__)

INSIGHTS_TTL = 6 * 60 * 60  # 6 hours
_cache: Dict[str, Dict[str, Any]] = {}


def _get_cached(key: str) -> Optional[Dict[str, Any]]:
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < INSIGHTS_TTL:
        return entry["data"]
    return None


def _set_cached(key: str, data: Dict[str, Any]) -> None:
    _cache[key] = {"data": data, "ts": time.time()}


async def _basic_context(stock_id: UUID) -> Dict[str, Any]:
    db = get_supabase_service_client()
    res = (
        db.table("stocks")
        .select("current_price, change_percentage, companies!inner(symbol, name, sectors(name))")
        .eq("id", str(stock_id))
        .limit(1)
        .execute()
    )
    if not res.data:
        raise ValueError("Stock not found")
    row = res.data[0]
    company = row.get("companies") or {}
    sector = (company.get("sectors") or {}).get("name") if isinstance(company.get("sectors"), dict) else None
    return {
        "symbol": company.get("symbol"),
        "company_name": company.get("name"),
        "sector": sector or "Unknown",
        "current_price": row.get("current_price"),
        "change_percentage": row.get("change_percentage"),
    }


def _prompt(ctx: Dict[str, Any]) -> str:
    return (
        f"You are an equity research analyst covering the Pakistan Stock Exchange (PSX).\n"
        f"Research the stock {ctx['symbol']} ({ctx['company_name']}), sector: {ctx['sector']}.\n\n"
        f"Use web search to find the MOST RECENT (last few months) real information:\n"
        f"- News and corporate announcements (earnings, dividends, deals, management, regulatory)\n"
        f"- Analyst/brokerage views and price targets\n"
        f"- Investor & social sentiment wherever it exists (forums like brecorder/ksestocks, "
        f"X/Twitter FinTwit PK, Reddit r/PakistanStockExchange, StockTwits)\n\n"
        f"Then synthesize what the market and community are actually saying about this stock.\n"
        f"Base every point on what you actually found. If chatter is thin, say so honestly and set sentiment to QUIET.\n\n"
        f"Respond with ONLY a valid JSON object (no markdown code fences) in this exact shape.\n"
        f"CRITICAL: You MUST cite your real web sources inline like ([outlet](url)) after factual "
        f"claims inside the 'summary', 'bull_points' and 'bear_points' string values. Cite at least "
        f"3-5 different sources. This is mandatory.\n"
        "{\n"
        '  "sentiment": "BULLISH" | "MIXED" | "BEARISH" | "QUIET",\n'
        '  "score": <integer 0-100, overall bullishness>,\n'
        '  "headline": "<one punchy sentence summarizing the mood>",\n'
        '  "summary": "<2-4 sentences on what the market/community is saying right now>",\n'
        '  "bull_points": ["<concise bullish point>", ...],\n'
        '  "bear_points": ["<concise bearish/risk point>", ...],\n'
        '  "catalysts": ["<upcoming catalyst or event>", ...],\n'
        '  "risks": ["<key risk>", ...],\n'
        '  "what_to_watch": "<1-2 sentences on what to monitor next>"\n'
        "}\n"
        "Keep arrays to 2-5 items each. Do not invent handles, dates, or numbers you did not find."
    )


_CITATION_RE = re.compile(r"\s*\(\[[^\]]*\]\([^)]*\)\)")


def _clean(text: Any) -> str:
    """Strip inline ([outlet](url)) citation markup from display text."""
    if not isinstance(text, str):
        return text or ""
    return _CITATION_RE.sub("", text).strip()


def _clean_list(items: Any) -> List[str]:
    if not isinstance(items, list):
        return []
    return [_clean(x) for x in items if isinstance(x, str) and _clean(x)]


def _parse_json(text: str) -> Optional[Dict[str, Any]]:
    if not text:
        return None
    t = text.strip()
    t = re.sub(r"^```(?:json)?", "", t).strip()
    t = re.sub(r"```$", "", t).strip()
    start, end = t.find("{"), t.rfind("}")
    if start == -1 or end == -1:
        return None
    try:
        return json.loads(t[start : end + 1])
    except Exception:
        return None


def _extract_sources(response: Any) -> List[Dict[str, str]]:
    """Collect real URL citations from the web_search annotations."""
    sources: List[Dict[str, str]] = []
    seen = set()
    try:
        for item in response.output or []:
            if getattr(item, "type", None) != "message":
                continue
            for content in getattr(item, "content", None) or []:
                for ann in getattr(content, "annotations", None) or []:
                    if getattr(ann, "type", None) != "url_citation":
                        continue
                    url = getattr(ann, "url", "") or ""
                    if not url or url in seen:
                        continue
                    seen.add(url)
                    outlet = urlparse(url).netloc.replace("www.", "")
                    sources.append({
                        "title": (getattr(ann, "title", "") or outlet).strip(),
                        "url": url,
                        "outlet": outlet,
                    })
    except Exception as e:
        logger.debug(f"source extraction failed: {e}")
    return sources


def _fallback(ctx: Dict[str, Any], reason: str) -> Dict[str, Any]:
    return {
        **ctx,
        "sentiment": "QUIET",
        "score": 50,
        "headline": "AI insights are unavailable right now.",
        "summary": reason,
        "bull_points": [],
        "bear_points": [],
        "catalysts": [],
        "risks": [],
        "what_to_watch": "—",
        "sources": [],
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "model": None,
        "_fallback": True,
    }


async def get_stock_insights(stock_id: UUID, refresh: bool = False) -> Dict[str, Any]:
    cache_key = f"insights_{stock_id}"
    if not refresh:
        cached = _get_cached(cache_key)
        if cached:
            return cached

    try:
        ctx = await _basic_context(stock_id)
    except Exception as e:
        logger.error(f"insights: context failed for {stock_id}: {e}")
        return _fallback({"symbol": None, "company_name": None, "sector": None,
                          "current_price": None, "change_percentage": None},
                         "Could not load this stock.")

    if not settings.openai_api_key:
        return _fallback(ctx, "The AI service is not configured.")

    model = settings.openai_model or "gpt-4.1-mini"
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.responses.create(
            model=model,
            tools=[{"type": "web_search"}],
            input=_prompt(ctx),
        )
        parsed = _parse_json(response.output_text or "")
        if not parsed:
            return _fallback(ctx, "The AI could not produce a structured result.")

        result = {
            **ctx,
            "sentiment": str(parsed.get("sentiment", "MIXED")).upper(),
            "score": int(parsed.get("score", 50)) if str(parsed.get("score", "")).strip() else 50,
            "headline": _clean(parsed.get("headline", "")),
            "summary": _clean(parsed.get("summary", "")),
            "bull_points": _clean_list(parsed.get("bull_points")),
            "bear_points": _clean_list(parsed.get("bear_points")),
            "catalysts": _clean_list(parsed.get("catalysts")),
            "risks": _clean_list(parsed.get("risks")),
            "what_to_watch": _clean(parsed.get("what_to_watch", "")),
            "sources": _extract_sources(response),
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "model": model,
        }
        _set_cached(cache_key, result)
        return result
    except Exception as e:
        logger.error(f"insights: OpenAI web_search failed for {stock_id}: {e}")
        return _fallback(ctx, "The AI request failed. Please try again.")
