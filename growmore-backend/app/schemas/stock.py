from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


class StockListParams(BaseModel):
    market_id: Optional[UUID] = None
    sector_id: Optional[UUID] = None
    search: Optional[str] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    min_change: Optional[Decimal] = None
    max_change: Optional[Decimal] = None


class CompanyResponse(BaseModel):
    id: UUID
    market_id: UUID
    sector_id: Optional[UUID] = None
    symbol: str
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    founded_year: Optional[int] = None
    employees: Optional[int] = None
    headquarters: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StockResponse(BaseModel):
    id: UUID
    company_id: UUID
    symbol: str
    name: str
    logo_url: Optional[str] = None
    sector_name: Optional[str] = None
    current_price: Optional[Decimal] = None
    change_amount: Optional[Decimal] = None
    change_percentage: Optional[Decimal] = None
    volume: Optional[int] = None
    market_cap: Optional[Decimal] = None
    last_updated: Optional[datetime] = None

    class Config:
        from_attributes = True


class StockDetailResponse(BaseModel):
    id: UUID
    company: CompanyResponse
    current_price: Optional[Decimal] = None
    open_price: Optional[Decimal] = None
    high_price: Optional[Decimal] = None
    low_price: Optional[Decimal] = None
    close_price: Optional[Decimal] = None
    previous_close: Optional[Decimal] = None
    change_amount: Optional[Decimal] = None
    change_percentage: Optional[Decimal] = None
    volume: Optional[int] = None
    avg_volume: Optional[int] = None
    market_cap: Optional[Decimal] = None
    pe_ratio: Optional[Decimal] = None
    eps: Optional[Decimal] = None
    dividend_yield: Optional[Decimal] = None
    week_52_high: Optional[Decimal] = None
    week_52_low: Optional[Decimal] = None
    last_updated: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class StockHistoryResponse(BaseModel):
    id: UUID
    stock_id: UUID
    date: date
    open_price: Optional[Decimal] = None
    high_price: Optional[Decimal] = None
    low_price: Optional[Decimal] = None
    close_price: Optional[Decimal] = None
    volume: Optional[int] = None

    class Config:
        from_attributes = True


class StockHistoryListResponse(BaseModel):
    stock_id: UUID
    symbol: str
    history: List[StockHistoryResponse]
    period: str


class TopStockResponse(BaseModel):
    stocks: List[StockResponse]
    as_of: datetime
