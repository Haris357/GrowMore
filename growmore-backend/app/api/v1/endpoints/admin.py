"""
Admin endpoints for system management and logging.
These endpoints should be protected in production.
"""
from fastapi import APIRouter, BackgroundTasks, Depends, Query
from typing import Literal, Optional

from app.logging.service import logging_service
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


@router.post("/sync/{sync_type}")
async def run_manual_sync(
    sync_type: Literal["stocks", "stocks_full", "stocks_intraday", "stocks_history", "fundamentals", "financial_statements", "all"],
    background_tasks: BackgroundTasks,
):
    """
    Manually trigger a PSX data sync job.

    - stocks: Update all PSX stock prices (daily, fast)
    - stocks_full: Full sync — prices + fundamentals + financials + logos
    - stocks_history: Backfill 2 years of daily OHLCV history for all stocks
    - fundamentals: Alias for stocks_full
    - financial_statements: Alias for stocks_full
    - all: Full sync + history backfill (runs everything)
    """
    from app.services.psx import PSXSyncService

    async def _run_sync():
        sync = PSXSyncService()
        if sync_type in ("stocks", "stocks_intraday"):
            await sync.sync_daily_prices()
        elif sync_type in ("stocks_full", "fundamentals", "financial_statements"):
            await sync.sync_full()
        elif sync_type == "stocks_history":
            await sync.sync_history_backfill()
        elif sync_type == "all":
            await sync.sync_full()
            await sync.sync_history_backfill()
            await sync.sync_daily_prices()

    background_tasks.add_task(_run_sync)

    return {
        "status": "started",
        "sync_type": sync_type,
        "message": f"Manual {sync_type} sync started in background"
    }


# ==================== Logs Endpoints ====================

@router.get("/logs/api")
async def get_api_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    method: Optional[str] = Query(default=None),
    status_code: Optional[int] = Query(default=None),
    path_contains: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    return await logging_service.get_api_logs(
        page=page, page_size=page_size, method=method,
        status_code=status_code, path_contains=path_contains,
    )


@router.get("/logs/errors")
async def get_error_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    severity: Optional[str] = Query(default=None),
    resolved: Optional[bool] = Query(default=None),
    error_type: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    return await logging_service.get_error_logs(
        page=page, page_size=page_size, severity=severity,
        resolved=resolved, error_type=error_type,
    )


@router.post("/logs/errors/{error_id}/resolve")
async def resolve_error_log(
    error_id: str,
    current_user: User = Depends(get_current_user),
):
    return await logging_service.resolve_error(error_id=error_id, resolved_by=current_user.id)


@router.get("/logs/audit")
async def get_audit_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    user_id: Optional[str] = Query(default=None),
    entity_type: Optional[str] = Query(default=None),
    action: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    return await logging_service.get_audit_logs(
        page=page, page_size=page_size, user_id=user_id,
        entity_type=entity_type, action=action,
    )


@router.get("/logs/scrapers")
async def get_scraper_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    scraper_name: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    return await logging_service.get_scraper_logs(
        page=page, page_size=page_size, scraper_name=scraper_name, status=status,
    )


@router.get("/logs/ai")
async def get_ai_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    service: Optional[str] = Query(default=None),
    feature: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    return await logging_service.get_ai_logs(
        page=page, page_size=page_size, service=service, feature=feature,
    )


@router.get("/logs/ai/stats")
async def get_ai_usage_stats(current_user: User = Depends(get_current_user)):
    return await logging_service.get_ai_usage_stats()


@router.get("/logs/jobs")
async def get_job_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    job_name: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    return await logging_service.get_job_logs(
        page=page, page_size=page_size, job_name=job_name, status=status,
    )


# ==================== Dashboard Stats ====================

@router.get("/stats/overview")
async def get_admin_stats(current_user: User = Depends(get_current_user)):
    from app.db.supabase import get_supabase_service_client
    db = get_supabase_service_client()

    users_result = db.table("users").select("id", count="exact").execute()
    portfolios_result = db.table("portfolios").select("id", count="exact").execute()
    transactions_result = db.table("transactions").select("id", count="exact").execute()
    stocks_result = db.table("stocks").select("symbol", count="exact").execute()
    news_result = db.table("news_articles").select("id", count="exact").execute()
    error_result = db.table("error_logs").select("id", count="exact").eq("resolved", False).execute()

    return {
        "users": {"total": users_result.count or 0},
        "portfolios": {"total": portfolios_result.count or 0},
        "transactions": {"total": transactions_result.count or 0},
        "stocks": {"total": stocks_result.count or 0},
        "news": {"total": news_result.count or 0},
        "errors": {"unresolved": error_result.count or 0},
    }
