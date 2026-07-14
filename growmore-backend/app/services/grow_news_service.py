"""
GrowNews Service — AI-powered financial news for GrowMore.

Sources:
  - NewsAPI.org  (real articles with images)
  - CryptoPanic  (crypto-specific news)

AI (OpenAI gpt-4.1-mini): generates market briefs, article summaries, sentiment analysis.
"""
import asyncio
import json
import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import httpx

from app.config.settings import settings
from app.db.supabase import get_supabase_service_client

logger = logging.getLogger(__name__)

NEWSAPI_BASE = "https://newsapi.org/v2"
CRYPTOPANIC_BASE = "https://cryptopanic.com/api/v1"

# Cache TTLs (seconds)
_FEED_TTL = 600       # 10 min — article list
_BRIEF_TTL = 1800     # 30 min — AI market brief
_SENTIMENT_TTL = 600  # 10 min — sentiment

_cache: Dict[str, Any] = {}

# Targeted queries — quoted phrases + OR operators give NewsAPI much better
# relevance than loose keyword soups. `keywords` is used as a fallback filter
# when we supplement a sparse category from the "all" pool.
CATEGORIES = {
    "pakistan": {
        "q": '("KSE-100" OR "Pakistan Stock Exchange" OR PSX OR "Pakistan rupee" OR "State Bank of Pakistan" OR "Pakistan IMF" OR "Pakistan economy" OR "Pakistan inflation")',
        "label": "Pakistan Markets",
        "keywords": ["pakistan", "psx", "kse", "rupee", "karachi", "islamabad", "imf"],
    },
    "stocks": {
        "q": '("stock market" OR "S&P 500" OR "Dow Jones" OR Nasdaq OR "Wall Street" OR equities OR "Federal Reserve" OR "earnings report" OR "stocks rally" OR "stocks plunge" OR "rate cut" OR "rate hike")',
        "label": "Stocks & Markets",
        "keywords": ["stock", "shares", "equities", "wall street", "nasdaq", "dow", "s&p", "fed", "rate", "earnings"],
    },
    "crypto": {
        "q": '(Bitcoin OR Ethereum OR "BTC price" OR "ETH price" OR "crypto market" OR "Bitcoin ETF" OR Solana OR XRP OR "crypto regulation" OR cryptocurrency)',
        "label": "Crypto",
        "keywords": ["bitcoin", "btc", "ethereum", "eth", "crypto", "blockchain", "altcoin", "solana", "xrp"],
    },
    "commodities": {
        "q": '("gold price" OR "silver price" OR "crude oil" OR "oil prices" OR OPEC OR "Brent crude" OR "WTI crude" OR "gold rally" OR "Middle East oil" OR "natural gas prices" OR "commodity prices")',
        "label": "Commodities & Energy",
        "keywords": ["gold", "silver", "oil", "opec", "commodity", "metals", "crude", "brent", "wti", "gas"],
    },
    "global": {
        "q": '("Federal Reserve" OR "interest rate" OR inflation OR recession OR tariffs OR "trade war" OR "Ukraine war" OR "Middle East tensions" OR Israel OR Iran OR geopolitical OR "China economy")',
        "label": "Global Markets",
        "keywords": ["fed", "inflation", "recession", "war", "tariff", "ukraine", "israel", "iran", "china", "europe", "geopolitic"],
    },
}


def _cached(key: str, ttl: int) -> Optional[Any]:
    e = _cache.get(key)
    if e and (time.time() - e["ts"]) < ttl:
        return e["data"]
    return None


def _set(key: str, data: Any):
    _cache[key] = {"data": data, "ts": time.time()}


