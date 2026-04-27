"""
GrowNews — AI-powered financial news endpoints.
Uses NewsAPI + CryptoPanic for real articles, OpenAI for AI summaries/sentiment.
"""
from typing import Optional
from fastapi import APIRouter, Query

from app.services.grow_news_service import GrowNewsService

router = APIRouter()


def _svc() -> GrowNewsService:
    return GrowNewsService()


@router.get("")
async def get_feed(
    category: str = Query(default="all"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=50),
):
    """Paginated news feed with AI sentiment per article."""
    return await _svc().get_feed(category=category, page=page, per_page=per_page)


@router.get("/featured")
async def get_featured():
    """Hero + featured articles (prefers articles with images)."""
    return await _svc().get_featured()


@router.get("/brief")
async def get_brief(category: str = Query(default="all")):
    """AI-generated market brief for a category (cached 30 min)."""
    return await _svc().get_brief(category=category)


@router.get("/trending")
async def get_trending():
    """Top business headlines from NewsAPI."""
    return await _svc().get_trending()


@router.get("/sentiment")
async def get_sentiment():
    """Aggregate sentiment from recently saved articles."""
    return await _svc().get_overall_sentiment()


@router.get("/search")
async def search_news(q: str = Query(..., min_length=1)):
    """Full-text search via NewsAPI."""
    return await _svc().search(query=q)
