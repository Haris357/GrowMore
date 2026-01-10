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


class ScreenerFilterResponse(BaseModel):
    name: str
    code: str
    category: str
    data_type: str
    field_path: str
    description: Optional[str] = None


class StrategyResponse(BaseModel):
    name: str
    slug: str
    description: str
    icon: str
    filters: Dict[str, Any]
    is_featured: bool = False


class StockResult(BaseModel):
    id: str
    company_id: str
    symbol: str
    name: str
    sector: Optional[str] = None
    sector_code: Optional[str] = None
    current_price: Optional[float] = None
    change_amount: Optional[float] = None
    change_percentage: Optional[float] = None
    volume: Optional[int] = None
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    eps: Optional[float] = None
    dividend_yield: Optional[float] = None


class ScreenResultResponse(BaseModel):
    stocks: List[StockResult]
    count: int
    filters_applied: Dict[str, Any]
    limit: int
    offset: int


# Endpoints
@router.get("/filters", response_model=List[ScreenerFilterResponse])
async def get_screener_filters():
    """Get all available screener filters."""
    service = ScreenerService()
    return service.get_filters()


@router.get("/filters/categories")
async def get_filter_categories():
    """Get filter categories with their filters."""
    service = ScreenerService()
    return service.get_filter_categories()


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


# Quick access endpoints
@router.get("/top-gainers", response_model=ScreenResultResponse)
async def get_top_gainers(
    limit: int = Query(20, le=50),
    market_id: Optional[str] = None,
):
    """Get top gaining stocks today."""
    service = ScreenerService()
    return await service.run_screen(
        filters={
            "change_pct": {"min": 0},
            "sort": "change_pct_desc",
            "limit": limit,
        },
        market_id=market_id,
    )


@router.get("/top-losers", response_model=ScreenResultResponse)
async def get_top_losers(
    limit: int = Query(20, le=50),
    market_id: Optional[str] = None,
):
    """Get top losing stocks today."""
    service = ScreenerService()
    return await service.run_screen(
        filters={
            "change_pct": {"max": 0},
            "sort": "change_pct_asc",
            "limit": limit,
        },
        market_id=market_id,
    )


@router.get("/most-active", response_model=ScreenResultResponse)
async def get_most_active(
    limit: int = Query(20, le=50),
    market_id: Optional[str] = None,
):
    """Get most actively traded stocks today."""
    service = ScreenerService()
    return await service.run_screen(
        filters={
            "sort": "volume_desc",
            "limit": limit,
        },
        market_id=market_id,
    )


@router.get("/high-dividend", response_model=ScreenResultResponse)
async def get_high_dividend(
    min_yield: float = Query(5.0, description="Minimum dividend yield"),
    limit: int = Query(20, le=50),
    market_id: Optional[str] = None,
):
    """Get high dividend yield stocks."""
    service = ScreenerService()
    return await service.run_screen(
        filters={
            "div_yield": {"min": min_yield},
            "sort": "div_yield_desc",
            "limit": limit,
        },
        market_id=market_id,
    )
