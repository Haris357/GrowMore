"""
Admin endpoints for manual scraping and system management.
These endpoints should be protected in production.
"""
from fastapi import APIRouter, BackgroundTasks, Depends, Query
from typing import Literal, Optional

from app.scrapers.scheduler import get_scheduler
from app.logging.service import logging_service
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


@router.post("/scrape/{scraper_type}")
async def run_manual_scrape(
    scraper_type: Literal["stocks", "stocks_full", "fundamentals", "financial_statements", "commodities", "news", "process", "all"],
    background_tasks: BackgroundTasks,
):
    """
    Manually trigger a scrape job.

    - stocks: Update all PSX stock prices (daily, fast)
    - stocks_full: Full scrape — prices + fundamentals + financials + logos (weekly)
    - fundamentals: Alias for stocks_full (backwards compatible)
    - financial_statements: Alias for stocks_full (backwards compatible)
    - commodities: Update gold/silver prices
    - news: Scrape news from all sources
    - process: Process unprocessed news with AI
    - all: Run all scrapers
    """
    scheduler = get_scheduler()

    # Run in background to avoid timeout
    background_tasks.add_task(scheduler.run_manual_scrape, scraper_type)

    return {
        "status": "started",
        "scraper_type": scraper_type,
        "message": f"Manual {scraper_type} scrape started in background"
    }


@router.get("/scheduler/status")
async def get_scheduler_status():
    """Get the current scheduler status and job information."""
    scheduler = get_scheduler()

    jobs = []
    if scheduler._is_running:
        for job in scheduler.scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
                "trigger": str(job.trigger),
            })

    return {
        "is_running": scheduler._is_running,
        "jobs": jobs,
    }


@router.post("/scheduler/start")
async def start_scheduler():
    """Start the scheduler if not already running."""
    scheduler = get_scheduler()

    if scheduler._is_running:
        return {"status": "already_running", "message": "Scheduler is already running"}

    scheduler.start()
    return {"status": "started", "message": "Scheduler started successfully"}


@router.post("/scheduler/stop")
async def stop_scheduler():
    """Stop the scheduler if running."""
    scheduler = get_scheduler()

    if not scheduler._is_running:
        return {"status": "not_running", "message": "Scheduler is not running"}

    scheduler.stop()
    return {"status": "stopped", "message": "Scheduler stopped successfully"}


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
    """Get API request logs with filtering."""
    return await logging_service.get_api_logs(
        page=page,
        page_size=page_size,
        method=method,
        status_code=status_code,
        path_contains=path_contains,
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
    """Get application error logs with filtering."""
    return await logging_service.get_error_logs(
        page=page,
        page_size=page_size,
        severity=severity,
        resolved=resolved,
        error_type=error_type,
    )


@router.post("/logs/errors/{error_id}/resolve")
async def resolve_error_log(
    error_id: str,
    current_user: User = Depends(get_current_user),
):
    """Mark an error as resolved."""
    return await logging_service.resolve_error(
        error_id=error_id,
        resolved_by=current_user.id,
    )


@router.get("/logs/audit")
async def get_audit_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    user_id: Optional[str] = Query(default=None),
    entity_type: Optional[str] = Query(default=None),
    action: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    """Get audit trail logs with filtering."""
    return await logging_service.get_audit_logs(
        page=page,
        page_size=page_size,
        user_id=user_id,
        entity_type=entity_type,
        action=action,
    )


@router.get("/logs/scrapers")
async def get_scraper_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    scraper_name: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    """Get scraper execution logs with filtering."""
    return await logging_service.get_scraper_logs(
        page=page,
        page_size=page_size,
        scraper_name=scraper_name,
        status=status,
    )


@router.get("/logs/ai")
async def get_ai_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    service: Optional[str] = Query(default=None),
    feature: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    """Get AI service usage logs with filtering."""
    return await logging_service.get_ai_logs(
        page=page,
        page_size=page_size,
        service=service,
        feature=feature,
    )


@router.get("/logs/ai/stats")
async def get_ai_usage_stats(
    current_user: User = Depends(get_current_user),
):
    """Get AI usage statistics."""
    return await logging_service.get_ai_usage_stats()


@router.get("/logs/jobs")
async def get_job_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    job_name: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    """Get background job logs with filtering."""
    return await logging_service.get_job_logs(
        page=page,
        page_size=page_size,
        job_name=job_name,
        status=status,
    )


# ==================== Dashboard Stats ====================

@router.get("/stats/overview")
async def get_admin_stats(
    current_user: User = Depends(get_current_user),
):
    """Get admin dashboard overview statistics."""
    from app.db.supabase import get_supabase_service_client
    db = get_supabase_service_client()

    # Get counts from various tables
    users_result = db.table("users").select("id", count="exact").execute()
    portfolios_result = db.table("portfolios").select("id", count="exact").execute()
    transactions_result = db.table("transactions").select("id", count="exact").execute()
    stocks_result = db.table("stocks").select("symbol", count="exact").execute()
    news_result = db.table("news_articles").select("id", count="exact").execute()

    # Get recent error count
    error_result = db.table("error_logs").select("id", count="exact").eq("resolved", False).execute()

    # Get scheduler status
    scheduler = get_scheduler()
    scheduler_status = {
        "is_running": scheduler._is_running,
        "job_count": len(scheduler.scheduler.get_jobs()) if scheduler._is_running else 0,
    }

    return {
        "users": {
            "total": users_result.count or 0,
        },
        "portfolios": {
            "total": portfolios_result.count or 0,
        },
        "transactions": {
            "total": transactions_result.count or 0,
        },
        "stocks": {
            "total": stocks_result.count or 0,
        },
        "news": {
            "total": news_result.count or 0,
        },
        "errors": {
            "unresolved": error_result.count or 0,
        },
        "scheduler": scheduler_status,
    }
