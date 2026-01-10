"""
News Streaming WebSocket Manager.
Real-time news and alert updates.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set

from app.websockets.connection_manager import manager

logger = logging.getLogger(__name__)


class NewsStreamManager:
    """
    Manages real-time news streaming.

    Features:
    - Breaking news alerts
    - Market-moving news notifications
    - Personalized news based on watchlist
    - News sentiment updates
    """

    def __init__(self):
        self.is_streaming = False
        self.stream_task: Optional[asyncio.Task] = None
        self.check_interval = 30  # seconds
        self.last_check_time: Optional[datetime] = None
        self.seen_news_ids: Set[str] = set()

    async def start_streaming(self):
        """Start the news streaming background task."""
        if self.is_streaming:
            return

        self.is_streaming = True
        self.last_check_time = datetime.utcnow()
        self.stream_task = asyncio.create_task(self._stream_loop())
        logger.info("News streaming started")

    async def stop_streaming(self):
        """Stop the news streaming background task."""
        self.is_streaming = False
        if self.stream_task:
            self.stream_task.cancel()
            try:
                await self.stream_task
            except asyncio.CancelledError:
                pass
        logger.info("News streaming stopped")

    async def _stream_loop(self):
        """Main streaming loop for news updates."""
        while self.is_streaming:
            try:
                # Check for new news articles
                new_articles = await self._fetch_new_articles()

                if new_articles:
                    # Broadcast to news subscribers
                    await self._broadcast_news(new_articles)

                    # Check for breaking/important news
                    breaking = [a for a in new_articles if self._is_breaking_news(a)]
                    if breaking:
                        await self._broadcast_breaking_news(breaking)

                self.last_check_time = datetime.utcnow()
                await asyncio.sleep(self.check_interval)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in news stream: {e}")
                await asyncio.sleep(self.check_interval)

    async def _fetch_new_articles(self) -> List[Dict[str, Any]]:
        """Fetch news articles since last check."""
        from app.db.supabase import get_supabase_service_client

        new_articles = []

        try:
            db = get_supabase_service_client()

            # Get articles from last check time
            since = (self.last_check_time or datetime.utcnow() - timedelta(minutes=5)).isoformat()

            result = db.table("news_articles").select(
                "id,title,summary,source,url,category,sentiment,impact_score,published_at,created_at"
            ).gte("created_at", since).order("created_at", desc=True).limit(50).execute()

            for article in (result.data or []):
                if article["id"] not in self.seen_news_ids:
                    new_articles.append(article)
                    self.seen_news_ids.add(article["id"])

            # Clean up old IDs (keep last 1000)
            if len(self.seen_news_ids) > 1000:
                self.seen_news_ids = set(list(self.seen_news_ids)[-500:])

        except Exception as e:
            logger.error(f"Error fetching news: {e}")

        return new_articles

    def _is_breaking_news(self, article: Dict[str, Any]) -> bool:
        """Check if an article qualifies as breaking news."""
        # High impact score
        if article.get("impact_score", 0) >= 8:
            return True

        # Contains breaking keywords
        title = (article.get("title") or "").lower()
        breaking_keywords = [
            "breaking", "urgent", "just in", "alert",
            "sbp", "interest rate", "monetary policy",
            "crash", "surge", "plunge", "soar",
        ]
        if any(kw in title for kw in breaking_keywords):
            return True

        return False

    async def _broadcast_news(self, articles: List[Dict[str, Any]]):
        """Broadcast news updates to subscribers."""
        await manager.broadcast_to_topic(
            {
                "type": "news_update",
                "data": articles,
                "count": len(articles),
                "timestamp": datetime.utcnow().isoformat(),
            },
            topic="news",
        )

    async def _broadcast_breaking_news(self, articles: List[Dict[str, Any]]):
        """Broadcast breaking news to all connected users."""
        for article in articles:
            await manager.broadcast_all(
                {
                    "type": "breaking_news",
                    "data": {
                        "id": article["id"],
                        "title": article["title"],
                        "summary": article.get("summary"),
                        "source": article["source"],
                        "url": article.get("url"),
                        "impact_score": article.get("impact_score"),
                    },
                    "timestamp": datetime.utcnow().isoformat(),
                }
            )

    async def push_news_alert(
        self,
        user_id: str,
        article: Dict[str, Any],
        reason: str = "watchlist",
    ):
        """
        Push a news alert to a specific user.

        Used when news affects their watchlist or portfolio.
        """
        await manager.send_personal_message(
            {
                "type": "news_alert",
                "reason": reason,
                "data": article,
                "timestamp": datetime.utcnow().isoformat(),
            },
            user_id=user_id,
        )

    async def push_price_alert(
        self,
        user_id: str,
        alert_data: Dict[str, Any],
    ):
        """
        Push a price alert to a user.

        Triggered when a price alert condition is met.
        """
        await manager.send_personal_message(
            {
                "type": "price_alert",
                "data": alert_data,
                "timestamp": datetime.utcnow().isoformat(),
            },
            user_id=user_id,
        )

    async def push_market_update(
        self,
        update_type: str,
        data: Dict[str, Any],
    ):
        """
        Push market-wide updates.

        Types: market_open, market_close, circuit_breaker, etc.
        """
        await manager.broadcast_to_topic(
            {
                "type": "market_update",
                "update_type": update_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat(),
            },
            topic="market",
        )


# Global news stream manager
news_stream = NewsStreamManager()
