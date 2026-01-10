"""
Stock Screener Service - Filter and screen stocks based on criteria.
"""

import logging
from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime

from app.db.supabase import get_supabase_service_client

logger = logging.getLogger(__name__)


# Screener Filter Definitions
SCREENER_FILTERS = [
    {"name": "Price", "code": "price", "category": "price", "data_type": "range", "field_path": "stocks.current_price", "description": "Current stock price"},
    {"name": "Price Change %", "code": "change_pct", "category": "price", "data_type": "range", "field_path": "stocks.change_percentage", "description": "Daily price change percentage"},
    {"name": "Market Cap", "code": "market_cap", "category": "fundamentals", "data_type": "range", "field_path": "stocks.market_cap", "description": "Market capitalization"},
    {"name": "P/E Ratio", "code": "pe_ratio", "category": "valuation", "data_type": "range", "field_path": "stocks.pe_ratio", "description": "Price to Earnings ratio"},
    {"name": "EPS", "code": "eps", "category": "fundamentals", "data_type": "range", "field_path": "stocks.eps", "description": "Earnings per share"},
    {"name": "Dividend Yield", "code": "div_yield", "category": "dividends", "data_type": "range", "field_path": "stocks.dividend_yield", "description": "Annual dividend yield percentage"},
    {"name": "Volume", "code": "volume", "category": "trading", "data_type": "range", "field_path": "stocks.volume", "description": "Trading volume"},
    {"name": "52 Week High", "code": "week_52_high", "category": "price", "data_type": "range", "field_path": "stocks.week_52_high", "description": "52 week high price"},
    {"name": "52 Week Low", "code": "week_52_low", "category": "price", "data_type": "range", "field_path": "stocks.week_52_low", "description": "52 week low price"},
    {"name": "Sector", "code": "sector", "category": "classification", "data_type": "select", "field_path": "companies.sector_id", "description": "Business sector"},
    {"name": "ROE", "code": "roe", "category": "profitability", "data_type": "range", "field_path": "stock_financials.roe", "description": "Return on Equity"},
    {"name": "Debt to Equity", "code": "debt_equity", "category": "financial_health", "data_type": "range", "field_path": "stock_financials.debt_to_equity", "description": "Debt to Equity ratio"},
    {"name": "Net Margin", "code": "net_margin", "category": "profitability", "data_type": "range", "field_path": "stock_financials.net_margin", "description": "Net profit margin percentage"},
    {"name": "Current Ratio", "code": "current_ratio", "category": "financial_health", "data_type": "range", "field_path": "stock_financials.current_ratio", "description": "Current assets to current liabilities"},
]

# Pre-built Screening Strategies
PRESET_STRATEGIES = [
    {
        "name": "Beginner's Safe Start",
        "slug": "beginners-safe-start",
        "description": "Low debt, growing profits, reasonable price. Perfect for first investments.",
        "icon": "shield",
        "filters": {
            "debt_equity": {"max": 0.5},
            "pe_ratio": {"max": 15},
            "div_yield": {"min": 3},
        },
        "is_featured": True,
    },
    {
        "name": "Dividend Income",
        "slug": "dividend-income",
        "description": "High dividend yield (8%+) for regular cash income.",
        "icon": "money-bag",
        "filters": {
            "div_yield": {"min": 8},
        },
        "is_featured": True,
    },
    {
        "name": "Warren Buffett Style",
        "slug": "warren-buffett-style",
        "description": "Quality companies at fair prices - low P/E, low debt, high ROE.",
        "icon": "star",
        "filters": {
            "pe_ratio": {"max": 15},
            "debt_equity": {"max": 0.5},
            "roe": {"min": 15},
        },
        "is_featured": True,
    },
    {
        "name": "Undervalued Gems",
        "slug": "undervalued-gems",
        "description": "Stocks trading below intrinsic value with dividends.",
        "icon": "gem",
        "filters": {
            "pe_ratio": {"max": 12},
            "div_yield": {"min": 3},
            "roe": {"min": 10},
        },
        "is_featured": False,
    },
    {
        "name": "Growth Rockets",
        "slug": "growth-rockets",
        "description": "High growth companies with strong momentum.",
        "icon": "rocket",
        "filters": {
            "change_pct": {"min": 0},
            "roe": {"min": 15},
        },
        "is_featured": False,
    },
    {
        "name": "Top Gainers Today",
        "slug": "top-gainers-today",
        "description": "Stocks with highest gains today.",
        "icon": "trending-up",
        "filters": {
            "change_pct": {"min": 0},
            "sort": "change_pct_desc",
            "limit": 20,
        },
        "is_featured": True,
    },
    {
        "name": "Top Losers Today",
        "slug": "top-losers-today",
        "description": "Biggest decliners - potential bounce candidates.",
        "icon": "trending-down",
        "filters": {
            "change_pct": {"max": 0},
            "sort": "change_pct_asc",
            "limit": 20,
        },
        "is_featured": True,
    },
    {
        "name": "Most Active",
        "slug": "most-active",
        "description": "Highest volume stocks today.",
        "icon": "activity",
        "filters": {
            "sort": "volume_desc",
            "limit": 20,
        },
        "is_featured": True,
    },
    {
        "name": "Banking Sector",
        "slug": "banking-sector",
        "description": "All banking sector stocks.",
        "icon": "bank",
        "filters": {
            "sector_code": "BANK",
        },
        "is_featured": False,
    },
    {
        "name": "High Dividend Banks",
        "slug": "high-dividend-banks",
        "description": "Banking stocks with high dividend yields.",
        "icon": "percent",
        "filters": {
            "sector_code": "BANK",
            "div_yield": {"min": 5},
        },
        "is_featured": False,
    },
]


