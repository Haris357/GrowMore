from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    markets,
    stocks,
    commodities,
    news,
    portfolio,
    watchlist,
    analytics,
    search,
    # Part 2: Advanced Features
    screener,
    goals,
    personalization,
    notifications,
    dashboard,
    websocket,
    # Part 3: Email, Newsletters, Logging & Exports
    newsletter,
    security,
    exports,
    health,
    # Crypto
    crypto,
    # Admin
    admin,
)

api_router = APIRouter()

# Core endpoints
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(markets.router, prefix="/markets", tags=["Markets"])
api_router.include_router(stocks.router, prefix="/stocks", tags=["Stocks"])
api_router.include_router(commodities.router, prefix="/commodities", tags=["Commodities"])
api_router.include_router(news.router, prefix="/news", tags=["News"])
api_router.include_router(portfolio.router, prefix="/portfolios", tags=["Portfolio"])
api_router.include_router(watchlist.router, prefix="/watchlists", tags=["Watchlist"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(search.router, prefix="/search", tags=["Search"])

# Part 2: Advanced Features
api_router.include_router(screener.router, prefix="/screener", tags=["Stock Screener"])
api_router.include_router(goals.router, prefix="/goals", tags=["Investment Goals"])
api_router.include_router(personalization.router, prefix="/personalization", tags=["Personalization"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])

# Part 3: Email, Newsletters, Logging & Exports
api_router.include_router(newsletter.router, prefix="/newsletter", tags=["Newsletter"])
api_router.include_router(security.router, prefix="/security", tags=["Security"])
api_router.include_router(exports.router, prefix="/exports", tags=["Exports"])
api_router.include_router(health.router, tags=["Health & Monitoring"])

# Crypto Market
api_router.include_router(crypto.router, prefix="/crypto", tags=["Crypto Market"])

# Admin endpoints for system management
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
