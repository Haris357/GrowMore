from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel


class NewsSource(BaseModel):
    id: UUID
    name: str
    base_url: str
    source_type: str
    reliability_score: Decimal = Decimal("0.5")
    is_active: bool = True
    scrape_config: Dict[str, Any] = {}
    created_at: datetime

    class Config:
        from_attributes = True


class NewsArticle(BaseModel):
    id: UUID
    source_id: UUID
    market_id: Optional[UUID] = None
    title: str
    slug: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    url: str
    image_url: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[datetime] = None
    scraped_at: datetime
    sentiment_score: Optional[Decimal] = None
    sentiment_label: Optional[str] = None
    impact_score: Optional[Decimal] = None
    categories: List[str] = []
    tags: List[str] = []
    is_processed: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class NewsEmbedding(BaseModel):
    id: UUID
    news_id: UUID
    embedding: List[float]
    created_at: datetime

    class Config:
        from_attributes = True


class NewsEntityMention(BaseModel):
    id: UUID
    news_id: UUID
    entity_type: str
    entity_id: UUID
    relevance_score: Optional[Decimal] = None
    sentiment_score: Optional[Decimal] = None
    created_at: datetime

    class Config:
        from_attributes = True
