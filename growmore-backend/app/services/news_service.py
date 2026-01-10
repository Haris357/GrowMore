from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client

from app.models.news import NewsArticle, NewsSource
from app.repositories.news_repository import NewsRepository, NewsSourceRepository, NewsEntityMentionRepository
from app.core.exceptions import NotFoundError
from app.db.vector_store import VectorStore
from app.ai.embeddings import EmbeddingService


class NewsService:
    def __init__(self, db: Client):
        self.news_repo = NewsRepository(db)
        self.source_repo = NewsSourceRepository(db)
        self.mention_repo = NewsEntityMentionRepository(db)
        self.vector_store = VectorStore(db)
        self.embedding_service = EmbeddingService()

    async def get_articles(
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
        return await self.news_repo.get_articles_with_sources(
            market_id=market_id,
            source_id=source_id,
            category=category,
            sentiment=sentiment,
            from_date=from_date,
            to_date=to_date,
            page=page,
            page_size=page_size,
        )

    async def get_article_by_id(self, article_id: UUID) -> Dict[str, Any]:
        article = await self.news_repo.get_by_id(article_id)
        if not article:
            raise NotFoundError("News Article")

        source = await self.source_repo.get_by_id(article["source_id"])
        entities = await self.mention_repo.get_news_entities(article_id)

        return {
            **article,
            "source": source,
            "entities": entities,
        }

    async def get_article_by_slug(self, slug: str) -> Optional[NewsArticle]:
        return await self.news_repo.get_by_slug(slug)

    async def get_trending(self, market_id: Optional[UUID] = None, limit: int = 10) -> Dict[str, Any]:
        articles = await self.news_repo.get_trending(market_id, limit)
        return {
            "articles": articles,
            "as_of": datetime.utcnow(),
        }

    async def get_news_by_entity(
        self, entity_type: str, entity_id: UUID, limit: int = 20
    ) -> List[Dict[str, Any]]:
        return await self.mention_repo.get_by_entity(entity_type, entity_id, limit)

    async def search_articles(
        self, search_term: str, page: int = 1, page_size: int = 20
    ) -> Dict[str, Any]:
        return await self.news_repo.search_articles(search_term, page, page_size)

    async def semantic_search(
        self, query: str, limit: int = 10, threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        query_embedding = await self.embedding_service.generate_embedding(query)
        results = await self.vector_store.search_similar(query_embedding, limit, threshold)

        articles = []
        for result in results:
            article = await self.news_repo.get_by_id(result["news_id"])
            if article:
                article["similarity_score"] = result.get("similarity", 0)
                articles.append(article)

        return articles

    async def get_sources(self) -> List[NewsSource]:
        return await self.source_repo.get_active_sources()

    async def create_article(self, article_data: Dict[str, Any]) -> NewsArticle:
        existing = await self.news_repo.get_by_url(article_data["url"])
        if existing:
            return existing

        result = await self.news_repo.create(article_data)
        return NewsArticle(**result)

    async def get_unprocessed_articles(self, limit: int = 50) -> List[NewsArticle]:
        return await self.news_repo.get_unprocessed(limit)

    async def mark_article_processed(
        self, article_id: UUID, update_data: Dict[str, Any]
    ) -> Optional[NewsArticle]:
        return await self.news_repo.mark_as_processed(article_id, update_data)
