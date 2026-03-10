from fastapi import APIRouter, Depends
from uuid import UUID

from app.core.dependencies import get_db, get_current_user
from app.services.analytics_service import AnalyticsService
from app.models.user import User

router = APIRouter()


@router.get("/portfolio-summary")
async def get_portfolio_summary(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    analytics_service = AnalyticsService(db)
    return await analytics_service.get_portfolio_summary(current_user.id)
