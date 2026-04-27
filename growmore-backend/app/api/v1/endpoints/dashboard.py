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
    """Get commodity prices (gold, silver)."""
    from app.services.precious_metals_service import get_precious_metals_prices
    return await get_precious_metals_prices()


@router.get("/quick-stats")
async def get_quick_stats(
    current_user: User = Depends(get_current_user),
):
    """
    Get quick statistics for dashboard widgets.
    Lightweight endpoint for real-time stat updates.
    Resilient: a failure in one section returns zeros for that section, never 500s.
    """
    import logging
    log = logging.getLogger(__name__)
    db = get_supabase_service_client()

    # Resolve every plausible user identifier we may need to match (UUID columns vs text columns)
    user_uuid = str(current_user.id) if current_user.id else None
    user_fb = current_user.firebase_uid

    # ─── Market stats (no user dep) ─────────────────────────────────────────
    advancing = declining = total_stocks = 0
    try:
        stocks_result = db.table("stocks").select("change_percentage").execute()
        stocks = stocks_result.data or []
        total_stocks = len(stocks)
        advancing = sum(1 for s in stocks if float(s.get("change_percentage", 0) or 0) > 0)
        declining = sum(1 for s in stocks if float(s.get("change_percentage", 0) or 0) < 0)
    except Exception as e:
        log.warning(f"quick-stats market: {e}")

    # ─── Portfolio value (user-owned: try UUID first, fall back to firebase_uid) ──
    portfolio_value = total_invested = 0.0
    holdings_data = []
    for uid_val in (user_uuid, user_fb):
        if not uid_val:
            continue
        try:
            holdings_result = db.table("holdings").select(
                "symbol,quantity,average_price"
            ).eq("user_id", uid_val).execute()
            holdings_data = holdings_result.data or []
            break  # success — stop trying alternates
        except Exception as e:
            log.debug(f"quick-stats holdings with uid={uid_val}: {e}")
            holdings_data = []
            continue

    if holdings_data:
        try:
            symbols = list({h["symbol"] for h in holdings_data if h.get("symbol")})
            if symbols:
                prices_result = db.table("stocks").select("symbol,current_price").in_("symbol", symbols).execute()
                price_map = {s["symbol"]: float(s.get("current_price", 0) or 0) for s in (prices_result.data or [])}
                for h in holdings_data:
                    qty = int(h.get("quantity", 0) or 0)
                    avg = float(h.get("average_price", 0) or 0)
                    current = price_map.get(h.get("symbol", ""), avg)
                    portfolio_value += qty * current
                    total_invested += qty * avg
        except Exception as e:
            log.warning(f"quick-stats portfolio compute: {e}")

    # ─── Unread notifications (resilient) ──────────────────────────────────
    unread = 0
    try:
        from app.services.notification_service import NotificationService
        notif_service = NotificationService()
        # Try with UUID first, then firebase_uid
        for uid_val in (user_uuid, user_fb):
            if not uid_val:
                continue
            try:
                unread = await notif_service.get_unread_count(uid_val)
                break
            except Exception:
                continue
    except Exception as e:
        log.warning(f"quick-stats notifications: {e}")

    return {
        "market": {
            "total_stocks": total_stocks,
            "advancing": advancing,
            "declining": declining,
        },
        "portfolio": {
            "value": round(portfolio_value, 2),
            "invested": round(total_invested, 2),
            "gain_loss": round(portfolio_value - total_invested, 2),
        },
        "notifications": {
            "unread": unread or 0,
        },
    }
