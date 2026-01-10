from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel


class CommodityTypeResponse(BaseModel):
    id: UUID
    name: str
    category: str
    unit: str
    description: Optional[str] = None
    icon: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CommodityResponse(BaseModel):
    id: UUID
    market_id: UUID
    commodity_type_id: UUID
    commodity_type: Optional[CommodityTypeResponse] = None
    name: str
    current_price: Optional[Decimal] = None
    price_per_unit: Optional[str] = None
    change_amount: Optional[Decimal] = None
    change_percentage: Optional[Decimal] = None
    high_24h: Optional[Decimal] = None
    low_24h: Optional[Decimal] = None
    last_updated: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CommodityDetailResponse(CommodityResponse):
    history_7d: Optional[List["CommodityHistoryResponse"]] = None


class CommodityHistoryResponse(BaseModel):
    id: UUID
    commodity_id: UUID
    date: date
    price: Optional[Decimal] = None
    high_price: Optional[Decimal] = None
    low_price: Optional[Decimal] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CommodityHistoryListResponse(BaseModel):
    commodity_id: UUID
    name: str
    history: List[CommodityHistoryResponse]
    period: str


class CommodityListParams(BaseModel):
    market_id: Optional[UUID] = None
    category: Optional[str] = None
    commodity_type_id: Optional[UUID] = None


CommodityDetailResponse.model_rebuild()