class ScreenerService:
    """
    Stock screening service with filters and strategies.
    """

    def __init__(self):
        self.db = get_supabase_service_client()

    def get_filters(self) -> List[Dict[str, Any]]:
        """Get all available screener filters."""
        return SCREENER_FILTERS

    def get_filter_categories(self) -> List[Dict[str, Any]]:
        """Get filter categories."""
        categories = {}
        for f in SCREENER_FILTERS:
            cat = f["category"]
            if cat not in categories:
                categories[cat] = {
                    "code": cat,
                    "name": cat.replace("_", " ").title(),
                    "filters": [],
                }
            categories[cat]["filters"].append(f["code"])
        return list(categories.values())

    def get_strategies(self, featured_only: bool = False) -> List[Dict[str, Any]]:
        """Get pre-built screening strategies."""
        strategies = PRESET_STRATEGIES
        if featured_only:
            strategies = [s for s in strategies if s.get("is_featured", False)]
        return strategies

    def get_strategy(self, slug: str) -> Optional[Dict[str, Any]]:
        """Get a specific strategy by slug."""
        for strategy in PRESET_STRATEGIES:
            if strategy["slug"] == slug:
                return strategy
        return None

    async def run_screen(
        self,
        filters: Dict[str, Any],
        market_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Run a stock screen with given filters.

        Args:
            filters: Dictionary of filter conditions
            market_id: Optional market ID to filter by
            limit: Maximum results to return
            offset: Pagination offset

        Returns:
            Dictionary with stocks list and metadata
        """
        try:
            # Start with base query
            query = self.db.table("stocks").select(
                "*, companies!inner(id, symbol, name, sector_id, market_id, sectors(id, name, code))"
            )

            # Apply market filter
            if market_id:
                query = query.eq("companies.market_id", market_id)

            # Apply each filter
            for filter_code, filter_value in filters.items():
                query = self._apply_filter(query, filter_code, filter_value)

            # Apply sorting
            sort_field, sort_order = self._get_sort_params(filters)
            if sort_order == "asc":
                query = query.order(sort_field, desc=False)
            else:
                query = query.order(sort_field, desc=True)

            # Apply limit from filters or default
            result_limit = filters.get("limit", limit)
            query = query.range(offset, offset + result_limit - 1)

            # Execute query
            result = query.execute()
            stocks = result.data or []

            # Format results
            formatted_stocks = []
            for stock in stocks:
                company = stock.get("companies", {})
                sector = company.get("sectors", {}) if company else {}

                formatted_stocks.append({
                    "id": stock.get("id"),
                    "company_id": company.get("id"),
                    "symbol": company.get("symbol"),
                    "name": company.get("name"),
                    "sector": sector.get("name"),
                    "sector_code": sector.get("code"),
                    "current_price": stock.get("current_price"),
                    "change_amount": stock.get("change_amount"),
                    "change_percentage": stock.get("change_percentage"),
                    "volume": stock.get("volume"),
                    "market_cap": stock.get("market_cap"),
                    "pe_ratio": stock.get("pe_ratio"),
                    "eps": stock.get("eps"),
                    "dividend_yield": stock.get("dividend_yield"),
                    "week_52_high": stock.get("week_52_high"),
                    "week_52_low": stock.get("week_52_low"),
                    "last_updated": stock.get("last_updated"),
                })

            return {
                "stocks": formatted_stocks,
                "count": len(formatted_stocks),
                "filters_applied": filters,
                "limit": result_limit,
                "offset": offset,
            }

        except Exception as e:
            logger.error(f"Error running screen: {e}")
            return {
                "stocks": [],
                "count": 0,
                "error": str(e),
            }

    def _apply_filter(self, query, filter_code: str, filter_value: Any):
        """Apply a single filter to the query."""
        # Handle special filters
        if filter_code in ["sort", "limit", "offset"]:
            return query

        # Sector filter
        if filter_code == "sector_code":
            return query.eq("companies.sectors.code", filter_value)

        if filter_code == "sector":
            return query.eq("companies.sector_id", filter_value)

        # Range filters
        if isinstance(filter_value, dict):
            if "min" in filter_value:
                field = self._get_field_name(filter_code)
                if field:
                    query = query.gte(field, filter_value["min"])
            if "max" in filter_value:
                field = self._get_field_name(filter_code)
                if field:
                    query = query.lte(field, filter_value["max"])
            return query

        # Direct value filter
        field = self._get_field_name(filter_code)
        if field:
            query = query.eq(field, filter_value)

        return query

    def _get_field_name(self, filter_code: str) -> Optional[str]:
        """Get database field name from filter code."""
        field_map = {
            "price": "current_price",
            "change_pct": "change_percentage",
            "market_cap": "market_cap",
            "pe_ratio": "pe_ratio",
            "eps": "eps",
            "div_yield": "dividend_yield",
            "volume": "volume",
            "week_52_high": "week_52_high",
            "week_52_low": "week_52_low",
        }
        return field_map.get(filter_code)

    def _get_sort_params(self, filters: Dict[str, Any]) -> tuple:
        """Get sort field and order from filters."""
        sort = filters.get("sort", "change_pct_desc")

        sort_map = {
            "change_pct_desc": ("change_percentage", "desc"),
            "change_pct_asc": ("change_percentage", "asc"),
            "volume_desc": ("volume", "desc"),
            "volume_asc": ("volume", "asc"),
            "price_desc": ("current_price", "desc"),
            "price_asc": ("current_price", "asc"),
            "market_cap_desc": ("market_cap", "desc"),
            "market_cap_asc": ("market_cap", "asc"),
            "div_yield_desc": ("dividend_yield", "desc"),
            "pe_ratio_asc": ("pe_ratio", "asc"),
        }

        return sort_map.get(sort, ("change_percentage", "desc"))

    async def save_user_screen(
        self,
        user_id: str,
        name: str,
        filters: Dict[str, Any],
        notifications_enabled: bool = False,
    ) -> Dict[str, Any]:
        """Save a custom screen for a user."""
        try:
            result = self.db.table("user_saved_screens").insert({
                "user_id": user_id,
                "name": name,
                "filters": filters,
                "notifications_enabled": notifications_enabled,
            }).execute()

            return result.data[0] if result.data else {}

        except Exception as e:
            logger.error(f"Error saving screen: {e}")
            raise

    async def get_user_screens(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all saved screens for a user."""
        try:
            result = self.db.table("user_saved_screens").select("*").eq(
                "user_id", user_id
            ).order("created_at", desc=True).execute()

            return result.data or []

        except Exception as e:
            logger.error(f"Error getting user screens: {e}")
            return []

    async def delete_user_screen(self, user_id: str, screen_id: str) -> bool:
        """Delete a saved screen."""
        try:
            self.db.table("user_saved_screens").delete().eq(
                "id", screen_id
            ).eq("user_id", user_id).execute()
            return True

        except Exception as e:
            logger.error(f"Error deleting screen: {e}")
            return False

    async def run_saved_screen(
        self,
        user_id: str,
        screen_id: str,
    ) -> Dict[str, Any]:
        """Run a saved screen."""
        try:
            # Get saved screen
            result = self.db.table("user_saved_screens").select("*").eq(
                "id", screen_id
            ).eq("user_id", user_id).execute()

            if not result.data:
                return {"error": "Screen not found"}

            screen = result.data[0]

            # Update last run time
            self.db.table("user_saved_screens").update({
                "last_run_at": datetime.utcnow().isoformat()
            }).eq("id", screen_id).execute()

            # Run the screen
            return await self.run_screen(filters=screen.get("filters", {}))

        except Exception as e:
            logger.error(f"Error running saved screen: {e}")
            return {"error": str(e)}

    async def run_strategy(self, slug: str, market_id: Optional[str] = None) -> Dict[str, Any]:
        """Run a pre-built strategy."""
        strategy = self.get_strategy(slug)
        if not strategy:
            return {"error": "Strategy not found"}

        # Track usage
        self._increment_strategy_usage(slug)

        return await self.run_screen(
            filters=strategy.get("filters", {}),
            market_id=market_id,
        )

    def _increment_strategy_usage(self, slug: str):
        """Track strategy usage (for analytics)."""
        # In production, this would update a database counter
        pass
