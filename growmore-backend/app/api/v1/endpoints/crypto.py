"""Crypto Market endpoints — CoinGecko + CryptoPanic integration."""
from typing import Optional

from fastapi import APIRouter, Query

from app.services.crypto_service import CryptoService

router = APIRouter()


def _svc() -> CryptoService:
    return CryptoService()


@router.get("/markets")
async def get_markets(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=250),
    search: Optional[str] = Query(default=None),
    sort: str = Query(default="market_cap_desc"),
    category: Optional[str] = Query(default=None),
):
    """Paginated coin list with prices, market cap, sparklines."""
    return await _svc().get_markets(page=page, per_page=per_page, search=search, sort=sort, category=category)


@router.get("/trending")
async def get_trending():
    """Top trending coins from CoinGecko."""
    return await _svc().get_trending()


@router.get("/global")
async def get_global_stats():
    """Global crypto market stats — total market cap, dominance, volume."""
    return await _svc().get_global()


@router.get("/news")
async def get_news(
    filter: str = Query(default="hot", pattern="^(hot|rising|bullish|bearish|important|lol)$"),
    currencies: Optional[str] = Query(default=None, description="Comma-separated coin codes e.g. BTC,ETH"),
):
    """Crypto news from CryptoPanic with sentiment."""
    return await _svc().get_news(filter=filter, currencies=currencies)


@router.get("/sentiment")
async def get_sentiment():
    """Market sentiment derived from news votes — bullish/bearish/neutral %."""
    return await _svc().get_sentiment()


@router.get("/coin/{coin_id}")
async def get_coin_detail(coin_id: str):
    """Full detail for a single coin."""
    return await _svc().get_coin_detail(coin_id)


@router.get("/coin/{coin_id}/chart")
async def get_coin_chart(
    coin_id: str,
    days: int = Query(default=7, ge=1, le=365),
):
    """Price/volume/market cap history for a coin."""
    return await _svc().get_coin_chart(coin_id, days)
