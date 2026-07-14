"""
Stock Screener API Endpoints.
"""

from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.dependencies import get_current_user, get_current_user_optional
from app.services.screener_service import ScreenerService

router = APIRouter()


# Request/Response Models
class FilterRange(BaseModel):
    min: Optional[float] = None
    max: Optional[float] = None


class ScreenerFilters(BaseModel):
    price: Optional[FilterRange] = None
    change_pct: Optional[FilterRange] = None
    market_cap: Optional[FilterRange] = None
    pe_ratio: Optional[FilterRange] = None
    eps: Optional[FilterRange] = None
    div_yield: Optional[FilterRange] = None
    volume: Optional[FilterRange] = None
    roe: Optional[FilterRange] = None
    debt_equity: Optional[FilterRange] = None
    sector: Optional[str] = None
    sector_code: Optional[str] = None
    sort: Optional[str] = "change_pct_desc"
    limit: Optional[int] = 50

    class Config:
        extra = "allow"  # Allow additional filter fields


class RunScreenRequest(BaseModel):
    filters: Dict[str, Any]
    market_id: Optional[str] = None
    limit: int = Field(default=50, le=100)
    offset: int = Field(default=0, ge=0)


class SaveScreenRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    filters: Dict[str, Any]
    notifications_enabled: bool = False


class StrategyResponse(BaseModel):
    name: str
    slug: str
    description: str
    icon: str
    filters: Dict[str, Any]
    is_featured: bool = False


class StockResult(BaseModel):
    id: str
    company_id: Optional[str] = None
    symbol: str
    name: str
    logo_url: Optional[str] = None
    sector: Optional[str] = None
    sector_name: Optional[str] = None
    sector_code: Optional[str] = None

    # Price Data
    current_price: Optional[float] = None
    change_amount: Optional[float] = None
    change_percentage: Optional[float] = None
    open_price: Optional[float] = None
    high_price: Optional[float] = None
    low_price: Optional[float] = None
    previous_close: Optional[float] = None
    volume: Optional[int] = None
    avg_volume: Optional[int] = None

    # 52 Week
    week_52_high: Optional[float] = None
    week_52_low: Optional[float] = None

    # Valuation
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    ps_ratio: Optional[float] = None
    peg_ratio: Optional[float] = None
    ev_ebitda: Optional[float] = None

    # Per Share
    eps: Optional[float] = None
    book_value: Optional[float] = None
    dps: Optional[float] = None
    dividend_yield: Optional[float] = None

    # Profitability
    roe: Optional[float] = None
    roa: Optional[float] = None
    roce: Optional[float] = None
    gross_margin: Optional[float] = None
    operating_margin: Optional[float] = None
    net_margin: Optional[float] = None
    profit_margin: Optional[float] = None

    # Leverage
    debt_to_equity: Optional[float] = None
    debt_to_assets: Optional[float] = None
    current_ratio: Optional[float] = None
    quick_ratio: Optional[float] = None
    interest_coverage: Optional[float] = None

    # Growth
    revenue_growth: Optional[float] = None
    earnings_growth: Optional[float] = None
    profit_growth: Optional[float] = None

    # Other
    beta: Optional[float] = None
    payout_ratio: Optional[float] = None
    fcf_yield: Optional[float] = None

    last_updated: Optional[str] = None


class ScreenResultResponse(BaseModel):
    stocks: List[StockResult]
    count: int
    total_count: Optional[int] = None
    filters_applied: Dict[str, Any]
    limit: int
    offset: int


# Endpoints
@router.get("/sectors")
async def get_sectors():
    """Distinct sector names (as stored) for the filter sidebar."""
    return {"sectors": ScreenerService().get_active_sectors()}


@router.get("/strategies", response_model=List[StrategyResponse])
async def get_strategies(
    featured_only: bool = Query(False, description="Only return featured strategies"),
):
    """Get pre-built screening strategies."""
    service = ScreenerService()
    return service.get_strategies(featured_only=featured_only)


@router.get("/strategies/{slug}", response_model=StrategyResponse)
async def get_strategy(slug: str):
    """Get a specific strategy by slug."""
    service = ScreenerService()
    strategy = service.get_strategy(slug)
    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy not found",
        )
    return strategy


@router.post("/run", response_model=ScreenResultResponse)
async def run_screen(
    request: RunScreenRequest,
    current_user: Optional[Dict] = Depends(get_current_user_optional),
):
    """
    Run a stock screen with custom filters.

    Available filters:
    - price: {min, max} - Stock price range
    - change_pct: {min, max} - Daily change percentage
    - market_cap: {min, max} - Market capitalization
    - pe_ratio: {min, max} - P/E ratio
    - div_yield: {min, max} - Dividend yield
    - volume: {min, max} - Trading volume
    - sector_code: string - Sector code (e.g., "BANK", "CEMENT")
    - sort: string - Sort order (e.g., "change_pct_desc", "volume_desc")
    - limit: int - Max results (default 50, max 100)
    """
    service = ScreenerService()
    result = await service.run_screen(
        filters=request.filters,
        market_id=request.market_id,
        limit=request.limit,
        offset=request.offset,
    )

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"],
        )

    return result


@router.post("/strategies/{slug}/run", response_model=ScreenResultResponse)
async def run_strategy(
    slug: str,
    market_id: Optional[str] = Query(None, description="Market ID to filter by"),
):
    """Run a pre-built strategy."""
    service = ScreenerService()
    result = await service.run_strategy(slug=slug, market_id=market_id)

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["error"],
        )

    return result


@router.get("/saved")
async def get_saved_screens(
    current_user: Dict = Depends(get_current_user),
):
    """Get user's saved screens."""
    service = ScreenerService()
    screens = await service.get_user_screens(user_id=current_user["id"])
    return {"screens": screens}


@router.post("/saved")
async def save_screen(
    request: SaveScreenRequest,
    current_user: Dict = Depends(get_current_user),
):
    """Save a custom screen."""
    service = ScreenerService()
    result = await service.save_user_screen(
        user_id=current_user["id"],
        name=request.name,
        filters=request.filters,
        notifications_enabled=request.notifications_enabled,
    )
    return result


@router.delete("/saved/{screen_id}")
async def delete_saved_screen(
    screen_id: str,
    current_user: Dict = Depends(get_current_user),
):
    """Delete a saved screen."""
    service = ScreenerService()
    success = await service.delete_user_screen(
        user_id=current_user["id"],
        screen_id=screen_id,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Screen not found",
        )

    return {"message": "Screen deleted"}


@router.post("/saved/{screen_id}/run", response_model=ScreenResultResponse)
async def run_saved_screen(
    screen_id: str,
    current_user: Dict = Depends(get_current_user),
):
    """Run a saved screen."""
    service = ScreenerService()
    result = await service.run_saved_screen(
        user_id=current_user["id"],
        screen_id=screen_id,
    )

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"],
        )

    return result
