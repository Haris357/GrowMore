from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


class NewsListParams(BaseModel):
    market_id: Optional[UUID] = None
    source_id: Optional[UUID] = None
    category: Optional[str] = None
    sentiment: Optional[str] = Field(None, pattern="^(positive|negative|neutral)$")
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    search: Optional[str] = None


class NewsSearchParams(BaseModel):
    query: str = Field(..., min_length=3)
    limit: int = Field(default=10, ge=1, le=50)
    threshold: float = Field(default=0.7, ge=0.0, le=1.0)


class NewsSourceResponse(BaseModel):
    id: UUID
    name: str
    base_url: Optional[str] = None
    source_type: Optional[str] = None
    reliability_score: Optional[Decimal] = None
    is_active: Optional[bool] = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NewsArticleResponse(BaseModel):
    id: UUID
    source_id: Optional[UUID] = None
    source: Optional[NewsSourceResponse] = None
    market_id: Optional[UUID] = None
    title: str
    slug: Optional[str] = None
    summary: Optional[str] = None
    url: str
    image_url: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[datetime] = None
    sentiment_score: Optional[Decimal] = None
    sentiment_label: Optional[str] = None
    impact_score: Optional[Decimal] = None
    categories: List[str] = []
    tags: List[str] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NewsArticleDetailResponse(NewsArticleResponse):
    content: Optional[str] = None
    scraped_at: Optional[datetime] = None
    is_processed: Optional[bool] = False


class TrendingNewsResponse(BaseModel):
    articles: List[NewsArticleResponse]
    as_of: datetime


class NewsEntityResponse(BaseModel):
    entity_type: str
    entity_id: UUID
    entity_name: str
    relevance_score: Optional[Decimal] = None
    sentiment_score: Optional[Decimal] = None


class NewsWithEntitiesResponse(NewsArticleDetailResponse):
    entities: List[NewsEntityResponse] = []
