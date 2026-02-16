"""
Dashboard API Endpoints.
Comprehensive dashboard data and analytics.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import get_current_user
from app.db.supabase import get_supabase_service_client
from app.services.analytics_service import AnalyticsService
from app.models.user import User

router = APIRouter()


def get_analytics_service():
    """Get analytics service instance."""
    db = get_supabase_service_client()
    return AnalyticsService(db)


@router.get("/summary")
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
):
    """
    Get complete dashboard summary.

    Includes:
    - Portfolio overview (total value, gain/loss)
    - Market indices and breadth
    - Goals progress
    - Notification counts
    """
    service = get_analytics_service()
    return await service.get_dashboard_summary(current_user.firebase_uid)


@router.get("/market")
async def get_market_overview():
    """
    Get comprehensive market overview.

    Includes:
    - Market statistics (advancing/declining/unchanged)
    - Top gainers and losers
    - Most active stocks
    - Sector performance
    - Market indices
    - Commodity prices
    """
    service = get_analytics_service()
    return await service.get_comprehensive_market_overview()


@router.get("/portfolio")
async def get_portfolio_analytics(
    portfolio_id: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed portfolio analytics.

    Includes:
    - Portfolio summary (value, invested, gain/loss)
    - Asset allocation breakdown
    - Sector breakdown
    - Risk metrics
    - Top and worst performers
    """
    service = get_analytics_service()
    return await service.get_portfolio_analytics(
        user_id=current_user.firebase_uid,
        portfolio_id=portfolio_id,
    )


@router.get("/sectors")
async def get_sector_analysis():
    """
    Get sector performance analysis.

    Shows each sector's average performance, advancing/declining counts.
    """
    service = get_analytics_service()
    overview = await service.get_comprehensive_market_overview()
    return {
        "sectors": overview.get("sector_performance", []),
        "timestamp": overview.get("timestamp"),
    }


@router.get("/movers")
async def get_market_movers(
    limit: int = Query(default=10, ge=1, le=50),
):
    """
    Get top market movers.

    Returns top gainers, losers, and most active stocks.
    """
    service = get_analytics_service()
    overview = await service.get_comprehensive_market_overview()

    return {
        "top_gainers": overview.get("top_gainers", [])[:limit],
        "top_losers": overview.get("top_losers", [])[:limit],
        "most_active": overview.get("most_active", [])[:limit],
        "timestamp": overview.get("timestamp"),
    }


@router.get("/indices")
async def get_market_indices():
    """Get market indices data."""
    db = get_supabase_service_client()
    result = db.table("market_indices").select("*").execute()
    return {
        "indices": result.data or [],
    }


@router.get("/commodities")
async def get_commodities():
    """Get commodity prices (gold, silver, etc.)."""
    db = get_supabase_service_client()
    result = db.table("commodities").select("*").execute()
    return {
        "commodities": result.data or [],
    }


@router.get("/quick-stats")
async def get_quick_stats(
    current_user: User = Depends(get_current_user),
):
    """
    Get quick statistics for dashboard widgets.

    Lightweight endpoint for real-time stat updates.
    """
    db = get_supabase_service_client()

    # Market stats
    stocks_result = db.table("stocks").select("change_percentage").execute()
    stocks = stocks_result.data or []
    advancing = sum(1 for s in stocks if float(s.get("change_percentage", 0) or 0) > 0)
    declining = sum(1 for s in stocks if float(s.get("change_percentage", 0) or 0) < 0)

    # User holdings value
    holdings_result = db.table("holdings").select(
        "symbol,quantity,average_price"
    ).eq("user_id", current_user.firebase_uid).execute()

    holdings_data = holdings_result.data or []
    portfolio_value = 0
    total_invested = 0

    if holdings_data:
        symbols = list({h["symbol"] for h in holdings_data if h.get("symbol")})
        prices_result = db.table("stocks").select("symbol,current_price").in_("symbol", symbols).execute()
        price_map = {s["symbol"]: float(s.get("current_price", 0) or 0) for s in (prices_result.data or [])}

        for h in holdings_data:
            qty = int(h.get("quantity", 0))
            avg = float(h.get("average_price", 0))
            current = price_map.get(h.get("symbol", ""), avg)
            portfolio_value += qty * current
            total_invested += qty * avg

    # Unread notifications
    from app.services.notification_service import NotificationService
    notif_service = NotificationService()
    unread = await notif_service.get_unread_count(current_user.firebase_uid)

    return {
        "market": {
            "total_stocks": len(stocks),
            "advancing": advancing,
            "declining": declining,
        },
        "portfolio": {
            "value": round(portfolio_value, 2),
            "invested": round(total_invested, 2),
            "gain_loss": round(portfolio_value - total_invested, 2),
        },
        "notifications": {
            "unread": unread,
        },
    }
