from datetime import datetime
from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from uuid import UUID

from app.core.dependencies import get_db
from app.services.news_service import NewsService
from app.schemas.news import (
    NewsArticleResponse,
    NewsArticleDetailResponse,
    TrendingNewsResponse,
    NewsSourceResponse,
)
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[NewsArticleResponse])
async def list_news_articles(
    market_id: Optional[UUID] = None,
    source_id: Optional[UUID] = None,
    category: Optional[str] = None,
    sentiment: Optional[str] = Query(None, pattern="^(positive|negative|neutral)$"),
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db=Depends(get_db),
):
    news_service = NewsService(db)
    result = await news_service.get_articles(
        market_id=market_id,
        source_id=source_id,
        category=category,
        sentiment=sentiment,
        from_date=from_date,
        to_date=to_date,
        page=page,
        page_size=page_size,
    )

    items = []
    for item in result["items"]:
        source = item.get("news_sources")
        items.append(NewsArticleResponse(
            id=item["id"],
            source_id=item["source_id"],
            source=NewsSourceResponse(**source) if source else None,
            market_id=item.get("market_id"),
            title=item["title"],
            slug=item.get("slug"),
            summary=item.get("summary"),
            url=item["url"],
            image_url=item.get("image_url"),
            author=item.get("author"),
            published_at=item.get("published_at"),
            sentiment_score=item.get("sentiment_score"),
            sentiment_label=item.get("sentiment_label"),
            impact_score=item.get("impact_score"),
            categories=item.get("categories", []),
            tags=item.get("tags", []),
            created_at=item.get("created_at"),
        ))

    return PaginatedResponse(
        items=items,
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        total_pages=result["total_pages"],
        has_next=result["has_next"],
        has_previous=result["has_previous"],
    )


@router.get("/trending", response_model=TrendingNewsResponse)
async def get_trending_news(
    market_id: Optional[UUID] = None,
    limit: int = Query(default=10, ge=1, le=50),
    db=Depends(get_db),
):
    news_service = NewsService(db)
    result = await news_service.get_trending(market_id, limit)

    articles = []
    for item in result["articles"]:
        source = item.get("news_sources")
        articles.append(NewsArticleResponse(
            id=item["id"],
            source_id=item["source_id"],
            source=NewsSourceResponse(**source) if source else None,
            market_id=item.get("market_id"),
            title=item["title"],
            slug=item.get("slug"),
            summary=item.get("summary"),
            url=item["url"],
            image_url=item.get("image_url"),
            author=item.get("author"),
            published_at=item.get("published_at"),
            sentiment_score=item.get("sentiment_score"),
            sentiment_label=item.get("sentiment_label"),
            impact_score=item.get("impact_score"),
            categories=item.get("categories", []),
            tags=item.get("tags", []),
            created_at=item.get("created_at"),
        ))

    return TrendingNewsResponse(articles=articles, as_of=result["as_of"])


@router.get("/sources", response_model=List[NewsSourceResponse])
async def list_news_sources(db=Depends(get_db)):
    news_service = NewsService(db)
    sources = await news_service.get_sources()
    return [NewsSourceResponse.model_validate(s.model_dump()) for s in sources]


@router.get("/by-entity/{entity_type}/{entity_id}", response_model=List[NewsArticleResponse])
async def get_news_by_entity(
    entity_type: str,
    entity_id: UUID,
    limit: int = Query(default=20, ge=1, le=50),
    db=Depends(get_db),
):
    news_service = NewsService(db)
    results = await news_service.get_news_by_entity(entity_type, entity_id, limit)

    articles = []
    for item in results:
        news = item.get("news_articles", {})
        articles.append(NewsArticleResponse(
            id=news["id"],
            source_id=news.get("source_id", item.get("source_id")),
            title=news["title"],
            slug=news.get("slug"),
            summary=news.get("summary"),
            url=news["url"],
            published_at=news.get("published_at"),
            sentiment_label=news.get("sentiment_label"),
            categories=[],
            tags=[],
            created_at=news.get("created_at"),
        ))

    return articles


@router.get("/search", response_model=PaginatedResponse[NewsArticleResponse])
async def search_news(
    q: str = Query(..., min_length=3),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db=Depends(get_db),
):
    news_service = NewsService(db)
    result = await news_service.search_articles(q, page, page_size)

    items = []
    for item in result["items"]:
        source = item.get("news_sources")
        items.append(NewsArticleResponse(
            id=item["id"],
            source_id=item["source_id"],
            source=NewsSourceResponse(**source) if source else None,
            market_id=item.get("market_id"),
            title=item["title"],
            slug=item.get("slug"),
            summary=item.get("summary"),
            url=item["url"],
            image_url=item.get("image_url"),
            author=item.get("author"),
            published_at=item.get("published_at"),
            sentiment_score=item.get("sentiment_score"),
            sentiment_label=item.get("sentiment_label"),
            impact_score=item.get("impact_score"),
            categories=item.get("categories", []),
            tags=item.get("tags", []),
            created_at=item.get("created_at"),
        ))

    return PaginatedResponse(
        items=items,
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        total_pages=result["total_pages"],
        has_next=result["has_next"],
        has_previous=result["has_previous"],
    )


@router.get("/{article_id}", response_model=NewsArticleDetailResponse)
async def get_news_article(article_id: UUID, db=Depends(get_db)):
    news_service = NewsService(db)
    result = await news_service.get_article_by_id(article_id)

    source = result.get("source")

    return NewsArticleDetailResponse(
        id=result["id"],
        source_id=result["source_id"],
        source=NewsSourceResponse(**source) if source else None,
        market_id=result.get("market_id"),
        title=result["title"],
        slug=result.get("slug"),
        content=result.get("content"),
        summary=result.get("summary"),
        url=result["url"],
        image_url=result.get("image_url"),
        author=result.get("author"),
        published_at=result.get("published_at"),
        scraped_at=result.get("scraped_at"),
        sentiment_score=result.get("sentiment_score"),
        sentiment_label=result.get("sentiment_label"),
        impact_score=result.get("impact_score"),
        categories=result.get("categories", []),
        tags=result.get("tags", []),
        is_processed=result.get("is_processed", False),
        created_at=result.get("created_at"),
    )
