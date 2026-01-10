from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client

from app.models.news import NewsArticle, NewsSource, NewsEntityMention
from app.repositories.base import BaseRepository


class NewsSourceRepository(BaseRepository[NewsSource]):
    def __init__(self, client: Client):
        super().__init__(client, "news_sources")

    async def get_by_name(self, name: str) -> Optional[NewsSource]:
        result = self.client.table(self.table_name).select("*").eq(
            "name", name
        ).execute()

        if result.data:
            return NewsSource(**result.data[0])
        return None

    async def get_active_sources(self) -> List[NewsSource]:
        result = self.client.table(self.table_name).select("*").eq(
            "is_active", True
        ).order("name").execute()

        return [NewsSource(**item) for item in result.data] if result.data else []


class NewsRepository(BaseRepository[NewsArticle]):
    def __init__(self, client: Client):
        super().__init__(client, "news_articles")

    async def get_by_url(self, url: str) -> Optional[NewsArticle]:
        result = self.client.table(self.table_name).select("*").eq(
            "url", url
        ).execute()

        if result.data:
            return NewsArticle(**result.data[0])
        return None

    async def get_by_slug(self, slug: str) -> Optional[NewsArticle]:
        result = self.client.table(self.table_name).select("*").eq(
            "slug", slug
        ).execute()

        if result.data:
            return NewsArticle(**result.data[0])
        return None

    async def get_articles_with_sources(
        self,
        market_id: Optional[UUID] = None,
        source_id: Optional[UUID] = None,
        category: Optional[str] = None,
        sentiment: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        query = self.client.table(self.table_name).select(
            "*, news_sources(id, name, base_url, source_type, reliability_score, is_active, created_at)",
            count="exact"
        )

        if market_id:
            query = query.eq("market_id", str(market_id))

        if source_id:
            query = query.eq("source_id", str(source_id))

        if category:
            query = query.contains("categories", [category])

        if sentiment:
            query = query.eq("sentiment_label", sentiment)

        if from_date:
            query = query.gte("published_at", from_date.isoformat())

        if to_date:
            query = query.lte("published_at", to_date.isoformat())

        query = query.order("published_at", desc=True)

        offset = (page - 1) * page_size
        query = query.range(offset, offset + page_size - 1)

        result = query.execute()

        total = result.count or 0
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        return {
            "items": result.data or [],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
        }

    async def get_trending(self, market_id: Optional[UUID] = None, limit: int = 10) -> List[Dict[str, Any]]:
        query = self.client.table(self.table_name).select(
            "*, news_sources(id, name, base_url, source_type)"
        )

        if market_id:
            query = query.eq("market_id", str(market_id))

        result = query.order("impact_score", desc=True).order(
            "published_at", desc=True
        ).limit(limit).execute()

        return result.data or []

    async def get_unprocessed(self, limit: int = 50) -> List[NewsArticle]:
        result = self.client.table(self.table_name).select("*").eq(
            "is_processed", False
        ).order("scraped_at", desc=False).limit(limit).execute()

        return [NewsArticle(**item) for item in result.data] if result.data else []

    async def mark_as_processed(self, article_id: UUID, update_data: Dict[str, Any]) -> Optional[NewsArticle]:
        update_data["is_processed"] = True
        result = self.client.table(self.table_name).update(update_data).eq(
            "id", str(article_id)
        ).execute()

        if result.data:
            return NewsArticle(**result.data[0])
        return None

    async def search_articles(
        self, search_term: str, page: int = 1, page_size: int = 20
    ) -> Dict[str, Any]:
        query = self.client.table(self.table_name).select(
            "*, news_sources(id, name)",
            count="exact"
        ).or_(
            f"title.ilike.%{search_term}%,summary.ilike.%{search_term}%"
        ).order("published_at", desc=True)

        offset = (page - 1) * page_size
        query = query.range(offset, offset + page_size - 1)

        result = query.execute()

        total = result.count or 0
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        return {
            "items": result.data or [],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
        }


class NewsEntityMentionRepository(BaseRepository[NewsEntityMention]):
    def __init__(self, client: Client):
        super().__init__(client, "news_entity_mentions")

    async def get_by_entity(
        self, entity_type: str, entity_id: UUID, limit: int = 20
    ) -> List[Dict[str, Any]]:
        result = self.client.table(self.table_name).select(
            "*, news_articles(id, title, slug, summary, url, published_at, sentiment_label)"
        ).eq("entity_type", entity_type).eq(
            "entity_id", str(entity_id)
        ).order("created_at", desc=True).limit(limit).execute()

        return result.data or []

    async def get_news_entities(self, news_id: UUID) -> List[NewsEntityMention]:
        result = self.client.table(self.table_name).select("*").eq(
            "news_id", str(news_id)
        ).execute()

        return [NewsEntityMention(**item) for item in result.data] if result.data else []
