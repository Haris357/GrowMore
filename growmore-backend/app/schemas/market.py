from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID

from pydantic import BaseModel


class MarketResponse(BaseModel):
    id: UUID
    code: str
    name: str
    country: str
    country_code: str
    currency: str
    currency_symbol: str
    timezone: str
    trading_hours: Optional[Dict[str, Any]] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SectorResponse(BaseModel):
    id: UUID
    market_id: UUID
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MarketWithSectorsResponse(MarketResponse):
    sectors: List[SectorResponse] = []
