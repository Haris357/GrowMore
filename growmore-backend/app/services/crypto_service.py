"""
Crypto Service — CoinGecko + CryptoPanic integration with Supabase persistence.
"""
import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from app.config.settings import settings
from app.db.supabase import get_supabase_service_client

logger = logging.getLogger(__name__)

COINGECKO_BASE = "https://api.coingecko.com/api/v3"
CRYPTOPANIC_BASE = "https://cryptopanic.com/api/v1"

MARKETS_TTL = 60
GLOBAL_TTL = 120
NEWS_TTL = 300
TRENDING_TTL = 300
CHART_TTL = 120

_cache: Dict[str, Any] = {}


def _get_cached(key: str, ttl: int) -> Optional[Any]:
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < ttl:
        return entry["data"]
    return None


def _set_cached(key: str, data: Any):
    _cache[key] = {"data": data, "ts": time.time()}


class CryptoService:
    def __init__(self):
        self.db = get_supabase_service_client()
        self._cg_headers = {"User-Agent": "GrowMore/1.0"}
        if settings.coingecko_api_key:
            self._cg_headers["x-cg-demo-api-key"] = settings.coingecko_api_key

    async def _cg_get(self, path: str, params: dict = None) -> Optional[Any]:
        url = f"{COINGECKO_BASE}{path}"
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                resp = await client.get(url, params=params, headers=self._cg_headers)
                resp.raise_for_status()
                return resp.json()
            except Exception as e:
                logger.error(f"CoinGecko {path}: {e}")
                return None

    # ─── Public API ────────────────────────────────────────────────────────────

    async def get_markets(
        self,
        page: int = 1,
        per_page: int = 50,
        search: Optional[str] = None,
        sort: str = "market_cap_desc",
        category: Optional[str] = None,
    ) -> Dict:
        cache_key = f"markets_{page}_{per_page}_{search}_{sort}_{category}"
        cached = _get_cached(cache_key, MARKETS_TTL)
        if cached:
            return cached

        params: Dict[str, Any] = {
            "vs_currency": "usd",
            "order": sort,
            "per_page": per_page,
            "page": page,
            "sparkline": "true",
            "price_change_percentage": "1h,24h,7d",
        }
        if category:
            params["category"] = category

        data = await self._cg_get("/coins/markets", params)

        if data is None:
            return await self._markets_from_db(page, per_page, search)

        if search:
            q = search.lower()
            data = [
                c for c in data
                if q in c.get("id", "").lower()
                or q in c.get("symbol", "").lower()
                or q in c.get("name", "").lower()
            ]

        asyncio.create_task(self._save_coins(data))

        result = {"coins": data, "page": page, "per_page": per_page, "total": len(data)}
        _set_cached(cache_key, result)
        return result

    async def get_trending(self) -> Dict:
        cached = _get_cached("trending", TRENDING_TTL)
        if cached:
            return cached

        data = await self._cg_get("/search/trending")
        coins = []
        if data:
            for item in data.get("coins", []):
                coin = item.get("item", {})
                coins.append({
                    "id": coin.get("id"),
                    "name": coin.get("name"),
                    "symbol": coin.get("symbol"),
                    "image": coin.get("small"),
                    "market_cap_rank": coin.get("market_cap_rank"),
                    "price_btc": coin.get("price_btc"),
                    "data": coin.get("data", {}),
                })

        result = {"coins": coins}
        _set_cached("trending", result)
        return result

    async def get_global(self) -> Dict:
        cached = _get_cached("global", GLOBAL_TTL)
        if cached:
            return cached

        data = await self._cg_get("/global")
        if not data:
            return await self._global_from_db()

        result = data.get("data", {})
        asyncio.create_task(self._save_global(result))
        _set_cached("global", result)
        return result

    async def get_coin_detail(self, coin_id: str) -> Dict:
        cached = _get_cached(f"coin_{coin_id}", MARKETS_TTL)
        if cached:
            return cached

        data = await self._cg_get(f"/coins/{coin_id}", {
            "localization": "false",
            "tickers": "false",
            "market_data": "true",
            "community_data": "true",
            "developer_data": "false",
        })
        if not data:
            return {}

        _set_cached(f"coin_{coin_id}", data)
        return data

    async def get_coin_chart(self, coin_id: str, days: int = 7) -> Dict:
        cache_key = f"chart_{coin_id}_{days}"
        cached = _get_cached(cache_key, CHART_TTL)
        if cached:
            return cached

        data = await self._cg_get(
            f"/coins/{coin_id}/market_chart",
            {"vs_currency": "usd", "days": days, "interval": "daily" if days > 90 else ""},
        )

        if not data:
            return await self._chart_from_db(coin_id, days)

        asyncio.create_task(self._save_coin_history(coin_id, data))

        result = {
            "coin_id": coin_id,
            "days": days,
            "prices": data.get("prices", []),
            "market_caps": data.get("market_caps", []),
            "volumes": data.get("total_volumes", []),
        }
        _set_cached(cache_key, result)
        return result

    async def get_news(self, filter: str = "hot", currencies: Optional[str] = None) -> Dict:
        if not settings.cryptopanic_api_key:
            return await self._news_from_db()

        cache_key = f"news_{filter}_{currencies}"
        cached = _get_cached(cache_key, NEWS_TTL)
        if cached:
            return cached

        params: Dict[str, Any] = {
            "auth_token": settings.cryptopanic_api_key,
            "public": "true",
            "filter": filter,
        }
        if currencies:
            params["currencies"] = currencies

        async with httpx.AsyncClient(timeout=15) as client:
            try:
                resp = await client.get(f"{CRYPTOPANIC_BASE}/posts/", params=params)
                resp.raise_for_status()
                data = resp.json()
                articles = data.get("results", [])
                asyncio.create_task(self._save_news(articles))
                result = {
                    "results": self._format_news(articles),
                    "count": len(articles),
                    "next": data.get("next"),
                }
                _set_cached(cache_key, result)
                return result
            except Exception as e:
                logger.error(f"CryptoPanic error: {e}")
                return await self._news_from_db()

    async def get_sentiment(self) -> Dict:
        """Derive market sentiment from recent news votes."""
        news = await self._news_from_db(limit=100)
        articles = news.get("results", [])
        total_pos = sum(a.get("votes_positive", 0) for a in articles)
        total_neg = sum(a.get("votes_negative", 0) for a in articles)
        total = total_pos + total_neg or 1
        bullish_pct = round((total_pos / total) * 100, 1)
        bearish_pct = round((total_neg / total) * 100, 1)
        return {
            "bullish": bullish_pct,
            "bearish": bearish_pct,
            "neutral": round(100 - bullish_pct - bearish_pct, 1),
            "label": "Bullish" if bullish_pct > 55 else ("Bearish" if bearish_pct > 55 else "Neutral"),
            "total_votes": total,
        }

    # ─── DB Savers ─────────────────────────────────────────────────────────────

    async def _save_coins(self, coins: List[dict]):
        if not coins:
            return
        rows = []
        for c in coins:
            rows.append({
                "coin_id": c.get("id"),
                "symbol": (c.get("symbol") or "").upper(),
                "name": c.get("name"),
                "image": c.get("image"),
                "current_price": c.get("current_price"),
                "market_cap": c.get("market_cap"),
                "market_cap_rank": c.get("market_cap_rank"),
                "fully_diluted_valuation": c.get("fully_diluted_valuation"),
                "total_volume": c.get("total_volume"),
                "high_24h": c.get("high_24h"),
                "low_24h": c.get("low_24h"),
                "price_change_24h": c.get("price_change_24h"),
                "price_change_percentage_24h": c.get("price_change_percentage_24h"),
                "price_change_percentage_7d": c.get("price_change_percentage_7d_in_currency"),
                "price_change_percentage_1h": c.get("price_change_percentage_1h_in_currency"),
                "market_cap_change_percentage_24h": c.get("market_cap_change_percentage_24h"),
                "circulating_supply": c.get("circulating_supply"),
                "total_supply": c.get("total_supply"),
                "max_supply": c.get("max_supply"),
                "ath": c.get("ath"),
                "ath_change_percentage": c.get("ath_change_percentage"),
                "atl": c.get("atl"),
                "atl_change_percentage": c.get("atl_change_percentage"),
                "sparkline_7d": c.get("sparkline_in_7d"),
                "last_updated": c.get("last_updated") or datetime.now(timezone.utc).isoformat(),
            })
        try:
            for i in range(0, len(rows), 100):
                self.db.table("crypto_coins").upsert(
                    rows[i:i + 100], on_conflict="coin_id"
                ).execute()
        except Exception as e:
            logger.error(f"Error saving crypto coins: {e}")

    async def _save_coin_history(self, coin_id: str, data: dict):
        prices = data.get("prices", [])
        volumes = {v[0]: v[1] for v in data.get("total_volumes", [])}
        mcaps = {m[0]: m[1] for m in data.get("market_caps", [])}

        rows = []
        for ts, price in prices:
            dt = datetime.fromtimestamp(ts / 1000, tz=timezone.utc).isoformat()
            rows.append({
                "coin_id": coin_id,
                "timestamp": dt,
                "price": price,
                "volume": volumes.get(ts),
                "market_cap": mcaps.get(ts),
            })

        if not rows:
            return
        try:
            for i in range(0, len(rows), 500):
                self.db.table("crypto_history").upsert(
                    rows[i:i + 500], on_conflict="coin_id,timestamp"
                ).execute()
        except Exception as e:
            logger.error(f"Error saving crypto history: {e}")

    async def _save_global(self, data: dict):
        try:
            row = {
                "active_cryptocurrencies": data.get("active_cryptocurrencies"),
                "markets": data.get("markets"),
                "total_market_cap_usd": (data.get("total_market_cap") or {}).get("usd"),
                "total_volume_usd": (data.get("total_volume") or {}).get("usd"),
                "market_cap_percentage": data.get("market_cap_percentage"),
                "market_cap_change_24h": data.get("market_cap_change_percentage_24h_usd"),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            self.db.table("crypto_global").insert(row).execute()
        except Exception as e:
            logger.error(f"Error saving crypto global: {e}")

    async def _save_news(self, articles: List[dict]):
        if not articles:
            return
        rows = []
        for a in articles:
            votes = a.get("votes") or {}
            pos = int(votes.get("positive") or 0)
            neg = int(votes.get("negative") or 0)
            sentiment = "positive" if pos > neg else ("negative" if neg > pos else "neutral")
            currencies = [c.get("code") for c in (a.get("currencies") or []) if c.get("code")]
            rows.append({
                "source_id": str(a.get("id")),
                "title": a.get("title", ""),
                "url": a.get("url"),
                "source_name": (a.get("source") or {}).get("title"),
                "published_at": a.get("published_at"),
                "currencies": currencies,
                "votes_positive": pos,
                "votes_negative": neg,
                "votes_important": int(votes.get("important") or 0),
                "kind": a.get("kind", "news"),
                "sentiment": sentiment,
                "domain": (a.get("source") or {}).get("domain"),
            })
        try:
            for i in range(0, len(rows), 100):
                self.db.table("crypto_news").upsert(
                    rows[i:i + 100], on_conflict="source_id"
                ).execute()
        except Exception as e:
            logger.error(f"Error saving crypto news: {e}")

    # ─── DB Fallbacks ───────────────────────────────────────────────────────────

    async def _markets_from_db(self, page: int, per_page: int, search: Optional[str]) -> Dict:
        try:
            query = self.db.table("crypto_coins").select("*").order("market_cap_rank", desc=False)
            if search:
                query = query.or_(f"symbol.ilike.%{search}%,name.ilike.%{search}%")
            offset = (page - 1) * per_page
            result = query.range(offset, offset + per_page - 1).execute()
            return {"coins": result.data or [], "page": page, "per_page": per_page, "from_db": True}
        except Exception:
            return {"coins": [], "page": page, "per_page": per_page}

    async def _global_from_db(self) -> Dict:
        try:
            result = self.db.table("crypto_global").select("*").order(
                "updated_at", desc=True
            ).limit(1).execute()
            return result.data[0] if result.data else {}
        except Exception:
            return {}

    async def _chart_from_db(self, coin_id: str, days: int) -> Dict:
        try:
            from datetime import timedelta
            since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            result = self.db.table("crypto_history").select("timestamp,price,volume,market_cap").eq(
                "coin_id", coin_id
            ).gte("timestamp", since).order("timestamp").execute()
            rows = result.data or []
            prices = [[r["timestamp"], r["price"]] for r in rows]
            volumes = [[r["timestamp"], r["volume"]] for r in rows]
            return {"coin_id": coin_id, "days": days, "prices": prices, "volumes": volumes, "from_db": True}
        except Exception:
            return {"coin_id": coin_id, "days": days, "prices": [], "volumes": []}

    async def _news_from_db(self, limit: int = 50) -> Dict:
        try:
            result = self.db.table("crypto_news").select("*").order(
                "published_at", desc=True
            ).limit(limit).execute()
            return {"results": result.data or [], "count": len(result.data or []), "from_db": True}
        except Exception:
            return {"results": []}

    def _format_news(self, articles: List[dict]) -> List[dict]:
        formatted = []
        for a in articles:
            votes = a.get("votes") or {}
            pos = int(votes.get("positive") or 0)
            neg = int(votes.get("negative") or 0)
            formatted.append({
                "id": a.get("id"),
                "title": a.get("title"),
                "url": a.get("url"),
                "source_name": (a.get("source") or {}).get("title"),
                "domain": (a.get("source") or {}).get("domain"),
                "published_at": a.get("published_at"),
                "currencies": [c.get("code") for c in (a.get("currencies") or []) if c.get("code")],
                "votes_positive": pos,
                "votes_negative": neg,
                "sentiment": "positive" if pos > neg else ("negative" if neg > pos else "neutral"),
                "kind": a.get("kind", "news"),
            })
        return formatted
