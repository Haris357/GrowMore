"""
Commodities endpoints — live gold/silver prices and AI market analysis.
Uses external APIs (Yahoo Finance + exchange rates) instead of scrapers.
"""
from fastapi import APIRouter, Query
from typing import Literal

from app.services.precious_metals_service import (
    get_precious_metals_prices,
    get_price_history,
    get_market_analysis,
)

router = APIRouter()


@router.get("/prices")
async def get_prices():
    """
    Get live gold and silver prices in PKR.
    Returns per-tola, per-gram, and per-10g prices.
    Gold includes 24K, 22K, 21K, 18K purities.
    """
    return await get_precious_metals_prices()


@router.get("/history/{metal}")
async def get_metal_history(
    metal: Literal["gold", "silver"] = "gold",
    period: str = Query(default="1M", pattern="^(1W|1M|3M|6M|1Y)$"),
):
    """Get historical prices for gold or silver in PKR per tola."""
    return await get_price_history(metal, period)


@router.get("/analysis")
async def get_analysis():
    """
    Get AI-powered gold/silver market analysis.
    Uses OpenAI to generate insights about current market conditions.
    Cached for 1 hour.
    """
    return await get_market_analysis()


@router.get("/simple")
async def get_simple_guide():
    """
    Plain-English beginner guide for gold & silver: is today's price high or low
    versus the past year, what the metal is actually for, and simple pros/cons.
    Rule-based (no AI cost). Not investment advice.
    """
    from app.services.simple_verdict_service import get_commodity_simple
    return await get_commodity_simple()
