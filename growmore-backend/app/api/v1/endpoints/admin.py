"""
Admin endpoints for manual scraping and system management.
These endpoints should be protected in production.
"""
from fastapi import APIRouter, BackgroundTasks
from typing import Literal

from app.scrapers.scheduler import get_scheduler

router = APIRouter()


@router.post("/scrape/{scraper_type}")
async def run_manual_scrape(
    scraper_type: Literal["stocks", "commodities", "news", "process", "all"],
    background_tasks: BackgroundTasks,
):
    """
    Manually trigger a scrape job.

    - stocks: Update all PSX stock prices
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
