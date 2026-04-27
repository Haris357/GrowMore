"""
GrowNews Network — News Aggregator Service.

Fetches news from RSS feeds and free APIs, processes with AI,
and saves to database. No scrapers — pure API/feed consumption.
"""

import asyncio
import hashlib
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import feedparser
import httpx

from app.config.settings import settings
from app.db.supabase import get_supabase_service_client

logger = logging.getLogger(__name__)

# ── RSS Feed Sources ──
RSS_FEEDS = [
    # Pakistan Financial
    {"name": "Business Recorder", "url": "https://www.brecorder.com/feeds/latest-news", "category": "stocks"},
    {"name": "Dawn Business", "url": "https://www.dawn.com/feeds/business", "category": "economy"},
    {"name": "The News Business", "url": "https://www.thenews.com.pk/rss/1/1", "category": "economy"},
    {"name": "Tribune Business", "url": "https://tribune.com.pk/feed/business", "category": "economy"},
    # International Finance
    {"name": "Reuters Business", "url": "https://feeds.reuters.com/reuters/businessNews", "category": "global"},
    {"name": "CNBC Top News", "url": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", "category": "global"},
    {"name": "Bloomberg Markets", "url": "https://feeds.bloomberg.com/markets/news.rss", "category": "global"},
    # Commodities / Gold / Silver
    {"name": "Kitco Gold News", "url": "https://www.kitco.com/feed/rss/news/gold.xml", "category": "commodities"},
    {"name": "Mining.com", "url": "https://www.mining.com/feed/", "category": "commodities"},
    # Crypto
    {"name": "CoinDesk", "url": "https://www.coindesk.com/arc/outboundfeeds/rss/", "category": "crypto"},
    {"name": "CoinTelegraph", "url": "https://cointelegraph.com/rss", "category": "crypto"},
    {"name": "Decrypt", "url": "https://decrypt.co/feed", "category": "crypto"},
]

# Cache for AI analysis
_brief_cache: Dict[str, Any] = {}
BRIEF_CACHE_TTL = 1800  # 30 minutes


def _get_cached(key: str) -> Optional[Any]:
    entry = _brief_cache.get(key)
    if entry and (time.time() - entry["ts"]) < BRIEF_CACHE_TTL:
        return entry["data"]
    return None


def _set_cached(key: str, data: Any):
    _brief_cache[key] = {"data": data, "ts": time.time()}


def _generate_url_hash(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()[:12]


async def fetch_rss_feed(feed_config: Dict[str, str]) -> List[Dict[str, Any]]:
    """Fetch and parse a single RSS feed."""
    articles = []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                feed_config["url"],
                headers={"User-Agent": "GrowNews/1.0"},
                follow_redirects=True,
            )
            resp.raise_for_status()

        parsed = feedparser.parse(resp.text)

        for entry in parsed.entries[:15]:
            published = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                try:
                    published = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()
                except Exception:
                    pass

            summary = ""
            if hasattr(entry, "summary"):
                import re
                summary = re.sub(r"<[^>]+>", "", entry.summary or "")[:500]

            image_url = None
            if hasattr(entry, "media_content") and entry.media_content:
                image_url = entry.media_content[0].get("url")
            elif hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
                image_url = entry.media_thumbnail[0].get("url")
            elif hasattr(entry, "enclosures") and entry.enclosures:
                for enc in entry.enclosures:
                    if enc.get("type", "").startswith("image"):
                        image_url = enc.get("href")
                        break

            articles.append({
                "title": entry.get("title", "").strip(),
                "summary": summary.strip(),
                "url": entry.get("link", ""),
                "image_url": image_url,
                "author": entry.get("author", feed_config["name"]),
                "published_at": published,
                "source_name": feed_config["name"],
                "feed_category": feed_config["category"],
            })

    except Exception as e:
        logger.warning(f"Failed to fetch RSS feed {feed_config['name']}: {e}")

    return articles


async def fetch_all_feeds() -> List[Dict[str, Any]]:
    """Fetch articles from all RSS feeds concurrently."""
    tasks = [fetch_rss_feed(feed) for feed in RSS_FEEDS]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_articles = []
    for result in results:
        if isinstance(result, list):
            all_articles.extend(result)

    return all_articles


async def _get_or_create_source(db, source_name: str, feed_url: str) -> Optional[str]:
    """Get existing source ID or create new one."""
    try:
        result = db.table("news_sources").select("id").eq("name", source_name).execute()
        if result.data:
            return result.data[0]["id"]

        insert = db.table("news_sources").insert({
            "name": source_name,
            "base_url": feed_url.split("/")[0] + "//" + feed_url.split("/")[2] if "/" in feed_url else feed_url,
            "source_type": "rss",
            "reliability_score": 0.7,
            "is_active": True,
            "scrape_config": {},
        }).execute()
        return insert.data[0]["id"] if insert.data else None
    except Exception as e:
        logger.error(f"Source lookup/create error for {source_name}: {e}")
        return None


def _map_feed_category(feed_category: str) -> List[str]:
    """Map feed category to article categories."""
    mapping = {
        "stocks": ["stocks"],
        "economy": ["economy"],
        "global": ["global", "economy"],
        "commodities": ["commodities", "gold", "silver"],
        "crypto": ["crypto"],
    }
    return mapping.get(feed_category, ["general"])


async def aggregate_and_save(categories: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Fetch news from all feeds, deduplicate, and save to database.
    Optionally filter by categories.

    Returns summary of what was saved.
    """
    db = get_supabase_service_client()
    all_articles = await fetch_all_feeds()

    if categories:
        all_articles = [a for a in all_articles if a.get("feed_category") in categories]

    # Source ID cache
    source_cache: Dict[str, str] = {}
    saved = 0
    skipped = 0

    for article in all_articles:
        if not article.get("url") or not article.get("title"):
            continue

        # Deduplicate by URL
        try:
            existing = db.table("news_articles").select("id").eq("url", article["url"]).execute()
            if existing.data:
                skipped += 1
                continue
        except Exception:
            pass

        # Get source ID
        source_name = article["source_name"]
        if source_name not in source_cache:
            feed = next((f for f in RSS_FEEDS if f["name"] == source_name), None)
            feed_url = feed["url"] if feed else ""
            source_id = await _get_or_create_source(db, source_name, feed_url)
            if source_id:
                source_cache[source_name] = source_id
        source_id = source_cache.get(source_name)
        if not source_id:
            continue

        # Build slug
        import re
        slug = re.sub(r"[^a-z0-9]+", "-", article["title"].lower())[:100].strip("-")
        slug = f"{slug}-{_generate_url_hash(article['url'])}"

        try:
            db.table("news_articles").insert({
                "source_id": source_id,
                "title": article["title"][:500],
                "slug": slug,
                "summary": article.get("summary", "")[:1000] or None,
                "url": article["url"],
                "image_url": article.get("image_url"),
                "author": article.get("author", "")[:100] or None,
                "published_at": article.get("published_at"),
                "categories": _map_feed_category(article.get("feed_category", "general")),
                "tags": [],
                "is_processed": False,
            }).execute()
            saved += 1
        except Exception as e:
            if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                skipped += 1
            else:
                logger.error(f"Failed to save article: {e}")

    return {
        "total_fetched": len(all_articles),
        "saved": saved,
        "skipped_duplicates": skipped,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def process_unprocessed_articles(limit: int = 20) -> Dict[str, Any]:
    """
    Process unprocessed articles with AI — sentiment, summary, impact.
    Uses Groq for fast analysis.
    """
    db = get_supabase_service_client()

    result = db.table("news_articles").select("id,title,summary,content,categories").eq(
        "is_processed", False
    ).order("created_at", desc=True).limit(limit).execute()

    articles = result.data or []
    if not articles:
        return {"processed": 0, "message": "No unprocessed articles"}

    processed = 0
    for article in articles:
        try:
            analysis = await _analyze_with_ai(article)
            if analysis:
                db.table("news_articles").update({
                    "sentiment_label": analysis.get("sentiment", "neutral"),
                    "sentiment_score": analysis.get("sentiment_score", 0),
                    "impact_score": analysis.get("impact_score", 5),
                    "summary": analysis.get("summary") or article.get("summary"),
                    "tags": analysis.get("tags", []),
                    "is_processed": True,
                }).eq("id", article["id"]).execute()
                processed += 1
        except Exception as e:
            logger.error(f"Failed to process article {article['id']}: {e}")

    return {"processed": processed, "total": len(articles)}


async def _analyze_with_ai(article: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Analyze a single article with AI for sentiment, summary, and impact."""
    from app.ai.openai_client import get_openai_client

    title = article.get("title", "")
    summary = article.get("summary", "") or article.get("content", "")
    categories = article.get("categories", [])

    prompt = f"""Analyze this financial news article and provide structured analysis.

Title: {title}
Summary: {summary[:800]}
Categories: {', '.join(categories)}

Return ONLY valid JSON:
{{
    "sentiment": "positive" or "negative" or "neutral",
    "sentiment_score": <float -1 to 1>,
    "impact_score": <float 0 to 10, how much this impacts markets>,
    "summary": "<concise 2-sentence summary if original is weak, else null>",
    "tags": ["tag1", "tag2", "tag3"],
    "affected_markets": ["stocks", "gold", "silver", "crypto", "oil", "currency"]
}}"""

    try:
        client = get_openai_client()
        response = await client.generate(prompt=prompt, max_tokens=300, temperature=0.2)

        import json
        import re
        json_match = re.search(r"\{[\s\S]*\}", response)
        if json_match:
            return json.loads(json_match.group())
    except Exception as e:
        logger.error(f"AI analysis failed: {e}")

    return {"sentiment": "neutral", "sentiment_score": 0, "impact_score": 5, "tags": []}


async def generate_market_brief(category: Optional[str] = None) -> Dict[str, Any]:
    """
    Generate an AI-powered market brief from recent news.
    Covers stocks, gold/silver, crypto, global economy.
    """
    cache_key = f"brief_{category or 'all'}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    db = get_supabase_service_client()

    # Get recent processed articles
    query = db.table("news_articles").select(
        "title,summary,sentiment_label,impact_score,categories,published_at"
    ).eq("is_processed", True).order("published_at", desc=True).limit(30)

    if category and category != "all":
        query = query.contains("categories", [category])

    result = query.execute()
    articles = result.data or []

    if not articles:
        fallback = {
            "headline": "Markets Update",
            "summary": "Stay tuned for the latest market analysis. News is being aggregated and analyzed.",
            "mood": "neutral",
            "sections": [],
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
        return fallback

    # Build context for AI
    news_context = "\n".join([
        f"- [{a.get('sentiment_label', 'neutral')}] {a['title']} (impact: {a.get('impact_score', 5)})"
        for a in articles[:20]
    ])

    prompt = f"""You are GrowNews Network's AI analyst. Based on the latest financial news, generate a comprehensive market brief.

Recent News Headlines:
{news_context}

Generate a JSON market brief covering ALL relevant areas. Return ONLY valid JSON:
{{
    "headline": "One-line market headline",
    "summary": "2-3 sentence overall market summary",
    "mood": "bullish" or "bearish" or "neutral" or "mixed",
    "mood_score": <int 0-100, 0=very bearish, 100=very bullish>,
    "sections": [
        {{
            "category": "stocks",
            "title": "Stock Market Update",
            "insight": "2-3 sentences about stock market impact",
            "sentiment": "positive" or "negative" or "neutral",
            "key_events": ["event1", "event2"]
        }},
        {{
            "category": "commodities",
            "title": "Gold & Silver",
            "insight": "2-3 sentences about precious metals impact",
            "sentiment": "positive" or "negative" or "neutral",
            "key_events": ["event1", "event2"]
        }},
        {{
            "category": "crypto",
            "title": "Crypto Markets",
            "insight": "2-3 sentences about crypto impact",
            "sentiment": "positive" or "negative" or "neutral",
            "key_events": ["event1", "event2"]
        }},
        {{
            "category": "global",
            "title": "Global Economy",
            "insight": "2-3 sentences about global economic impact",
            "sentiment": "positive" or "negative" or "neutral",
            "key_events": ["event1", "event2"]
        }}
    ],
    "risks": ["risk1", "risk2"],
    "opportunities": ["opportunity1", "opportunity2"]
}}"""

    try:
        from app.ai.openai_client import get_openai_client
        client = get_openai_client()
        content = await client.generate(prompt=prompt, max_tokens=1000, temperature=0.5)

        import json
        import re
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        json_match = re.search(r"\{[\s\S]*\}", content)
        if json_match:
            brief = json.loads(json_match.group())
            brief["generated_at"] = datetime.now(timezone.utc).isoformat()
            _set_cached(cache_key, brief)
            return brief

    except Exception as e:
        logger.error(f"Market brief generation failed: {e}")

    fallback = {
        "headline": "Markets in Focus",
        "summary": "Markets are showing mixed signals. Monitor key developments across stocks, commodities, and crypto.",
        "mood": "neutral",
        "mood_score": 50,
        "sections": [],
        "risks": ["Market volatility"],
        "opportunities": ["Diversification opportunities"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    _set_cached(cache_key, fallback)
    return fallback
