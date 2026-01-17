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

    # Price Data
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

    # 52 Week
    week_52_high: Optional[Decimal] = None
    week_52_low: Optional[Decimal] = None

    # Valuation
    market_cap: Optional[Decimal] = None
    pe_ratio: Optional[Decimal] = None
    pb_ratio: Optional[Decimal] = None
    ps_ratio: Optional[Decimal] = None
    peg_ratio: Optional[Decimal] = None
    ev_ebitda: Optional[Decimal] = None

    # Per Share
    eps: Optional[Decimal] = None
    book_value: Optional[Decimal] = None
    dps: Optional[Decimal] = None
    dividend_yield: Optional[Decimal] = None

    # Profitability
    roe: Optional[Decimal] = None
    roa: Optional[Decimal] = None
    roce: Optional[Decimal] = None
    gross_margin: Optional[Decimal] = None
    operating_margin: Optional[Decimal] = None
    net_margin: Optional[Decimal] = None
    profit_margin: Optional[Decimal] = None

    # Leverage
    debt_to_equity: Optional[Decimal] = None
    debt_to_assets: Optional[Decimal] = None
    current_ratio: Optional[Decimal] = None
    quick_ratio: Optional[Decimal] = None
    interest_coverage: Optional[Decimal] = None

    # Growth
    revenue_growth: Optional[Decimal] = None
    earnings_growth: Optional[Decimal] = None
    profit_growth: Optional[Decimal] = None
    asset_growth: Optional[Decimal] = None

    # Cash Flow
    free_cash_flow: Optional[Decimal] = None
    operating_cash_flow: Optional[Decimal] = None
    fcf_yield: Optional[Decimal] = None

    # Other
    beta: Optional[Decimal] = None
    shares_outstanding: Optional[int] = None
    float_shares: Optional[int] = None
    payout_ratio: Optional[Decimal] = None

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
