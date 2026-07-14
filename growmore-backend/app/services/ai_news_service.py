"""
AI-driven market news — replaces the RSS/scraper pipeline entirely.

OpenAI Responses API + web_search finds the most relevant, current market news
for Pakistani investors (PSX, global markets, geopolitics/war impact, commodities,
crypto, economy), summarizes each with sentiment, and returns REAL source links.
Each item is enriched with the source's og:image so the feed has real thumbnails.
No third-party news API keys required — only OpenAI.
"""
import asyncio
import json
import logging
import re
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from app.config.settings import settings
from app.db.supabase import get_supabase_service_client

logger = logging.getLogger(__name__)

NEWS_TTL = 30 * 60  # 30 minutes
_cache: Dict[str, Dict[str, Any]] = {}

_CITATION_RE = re.compile(r"\s*\(\[[^\]]*\]\([^)]*\)\)")
_IMG_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
}


def _clean(t: Any) -> str:
    return _CITATION_RE.sub("", t).strip() if isinstance(t, str) else ""


def _parse_json(text: str) -> Optional[Dict[str, Any]]:
    if not text:
        return None
    t = re.sub(r"```(?:json)?", "", text).strip()
    start, end = t.find("{"), t.rfind("}")
    if start == -1 or end == -1:
        return None
    try:
        return json.loads(t[start : end + 1])
    except Exception:
        return None


def _prompt(category: str, count: int) -> str:
    scope = {
        "all": "PSX and Pakistan markets, global markets, the CURRENT geopolitical & war/conflict situation "
               "(Pakistan, US/America relations, Middle East, ceasefires, sanctions, tensions) and how it moves "
               "markets and oil, commodities (oil, gold, silver), crypto, and the economy. Include SEVERAL "
               "geopolitics items on the latest war/ceasefire developments",
        "markets": "the Pakistan Stock Exchange (PSX), KSE-100, and Pakistani listed companies",
        "global": "global stock markets, the US Fed, major indices, and world economy",
        "geopolitics": "geopolitics, wars/conflicts, sanctions and their impact on markets and oil",
        "commodities": "gold, silver, crude oil and other commodities",
        "crypto": "Bitcoin, Ethereum and the crypto market",
        "economy": "Pakistan's economy, SBP, inflation, rupee, IMF and policy",
    }.get(category, "markets and the economy")

    return (
        f"You are the editor of a market news desk for Pakistani investors.\n"
        f"Use web search to find the {count} MOST IMPORTANT and RECENT (last few days) news items about {scope}.\n"
        f"Prioritize market-moving developments. Include how global/geopolitical events affect Pakistan's market where relevant.\n\n"
        f"Respond with ONLY a valid JSON object (no code fences):\n"
        "{\n"
        '  "brief": {\n'
        '    "mood": "bullish" | "bearish" | "mixed",\n'
        '    "headline": "<one-line market mood headline>",\n'
        '    "summary": "<2-3 sentences on the overall market picture right now>",\n'
        '    "key_points": ["<key point>", ...],\n'
        '    "impact_on_pakistan": "<1-2 sentences on what this means for PSX / Pakistani investors>"\n'
        "  },\n"
        '  "items": [\n'
        '    {\n'
        '      "category": "markets" | "global" | "geopolitics" | "commodities" | "crypto" | "economy",\n'
        '      "headline": "<news headline>",\n'
        '      "summary": "<1-2 sentence teaser of the story>",\n'
        '      "content": "<a full 3-5 paragraph article write-up: what happened, the key numbers/facts, the context, and why it matters for investors. Use \\n\\n between paragraphs>",\n'
        '      "sentiment": "bullish" | "bearish" | "neutral",\n'
        '      "source_url": "<the real article URL you found>",\n'
        '      "source_name": "<publication name>",\n'
        '      "published": "<relative time e.g. \'2 hours ago\' or a date>"\n'
        "    }\n"
        "  ]\n"
        "}\n"
        f"Return {max(count, 14)}-18 items — be comprehensive, cover many DIFFERENT stories.\n"
        f"Assign each item the MOST specific category:\n"
        f"- war / conflict / ceasefire / sanctions / US-Pakistan or US-Iran / Middle East tensions → 'geopolitics'\n"
        f"- oil, gold, silver, other commodities → 'commodities'\n"
        f"- Bitcoin, Ethereum, crypto → 'crypto'\n"
        f"- SBP, rupee, inflation, IMF, budget, Pakistan economy → 'economy'\n"
        f"- PSX, KSE-100, specific Pakistani listed companies → 'markets'\n"
        f"- US Fed, S&P/Dow/Nasdaq, world indices → 'global'\n"
        f"Include AT LEAST 3 'geopolitics' items on the current war/ceasefire situation. Diversify categories.\n"
        f"Every source_url MUST be a real URL from your web search. The 'content' field must be a substantial, "
        f"well-written multi-paragraph article (not a one-liner). "
        f"Cite sources inline like ([outlet](url)) inside the 'summary' and 'content' fields — this is mandatory."
    )


