from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel


class Watchlist(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    is_default: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WatchlistItem(BaseModel):
    id: UUID
    watchlist_id: UUID
    item_type: str
    item_id: UUID
    price_alert_above: Optional[Decimal] = None
    price_alert_below: Optional[Decimal] = None
    notes: Optional[str] = None
    added_at: datetime

    class Config:
        from_attributes = True


class UserAlert(BaseModel):
    id: UUID
    user_id: UUID
    alert_type: str
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    condition: Dict[str, Any]
    message: Optional[str] = None
    is_triggered: bool = False
    triggered_at: Optional[datetime] = None
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True
