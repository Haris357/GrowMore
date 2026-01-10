from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


class WatchlistCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_default: bool = False


class WatchlistUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_default: Optional[bool] = None


class WatchlistResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    is_default: bool
    items_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WatchlistItemCreate(BaseModel):
    item_type: str = Field(..., pattern="^(stock|commodity|bank_product)$")
    item_id: UUID
    price_alert_above: Optional[Decimal] = Field(None, gt=0)
    price_alert_below: Optional[Decimal] = Field(None, gt=0)
    notes: Optional[str] = Field(None, max_length=500)


class WatchlistItemResponse(BaseModel):
    id: UUID
    watchlist_id: UUID
    item_type: str
    item_id: UUID
    item_name: Optional[str] = None
    item_symbol: Optional[str] = None
    current_price: Optional[Decimal] = None
    change_amount: Optional[Decimal] = None
    change_percentage: Optional[Decimal] = None
    price_alert_above: Optional[Decimal] = None
    price_alert_below: Optional[Decimal] = None
    notes: Optional[str] = None
    added_at: datetime

    class Config:
        from_attributes = True


class PriceAlertUpdate(BaseModel):
    price_alert_above: Optional[Decimal] = Field(None, gt=0)
    price_alert_below: Optional[Decimal] = Field(None, gt=0)


class WatchlistDetailResponse(WatchlistResponse):
    items: List[WatchlistItemResponse] = []


class UserAlertResponse(BaseModel):
    id: UUID
    user_id: UUID
    alert_type: str
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    entity_name: Optional[str] = None
    condition: dict
    message: Optional[str] = None
    is_triggered: bool
    triggered_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
