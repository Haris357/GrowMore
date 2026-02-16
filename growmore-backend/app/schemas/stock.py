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

    # Price Data
    current_price: Optional[Decimal] = None
    open_price: Optional[Decimal] = None
    high_price: Optional[Decimal] = None
    low_price: Optional[Decimal] = None
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

    # Leverage
    debt_to_equity: Optional[Decimal] = None
    debt_to_assets: Optional[Decimal] = None
    current_ratio: Optional[Decimal] = None
    quick_ratio: Optional[Decimal] = None

    # Growth
    revenue_growth: Optional[Decimal] = None
    earnings_growth: Optional[Decimal] = None
    profit_growth: Optional[Decimal] = None

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


# =====================================================
# SCREENER SCHEMAS - Comprehensive Stock Screening
# =====================================================

class ScreenerFilters(BaseModel):
    """Comprehensive filter parameters for stock screener."""
    # Sector/Industry
    sector: Optional[str] = None
    sector_id: Optional[UUID] = None

    # Price Range
    price_min: Optional[Decimal] = None
    price_max: Optional[Decimal] = None
    change_percentage_min: Optional[Decimal] = None
    change_percentage_max: Optional[Decimal] = None

    # Volume
    volume_min: Optional[int] = None
    volume_max: Optional[int] = None

    # Market Cap (in PKR)
    market_cap_min: Optional[Decimal] = None
    market_cap_max: Optional[Decimal] = None

    # Valuation Ratios
    pe_min: Optional[Decimal] = None
    pe_max: Optional[Decimal] = None
    pb_min: Optional[Decimal] = None
    pb_max: Optional[Decimal] = None
    ps_min: Optional[Decimal] = None
    ps_max: Optional[Decimal] = None
    peg_min: Optional[Decimal] = None
    peg_max: Optional[Decimal] = None
    ev_ebitda_min: Optional[Decimal] = None
    ev_ebitda_max: Optional[Decimal] = None

    # Per Share
    eps_min: Optional[Decimal] = None
    eps_max: Optional[Decimal] = None
    book_value_min: Optional[Decimal] = None
    book_value_max: Optional[Decimal] = None
    dps_min: Optional[Decimal] = None
    dps_max: Optional[Decimal] = None
    dividend_yield_min: Optional[Decimal] = None
    dividend_yield_max: Optional[Decimal] = None

    # Profitability Ratios
    roe_min: Optional[Decimal] = None
    roe_max: Optional[Decimal] = None
    roa_min: Optional[Decimal] = None
    roa_max: Optional[Decimal] = None
    roce_min: Optional[Decimal] = None
    roce_max: Optional[Decimal] = None
    gross_margin_min: Optional[Decimal] = None
    gross_margin_max: Optional[Decimal] = None
    operating_margin_min: Optional[Decimal] = None
    operating_margin_max: Optional[Decimal] = None
    net_margin_min: Optional[Decimal] = None
    net_margin_max: Optional[Decimal] = None
    profit_margin_min: Optional[Decimal] = None
    profit_margin_max: Optional[Decimal] = None

    # Leverage Ratios
    debt_to_equity_min: Optional[Decimal] = None
    debt_to_equity_max: Optional[Decimal] = None
    debt_to_assets_min: Optional[Decimal] = None
    debt_to_assets_max: Optional[Decimal] = None
    current_ratio_min: Optional[Decimal] = None
    current_ratio_max: Optional[Decimal] = None
    quick_ratio_min: Optional[Decimal] = None
    quick_ratio_max: Optional[Decimal] = None
    interest_coverage_min: Optional[Decimal] = None
    interest_coverage_max: Optional[Decimal] = None

    # Growth Metrics
    revenue_growth_min: Optional[Decimal] = None
    revenue_growth_max: Optional[Decimal] = None
    earnings_growth_min: Optional[Decimal] = None
    earnings_growth_max: Optional[Decimal] = None
    profit_growth_min: Optional[Decimal] = None
    profit_growth_max: Optional[Decimal] = None

    # Cash Flow
    fcf_yield_min: Optional[Decimal] = None
    fcf_yield_max: Optional[Decimal] = None

    # Other
    beta_min: Optional[Decimal] = None
    beta_max: Optional[Decimal] = None
    payout_ratio_min: Optional[Decimal] = None
    payout_ratio_max: Optional[Decimal] = None

    # 52 Week Performance
    near_52_week_high: Optional[bool] = None  # Within 10% of 52-week high
    near_52_week_low: Optional[bool] = None   # Within 10% of 52-week low

    # Sorting
    sort_by: Optional[str] = "market_cap"
    sort_order: Optional[str] = "desc"  # asc or desc


