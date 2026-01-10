from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class CommodityType(BaseModel):
    id: UUID
    name: str
    category: str
    unit: str
    description: Optional[str] = None
    icon: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class Commodity(BaseModel):
    id: UUID
    market_id: UUID
    commodity_type_id: UUID
    name: str
    current_price: Optional[Decimal] = None
    price_per_unit: Optional[str] = None
    change_amount: Optional[Decimal] = None
    change_percentage: Optional[Decimal] = None
    high_24h: Optional[Decimal] = None
    low_24h: Optional[Decimal] = None
    last_updated: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class CommodityHistory(BaseModel):
    id: UUID
    commodity_id: UUID
    date: date
    price: Optional[Decimal] = None
    high_price: Optional[Decimal] = None
    low_price: Optional[Decimal] = None
    created_at: datetime

    class Config:
        from_attributes = True
