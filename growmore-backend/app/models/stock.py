from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class Company(BaseModel):
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
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Stock(BaseModel):
    id: UUID
    company_id: UUID
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


class StockHistory(BaseModel):
    id: UUID
    stock_id: UUID
    date: date
    open_price: Optional[Decimal] = None
    high_price: Optional[Decimal] = None
    low_price: Optional[Decimal] = None
    close_price: Optional[Decimal] = None
    volume: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