class ScreenerResult(BaseModel):
    """Comprehensive stock data for screener results."""
    id: UUID
    symbol: str
    name: str
    logo_url: Optional[str] = None
    sector: Optional[str] = None

    # Price Data
    current_price: Optional[Decimal] = None
    change_amount: Optional[Decimal] = None
    change_percentage: Optional[Decimal] = None
    open_price: Optional[Decimal] = None
    high_price: Optional[Decimal] = None
    low_price: Optional[Decimal] = None
    previous_close: Optional[Decimal] = None
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

    # Cash Flow
    free_cash_flow: Optional[Decimal] = None
    fcf_yield: Optional[Decimal] = None

    # Other
    beta: Optional[Decimal] = None
    payout_ratio: Optional[Decimal] = None

    class Config:
        from_attributes = True


class ScreenerTemplate(BaseModel):
    """Pre-configured screener template."""
    id: str
    name: str
    description: str
    filters: ScreenerFilters


class ScreenerResponse(BaseModel):
    """Paginated screener response."""
    items: List[ScreenerResult]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool


class ScreenerColumnConfig(BaseModel):
    """Column configuration for screener table."""
    key: str
    label: str
    type: str  # string, currency, percentage, decimal, number
    format: Optional[str] = None  # Rs., Cr, etc.
    sortable: bool = True
    visible: bool = True


class ScreenerColumnsResponse(BaseModel):
    """Available columns for screener."""
    columns: List[ScreenerColumnConfig]


class ScreenerTemplatesResponse(BaseModel):
    """Available screener templates."""
    templates: List[ScreenerTemplate]


class SectorResponse(BaseModel):
    """Sector information."""
    id: UUID
    name: str
    stock_count: Optional[int] = None

    class Config:
        from_attributes = True


class SectorsListResponse(BaseModel):
    """List of all sectors."""
    sectors: List[SectorResponse]


# =====================================================
# FINANCIAL STATEMENTS SCHEMAS
# =====================================================

class FinancialStatementResponse(BaseModel):
    """Single period financial statement."""
    id: Optional[UUID] = None
    company_id: Optional[UUID] = None
    period_type: str  # 'annual' or 'quarterly'
    fiscal_year: int
    quarter: Optional[int] = None

    # Income Statement
    revenue: Optional[Decimal] = None
    cost_of_revenue: Optional[Decimal] = None
    gross_profit: Optional[Decimal] = None
    operating_expenses: Optional[Decimal] = None
    operating_income: Optional[Decimal] = None
    ebitda: Optional[Decimal] = None
    interest_expense: Optional[Decimal] = None
    net_income: Optional[Decimal] = None
    eps: Optional[Decimal] = None

    # Balance Sheet
    total_assets: Optional[Decimal] = None
    current_assets: Optional[Decimal] = None
    non_current_assets: Optional[Decimal] = None
    total_liabilities: Optional[Decimal] = None
    current_liabilities: Optional[Decimal] = None
    non_current_liabilities: Optional[Decimal] = None
    total_equity: Optional[Decimal] = None

    # Cash Flow
    operating_cash_flow: Optional[Decimal] = None
    investing_cash_flow: Optional[Decimal] = None
    financing_cash_flow: Optional[Decimal] = None
    net_cash_change: Optional[Decimal] = None
    free_cash_flow: Optional[Decimal] = None

    class Config:
        from_attributes = True


class FinancialStatementsListResponse(BaseModel):
    """List of financial statements for a stock."""
    stock_id: UUID
    symbol: str
    statements: List[FinancialStatementResponse]
    period_type: str


# =====================================================
# RATINGS SCHEMAS
# =====================================================

class RatingMetric(BaseModel):
    """Single rating metric with Good/Bad status."""
    name: str
    category: str
    value: Optional[str] = None
    display_value: str
    status: str  # 'good', 'bad', 'neutral'
    description: Optional[str] = None


class StockRatingsResponse(BaseModel):
    """All computed ratings for a stock."""
    stock_id: UUID
    symbol: str
    growth_metrics: List[RatingMetric]
    stability_metrics: List[RatingMetric]
    valuation_metrics: List[RatingMetric]
    efficiency_metrics: List[RatingMetric]
    cash_flow_metrics: List[RatingMetric]
