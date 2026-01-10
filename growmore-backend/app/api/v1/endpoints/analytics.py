from fastapi import APIRouter, Depends, Query
from typing import List
from uuid import UUID

from app.core.dependencies import get_db, get_current_user
from app.services.analytics_service import AnalyticsService
from app.models.user import User

router = APIRouter()


@router.get("/market-overview")
async def get_market_overview(
    market_id: UUID,
    db=Depends(get_db),
):
    analytics_service = AnalyticsService(db)
    return await analytics_service.get_market_overview(market_id)


@router.get("/sector-performance")
async def get_sector_performance(
    market_id: UUID,
    db=Depends(get_db),
):
    analytics_service = AnalyticsService(db)
    return await analytics_service.get_sector_performance(market_id)


@router.get("/portfolio-summary")
async def get_portfolio_summary(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    analytics_service = AnalyticsService(db)
    return await analytics_service.get_portfolio_summary(current_user.id)


@router.get("/compare")
async def compare_assets(
    asset_type: str = Query(..., pattern="^(stock|commodity)$"),
    asset_ids: List[UUID] = Query(...),
    db=Depends(get_db),
):
    analytics_service = AnalyticsService(db)
    return await analytics_service.compare_assets(asset_type, asset_ids)