async def _og_image(client: httpx.AsyncClient, url: str) -> Optional[str]:
    if not url or not url.startswith("http"):
        return None
    try:
        r = await client.get(url, headers=_IMG_HEADERS, timeout=8.0, follow_redirects=True)
        soup = BeautifulSoup(r.text, "html.parser")
        for sel in ['meta[property="og:image"]', 'meta[name="twitter:image"]', 'meta[name="twitter:image:src"]']:
            tag = soup.select_one(sel)
            if tag and tag.get("content"):
                img = tag["content"]
                return img if img.startswith("http") else None
    except Exception:
        return None
    return None


def _empty(category: str) -> Dict[str, Any]:
    return {
        "brief": {"mood": "mixed", "headline": "No news yet", "summary": "Hit Refresh to generate the latest AI market news.", "key_points": [], "impact_on_pakistan": ""},
        "items": [],
        "generated_at": None,
        "category": category,
    }


async def _generate(category: str, count: int) -> Optional[Dict[str, Any]]:
    """Run the live AI web-search generation (costs tokens)."""
    if not settings.openai_api_key:
        return None
    model = settings.openai_model or "gpt-4.1-mini"
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.responses.create(
            model=model, tools=[{"type": "web_search"}], input=_prompt(category, count),
            max_output_tokens=16000,
        )
        parsed = _parse_json(response.output_text or "")
        if not parsed:
            logger.error(f"AI news: JSON parse failed (len={len(response.output_text or '')})")
            return None

        brief_raw = parsed.get("brief") or {}
        brief = {
            "mood": str(brief_raw.get("mood", "mixed")).lower(),
            "headline": _clean(brief_raw.get("headline", "")),
            "summary": _clean(brief_raw.get("summary", "")),
            "key_points": [_clean(x) for x in (brief_raw.get("key_points") or []) if isinstance(x, str) and _clean(x)],
            "impact_on_pakistan": _clean(brief_raw.get("impact_on_pakistan", "")),
        }
        items: List[Dict[str, Any]] = []
        for it in parsed.get("items") or []:
            url = (it.get("source_url") or "").strip()
            content = it.get("content", "")
            content = _CITATION_RE.sub("", content).strip() if isinstance(content, str) else ""
            items.append({
                "category": str(it.get("category", "markets")).lower(),
                "headline": _clean(it.get("headline", "")),
                "summary": _clean(it.get("summary", "")),
                "content": content,
                "sentiment": str(it.get("sentiment", "neutral")).lower(),
                "source_url": url,
                "source_name": (it.get("source_name") or (urlparse(url).netloc.replace("www.", "") if url else "")),
                "published": _clean(it.get("published", "")),
                "image_url": None,
            })
        async with httpx.AsyncClient(verify=False) as hc:
            imgs = await asyncio.gather(*[_og_image(hc, it["source_url"]) for it in items], return_exceptions=True)
        for it, img in zip(items, imgs):
            it["image_url"] = img if isinstance(img, str) else None

        return {
            "brief": brief,
            "items": items,
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "category": category,
            "model": model,
        }
    except Exception as e:
        logger.error(f"AI news generation failed ({category}): {e}")
        return None