class GrowNewsService:
    def __init__(self):
        self.db = get_supabase_service_client()

    # ─── NewsAPI ───────────────────────────────────────────────────────────────

    async def _newsapi_get(self, endpoint: str, params: dict) -> Optional[dict]:
        if not settings.newsapi_key:
            return None
        params["apiKey"] = settings.newsapi_key
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                resp = await client.get(f"{NEWSAPI_BASE}{endpoint}", params=params)
                resp.raise_for_status()
                return resp.json()
            except Exception as e:
                logger.error(f"NewsAPI {endpoint}: {e}")
                return None

    async def _fetch_category(self, category: str) -> List[dict]:
        cfg = CATEGORIES.get(category, CATEGORIES["global"])
        data = await self._newsapi_get("/everything", {
            "q": cfg["q"],
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": 30,
            "from": (datetime.now(timezone.utc) - timedelta(days=3)).strftime("%Y-%m-%d"),
        })
        articles = []
        for a in (data or {}).get("articles", []):
            if not a.get("title") or a["title"] == "[Removed]":
                continue
            articles.append({
                "title": a.get("title", ""),
                "description": a.get("description", ""),
                "url": a.get("url"),
                "image_url": a.get("urlToImage"),
                "source_name": (a.get("source") or {}).get("name", "Unknown"),
                "published_at": a.get("publishedAt"),
                "category": category,
                "content_snippet": (a.get("content") or "")[:500],
            })
        return articles

    async def _fetch_crypto_news(self, filter_: str = "hot") -> List[dict]:
        if not settings.cryptopanic_api_key:
            return []
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                resp = await client.get(f"{CRYPTOPANIC_BASE}/posts/", params={
                    "auth_token": settings.cryptopanic_api_key,
                    "public": "true",
                    "filter": filter_,
                })
                resp.raise_for_status()
                results = resp.json().get("results", [])
                articles = []
                for a in results[:20]:
                    votes = a.get("votes") or {}
                    pos = int(votes.get("positive") or 0)
                    neg = int(votes.get("negative") or 0)
                    articles.append({
                        "title": a.get("title", ""),
                        "description": "",
                        "url": a.get("url"),
                        "image_url": None,
                        "source_name": (a.get("source") or {}).get("title", "CryptoPanic"),
                        "published_at": a.get("published_at"),
                        "category": "crypto",
                        "sentiment": "positive" if pos > neg else ("negative" if neg > pos else "neutral"),
                        "votes_positive": pos,
                        "votes_negative": neg,
                        "currencies": [c.get("code") for c in (a.get("currencies") or []) if c.get("code")],
                    })
                return articles
            except Exception as e:
                logger.error(f"CryptoPanic error: {e}")
                return []

    # ─── AI ────────────────────────────────────────────────────────────────────

    async def _ai_complete(self, prompt: str, max_tokens: int = 500) -> Optional[str]:
        if not settings.openai_api_key:
            return None
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.openai_api_key)
            resp = client.chat.completions.create(
                model=settings.openai_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=0.4,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI news AI error: {e}")
            return None

    async def _ai_article_sentiment(self, title: str, description: str) -> dict:
        if not title:
            return {"sentiment": "neutral", "impact": "low", "summary": ""}
        prompt = f"""Analyze this financial news headline briefly. Respond in JSON only.

Title: {title}
Description: {description[:200] if description else ""}

JSON format:
{{"sentiment": "positive|negative|neutral", "impact": "high|medium|low", "summary": "one sentence summary for investors"}}"""

        raw = await self._ai_complete(prompt, max_tokens=120)
        if not raw:
            return {"sentiment": "neutral", "impact": "low", "summary": title}
        try:
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            return json.loads(raw)
        except Exception:
            return {"sentiment": "neutral", "impact": "low", "summary": title}

    async def _ai_market_brief(self, articles: List[dict], category: str) -> dict:
        if not articles:
            return {"brief": "No recent news available.", "sentiment": "neutral", "key_points": []}

        headlines = "\n".join(f"- {a['title']}" for a in articles[:12])
        label = CATEGORIES.get(category, {}).get("label", category.title())

        prompt = f"""You are a financial analyst for Pakistani investors. Analyze these {label} news headlines and provide a market brief.

Headlines:
{headlines}

Respond in JSON only:
{{
  "brief": "2-3 sentence market summary for Pakistani investors",
  "sentiment": "bullish|bearish|neutral",
  "key_points": ["point 1", "point 2", "point 3"],
  "impact_on_pakistan": "1 sentence on Pakistan market relevance"
}}"""

        raw = await self._ai_complete(prompt, max_tokens=300)
        if not raw:
            return {"brief": f"Latest {label} news is being analyzed.", "sentiment": "neutral", "key_points": [], "impact_on_pakistan": ""}
        try:
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            return json.loads(raw)
        except Exception:
            return {"brief": f"Latest {label} news is being analyzed.", "sentiment": "neutral", "key_points": [], "impact_on_pakistan": ""}

    # ─── Public API ────────────────────────────────────────────────────────────

    async def get_feed(self, category: str = "all", page: int = 1, per_page: int = 20) -> dict:
        """Get news feed for a category, with AI sentiment per article."""
        cache_key = f"feed_{category}_{page}"
        cached = _cached(cache_key, _FEED_TTL)
        if cached:
            return cached

        if category == "all":
            tasks = [self._fetch_category(c) for c in CATEGORIES]
            if settings.cryptopanic_api_key:
                tasks.append(self._fetch_crypto_news())
            results = await asyncio.gather(*tasks, return_exceptions=True)
            articles = []
            for r in results:
                if isinstance(r, list):
                    articles.extend(r)
            # Sort by published date
            articles.sort(key=lambda a: a.get("published_at") or "", reverse=True)
        elif category == "crypto" and settings.cryptopanic_api_key:
            crypto_articles = await self._fetch_crypto_news()
            newsapi_articles = await self._fetch_category("crypto")
            articles = crypto_articles + newsapi_articles
        else:
            articles = await self._fetch_category(category)

        # Deduplicate by URL
        seen = set()
        unique = []
        for a in articles:
            if a.get("url") and a["url"] not in seen:
                seen.add(a["url"])
                unique.append(a)

        # Fallback: when a specific category came back sparse (NewsAPI rate
        # limited, narrow query, or upstream outage), supplement from the
        # broader "all" pool by matching category keywords on title/desc.
        if category != "all" and len(unique) < 8:
            all_cached = _cached("feed_all_1", _FEED_TTL)
            if all_cached and all_cached.get("articles"):
                cat_keywords = CATEGORIES.get(category, {}).get("keywords", [])
                for a in all_cached["articles"]:
                    if not a.get("url") or a["url"] in seen:
                        continue
                    haystack = ((a.get("title") or "") + " " + (a.get("description") or "")).lower()
                    if any(kw in haystack for kw in cat_keywords):
                        unique.append({**a, "category": category})
                        seen.add(a["url"])
                        if len(unique) >= 20:
                            break

        # AI sentiment on first page (top 10 articles to stay within rate limits)
        if page == 1:
            top = unique[:10]
            sentiment_tasks = [
                self._ai_article_sentiment(a.get("title", ""), a.get("description", ""))
                for a in top
            ]
            sentiments = await asyncio.gather(*sentiment_tasks, return_exceptions=True)
            for i, s in enumerate(sentiments):
                if isinstance(s, dict):
                    unique[i].update(s)

        # Paginate
        offset = (page - 1) * per_page
        page_articles = unique[offset:offset + per_page]
        total = len(unique)

        # Save to DB in background
        asyncio.create_task(self._save_articles(unique[:50]))

        result = {
            "articles": page_articles,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": max(1, -(-total // per_page)),
            "category": category,
        }
        _set(cache_key, result)
        return result

    async def get_brief(self, category: str = "all") -> dict:
        """Get AI-generated market brief for a category."""
        cache_key = f"brief_{category}"
        cached = _cached(cache_key, _BRIEF_TTL)
        if cached:
            return cached

        feed = await self.get_feed(category=category, page=1, per_page=15)
        articles = feed.get("articles", [])
        brief = await self._ai_market_brief(articles, category)
        brief["category"] = category
        brief["generated_at"] = datetime.now(timezone.utc).isoformat()
        brief["article_count"] = len(articles)

        _set(cache_key, brief)
        return brief

    async def get_featured(self) -> dict:
        """Get featured/hero articles — highest impact from all categories."""
        cached = _cached("featured", _FEED_TTL)
        if cached:
            return cached

        feed = await self.get_feed(category="all", page=1, per_page=50)
        articles = feed.get("articles", [])

        # Prefer articles with images and high impact
        with_image = [a for a in articles if a.get("image_url")]
        without_image = [a for a in articles if not a.get("image_url")]

        hero = with_image[0] if with_image else (articles[0] if articles else None)
        featured = with_image[1:5] + without_image[:max(0, 4 - len(with_image[1:5]))]

        result = {"hero": hero, "featured": featured[:4], "latest": articles[:12]}
        _set("featured", result)
        return result

    async def get_trending(self) -> dict:
        """Get trending topics across all categories."""
        cached = _cached("trending_news", _FEED_TTL)
        if cached:
            return cached

        data = await self._newsapi_get("/top-headlines", {
            "category": "business",
            "language": "en",
            "pageSize": 10,
        })
        articles = []
        for a in (data or {}).get("articles", []):
            if not a.get("title") or a["title"] == "[Removed]":
                continue
            articles.append({
                "title": a.get("title"),
                "url": a.get("url"),
                "image_url": a.get("urlToImage"),
                "source_name": (a.get("source") or {}).get("name", ""),
                "published_at": a.get("publishedAt"),
                "category": "global",
            })

        result = {"articles": articles}
        _set("trending_news", result)
        return result

    async def search(self, query: str) -> dict:
        """Search news by keyword."""
        if not query.strip():
            return {"articles": []}
        data = await self._newsapi_get("/everything", {
            "q": query,
            "language": "en",
            "sortBy": "relevancy",
            "pageSize": 20,
        })
        articles = []
        for a in (data or {}).get("articles", []):
            if not a.get("title") or a["title"] == "[Removed]":
                continue
            articles.append({
                "title": a.get("title"),
                "description": a.get("description"),
                "url": a.get("url"),
                "image_url": a.get("urlToImage"),
                "source_name": (a.get("source") or {}).get("name", ""),
                "published_at": a.get("publishedAt"),
                "category": "search",
            })
        return {"articles": articles, "query": query}

    async def get_overall_sentiment(self) -> dict:
        """Aggregate sentiment across all recent news."""
        cached = _cached("overall_sentiment", _SENTIMENT_TTL)
        if cached:
            return cached

        try:
            result = self.db.table("grow_news").select(
                "sentiment, category"
            ).gte(
                "published_at",
                (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
            ).execute()

            rows = result.data or []
            counts = {"positive": 0, "negative": 0, "neutral": 0}
            by_cat: Dict[str, dict] = {}

            for r in rows:
                s = r.get("sentiment", "neutral") or "neutral"
                counts[s] = counts.get(s, 0) + 1
                cat = r.get("category", "general")
                if cat not in by_cat:
                    by_cat[cat] = {"positive": 0, "negative": 0, "neutral": 0}
                by_cat[cat][s] = by_cat[cat].get(s, 0) + 1

            total = sum(counts.values()) or 1
            sentiment = {
                "positive": round(counts["positive"] / total * 100, 1),
                "negative": round(counts["negative"] / total * 100, 1),
                "neutral": round(counts["neutral"] / total * 100, 1),
                "total_articles": total,
                "by_category": by_cat,
                "label": "Bullish" if counts["positive"] > counts["negative"] else (
                    "Bearish" if counts["negative"] > counts["positive"] else "Neutral"
                ),
            }
        except Exception:
            sentiment = {"positive": 40, "negative": 30, "neutral": 30, "label": "Neutral", "total_articles": 0, "by_category": {}}

        _set("overall_sentiment", sentiment)
        return sentiment

    # ─── DB Persistence ────────────────────────────────────────────────────────

    async def _save_articles(self, articles: List[dict]):
        if not articles:
            return
        rows = []
        for a in articles:
            rows.append({
                "title": a.get("title", ""),
                "description": a.get("description", ""),
                "url": a.get("url"),
                "image_url": a.get("image_url"),
                "source_name": a.get("source_name"),
                "published_at": a.get("published_at"),
                "category": a.get("category", "general"),
                "sentiment": a.get("sentiment", "neutral"),
                "ai_summary": a.get("summary"),
                "impact": a.get("impact", "low"),
                "currencies": a.get("currencies"),
            })
        try:
            for i in range(0, len(rows), 100):
                self.db.table("grow_news").upsert(
                    rows[i:i + 100], on_conflict="url"
                ).execute()
        except Exception as e:
            logger.error(f"Error saving grow_news: {e}")