# ── DB persistence (reuses news_articles + a 'GrowNews AI' source) ────────────

_AI_SOURCE_NAME = "GrowNews AI"


def _ai_source_id(db) -> Optional[str]:
    try:
        res = db.table("news_sources").select("id").eq("name", _AI_SOURCE_NAME).limit(1).execute()
        if res.data:
            return res.data[0]["id"]
        created = db.table("news_sources").insert({
            "name": _AI_SOURCE_NAME, "base_url": "https://openai.com",
            "source_type": "ai", "is_active": True,
        }).execute()
        return created.data[0]["id"] if created.data else None
    except Exception as e:
        logger.error(f"AI news source lookup failed: {e}")
        return None


def _market_id(db) -> Optional[str]:
    try:
        m = db.table("markets").select("id").limit(1).execute()
        return m.data[0]["id"] if m.data else None
    except Exception:
        return None


def _save_to_db(db, data: Dict[str, Any]) -> None:
    src = _ai_source_id(db)
    if not src:
        return
    market = _market_id(db)
    # Brief lives in the source's scrape_config
    db.table("news_sources").update({
        "scrape_config": {"brief": data["brief"], "generated_at": data["generated_at"], "model": data.get("model")}
    }).eq("id", src).execute()
    # Replace the AI articles
    db.table("news_articles").delete().eq("source_id", src).execute()
    rows = []
    ts = data["generated_at"]
    for i, it in enumerate(data["items"]):
        rows.append({
            "source_id": src,
            "market_id": market,
            "title": it["headline"] or "Untitled",
            "summary": it["summary"],
            "content": it.get("content", ""),
            "url": it["source_url"] or f"https://growmore/ai-news/{i}",
            "image_url": it["image_url"],
            "categories": [it["category"]],
            "tags": [it.get("published", "")] if it.get("published") else [],
            "sentiment_label": it["sentiment"],
            "author": it["source_name"],
            "published_at": ts,
            "is_processed": True,
            "slug": f"ai-news-{i}-{int(time.time())}",
        })
    if rows:
        db.table("news_articles").insert(rows).execute()


def _load_from_db(db) -> Optional[Dict[str, Any]]:
    try:
        src_res = db.table("news_sources").select("id, scrape_config").eq("name", _AI_SOURCE_NAME).limit(1).execute()
        if not src_res.data:
            return None
        src = src_res.data[0]
        cfg = src.get("scrape_config") or {}
        arts = (
            db.table("news_articles").select("*").eq("source_id", src["id"])
            .order("published_at", desc=True).limit(30).execute().data or []
        )
        if not arts:
            return None
        items = [{
            "category": (a.get("categories") or ["markets"])[0] if a.get("categories") else "markets",
            "headline": a.get("title") or "",
            "summary": a.get("summary") or "",
            "content": a.get("content") or "",
            "sentiment": a.get("sentiment_label") or "neutral",
            "source_url": a.get("url") or "",
            "source_name": a.get("author") or "",
            "published": (a.get("tags") or [""])[0] if a.get("tags") else "",
            "image_url": a.get("image_url"),
        } for a in arts]
        return {
            "brief": cfg.get("brief") or _empty("all")["brief"],
            "items": items,
            "generated_at": cfg.get("generated_at"),
            "model": cfg.get("model"),
            "category": "all",
        }
    except Exception as e:
        logger.error(f"AI news load from DB failed: {e}")
        return None


async def get_ai_news(category: str = "all", count: int = 12, refresh: bool = False) -> Dict[str, Any]:
    """
    DB-first: page loads read the last saved feed (no token cost). Only an explicit
    refresh (or an empty DB) triggers a fresh, paid AI web-search generation.
    """
    db = get_supabase_service_client()

    if not refresh:
        saved = _load_from_db(db)
        if saved and saved.get("items"):
            return saved

    generated = await _generate(category, count)
    if not generated:
        return _load_from_db(db) or _empty(category)

    try:
        _save_to_db(db, generated)
    except Exception as e:
        logger.error(f"AI news save failed: {e}")
    return generated
