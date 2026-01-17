"""
Stock Screener Service - Comprehensive filter and screen stocks.
Inspired by tickeranalysts.com for PSX stocks.
"""

import logging
from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime

from app.db.supabase import get_supabase_service_client

logger = logging.getLogger(__name__)


# Comprehensive Screener Filter Definitions
SCREENER_FILTERS = [
    # Price & Trading
    {"name": "Price", "code": "price", "category": "price", "data_type": "range", "field_path": "current_price", "description": "Current stock price"},
    {"name": "Price Change %", "code": "change_pct", "category": "price", "data_type": "range", "field_path": "change_percentage", "description": "Daily price change percentage"},
    {"name": "Volume", "code": "volume", "category": "trading", "data_type": "range", "field_path": "volume", "description": "Trading volume"},
    {"name": "Avg Volume", "code": "avg_volume", "category": "trading", "data_type": "range", "field_path": "avg_volume", "description": "Average trading volume"},
    {"name": "52 Week High", "code": "week_52_high", "category": "price", "data_type": "range", "field_path": "week_52_high", "description": "52 week high price"},
    {"name": "52 Week Low", "code": "week_52_low", "category": "price", "data_type": "range", "field_path": "week_52_low", "description": "52 week low price"},

    # Valuation Ratios
    {"name": "Market Cap", "code": "market_cap", "category": "valuation", "data_type": "range", "field_path": "market_cap", "description": "Market capitalization"},
    {"name": "P/E Ratio", "code": "pe_ratio", "category": "valuation", "data_type": "range", "field_path": "pe_ratio", "description": "Price to Earnings ratio"},
    {"name": "P/B Ratio", "code": "pb_ratio", "category": "valuation", "data_type": "range", "field_path": "pb_ratio", "description": "Price to Book ratio"},
    {"name": "P/S Ratio", "code": "ps_ratio", "category": "valuation", "data_type": "range", "field_path": "ps_ratio", "description": "Price to Sales ratio"},
    {"name": "PEG Ratio", "code": "peg_ratio", "category": "valuation", "data_type": "range", "field_path": "peg_ratio", "description": "Price/Earnings to Growth ratio"},
    {"name": "EV/EBITDA", "code": "ev_ebitda", "category": "valuation", "data_type": "range", "field_path": "ev_ebitda", "description": "Enterprise Value to EBITDA"},

    # Per Share Data
    {"name": "EPS", "code": "eps", "category": "per_share", "data_type": "range", "field_path": "eps", "description": "Earnings per share"},
    {"name": "Book Value", "code": "book_value", "category": "per_share", "data_type": "range", "field_path": "book_value", "description": "Book value per share"},
    {"name": "DPS", "code": "dps", "category": "per_share", "data_type": "range", "field_path": "dps", "description": "Dividend per share"},

    # Dividends
    {"name": "Dividend Yield", "code": "div_yield", "category": "dividends", "data_type": "range", "field_path": "dividend_yield", "description": "Annual dividend yield percentage"},
    {"name": "Payout Ratio", "code": "payout_ratio", "category": "dividends", "data_type": "range", "field_path": "payout_ratio", "description": "Dividend payout ratio"},

    # Profitability Ratios
    {"name": "ROE", "code": "roe", "category": "profitability", "data_type": "range", "field_path": "roe", "description": "Return on Equity"},
    {"name": "ROA", "code": "roa", "category": "profitability", "data_type": "range", "field_path": "roa", "description": "Return on Assets"},
    {"name": "ROCE", "code": "roce", "category": "profitability", "data_type": "range", "field_path": "roce", "description": "Return on Capital Employed"},
    {"name": "Gross Margin", "code": "gross_margin", "category": "profitability", "data_type": "range", "field_path": "gross_margin", "description": "Gross profit margin"},
    {"name": "Operating Margin", "code": "operating_margin", "category": "profitability", "data_type": "range", "field_path": "operating_margin", "description": "Operating profit margin"},
    {"name": "Net Margin", "code": "net_margin", "category": "profitability", "data_type": "range", "field_path": "net_margin", "description": "Net profit margin"},
    {"name": "Profit Margin", "code": "profit_margin", "category": "profitability", "data_type": "range", "field_path": "profit_margin", "description": "Overall profit margin"},

    # Financial Health / Leverage
    {"name": "Debt to Equity", "code": "debt_equity", "category": "leverage", "data_type": "range", "field_path": "debt_to_equity", "description": "Debt to Equity ratio"},
    {"name": "Debt to Assets", "code": "debt_assets", "category": "leverage", "data_type": "range", "field_path": "debt_to_assets", "description": "Debt to Assets ratio"},
    {"name": "Current Ratio", "code": "current_ratio", "category": "leverage", "data_type": "range", "field_path": "current_ratio", "description": "Current assets to liabilities"},
    {"name": "Quick Ratio", "code": "quick_ratio", "category": "leverage", "data_type": "range", "field_path": "quick_ratio", "description": "Quick assets to liabilities"},
    {"name": "Interest Coverage", "code": "interest_coverage", "category": "leverage", "data_type": "range", "field_path": "interest_coverage", "description": "Interest coverage ratio"},

    # Growth Metrics
    {"name": "Revenue Growth", "code": "revenue_growth", "category": "growth", "data_type": "range", "field_path": "revenue_growth", "description": "Year over year revenue growth"},
    {"name": "Earnings Growth", "code": "earnings_growth", "category": "growth", "data_type": "range", "field_path": "earnings_growth", "description": "Year over year earnings growth"},
    {"name": "Profit Growth", "code": "profit_growth", "category": "growth", "data_type": "range", "field_path": "profit_growth", "description": "Year over year profit growth"},

    # Cash Flow
    {"name": "FCF Yield", "code": "fcf_yield", "category": "cash_flow", "data_type": "range", "field_path": "fcf_yield", "description": "Free cash flow yield"},

    # Risk
    {"name": "Beta", "code": "beta", "category": "risk", "data_type": "range", "field_path": "beta", "description": "Stock beta (volatility)"},

    # Classification
    {"name": "Sector", "code": "sector", "category": "classification", "data_type": "select", "field_path": "companies.sector_id", "description": "Business sector"},
]

# Pre-built Screening Strategies (inspired by tickeranalysts.com)
PRESET_STRATEGIES = [
    # ===== BEGINNER FRIENDLY =====
    {
        "name": "Beginner's Safe Start",
        "slug": "beginners-safe-start",
        "description": "Low debt, reasonable P/E (<=15), dividend paying. Perfect for first investments.",
        "icon": "shield",
        "category": "beginner",
        "filters": {
            "debt_equity": {"max": 0.5},
            "pe_ratio": {"max": 15},
            "div_yield": {"min": 5},
        },
        "is_featured": True,
    },
    {
        "name": "Dividend Income",
        "slug": "dividend-income",
        "description": "High dividend yield (8%+) for regular passive income.",
        "icon": "banknote",
        "category": "income",
        "filters": {
            "div_yield": {"min": 8},
            "payout_ratio": {"max": 80},
        },
        "is_featured": True,
    },

    # ===== LEGENDARY INVESTOR STYLES =====
    {
        "name": "Warren Buffett Style",
        "slug": "warren-buffett-style",
        "description": "Quality companies at fair prices - low P/E (<=15), low debt (<=0.5), high ROE (>=15%).",
        "icon": "star",
        "category": "value",
        "filters": {
            "pe_ratio": {"max": 15},
            "debt_equity": {"max": 0.5},
            "roe": {"min": 15},
            "profit_margin": {"min": 10},
        },
        "is_featured": True,
    },
    {
        "name": "Charlie Munger Style",
        "slug": "charlie-munger-style",
        "description": "Quality-focused with high ROE (>=15%), strong margins (>=10%), growing revenue.",
        "icon": "brain",
        "category": "quality",
        "filters": {
            "roe": {"min": 15},
            "operating_margin": {"min": 10},
            "revenue_growth": {"min": 5},
        },
        "is_featured": True,
    },
    {
        "name": "Benjamin Graham Value",
        "slug": "benjamin-graham-value",
        "description": "Classic value investing with margin of safety - Low P/E (<=12), P/B (<=1.5), current ratio (>=1.5).",
        "icon": "book",
        "category": "value",
        "filters": {
            "pe_ratio": {"max": 12},
            "pb_ratio": {"max": 1.5},
            "current_ratio": {"min": 1.5},
            "debt_equity": {"max": 0.5},
        },
        "is_featured": True,
    },
    {
        "name": "Peter Lynch Growth",
        "slug": "peter-lynch-growth",
        "description": "GARP strategy - Growth at reasonable price with PEG <= 1.",
        "icon": "trending-up",
        "category": "growth",
        "filters": {
            "peg_ratio": {"max": 1},
            "earnings_growth": {"min": 15},
            "debt_equity": {"max": 0.5},
        },
        "is_featured": False,
    },

    # ===== QUALITY & VALUE =====
    {
        "name": "Undervalued Gems",
        "slug": "undervalued-gems",
        "description": "Stocks trading below book value with solid fundamentals.",
        "icon": "gem",
        "category": "value",
        "filters": {
            "pb_ratio": {"max": 1},
            "pe_ratio": {"max": 10},
            "roe": {"min": 10},
            "div_yield": {"min": 3},
        },
        "is_featured": False,
    },
    {
        "name": "Quality Large Cap",
        "slug": "quality-large-cap",
        "description": "Large, stable companies with consistent performance.",
        "icon": "building",
        "category": "quality",
        "filters": {
            "market_cap": {"min": 50000000000},  # 50B PKR
            "roe": {"min": 12},
            "debt_equity": {"max": 1},
        },
        "is_featured": False,
    },
    {
        "name": "Low Debt Champions",
        "slug": "low-debt-champions",
        "description": "Financially stable companies with minimal debt and strong coverage.",
        "icon": "shield-check",
        "category": "stability",
        "filters": {
            "debt_equity": {"max": 0.3},
            "current_ratio": {"min": 2},
            "interest_coverage": {"min": 5},
        },
        "is_featured": False,
    },

    # ===== GROWTH =====
    {
        "name": "High Growth Rockets",
        "slug": "high-growth-rockets",
        "description": "Fast-growing companies with 20%+ revenue and earnings growth.",
        "icon": "rocket",
        "category": "growth",
        "filters": {
            "revenue_growth": {"min": 20},
            "earnings_growth": {"min": 20},
            "roe": {"min": 15},
        },
        "is_featured": True,
    },
    {
        "name": "Momentum Play",
        "slug": "momentum-play",
        "description": "Stocks with strong price momentum and high volume.",
        "icon": "zap",
        "category": "momentum",
        "filters": {
            "change_pct": {"min": 2},
            "volume": {"min": 100000},
        },
        "is_featured": False,
    },

    # ===== DAILY MOVERS =====
    {
        "name": "Top Gainers Today",
        "slug": "top-gainers-today",
        "description": "Stocks with highest gains today.",
        "icon": "trending-up",
        "category": "daily",
        "filters": {
            "change_pct": {"min": 0},
            "sort": "change_pct_desc",
            "limit": 25,
        },
        "is_featured": True,
    },
    {
        "name": "Top Losers Today",
        "slug": "top-losers-today",
        "description": "Biggest decliners today - potential bounce candidates.",
        "icon": "trending-down",
        "category": "daily",
        "filters": {
            "change_pct": {"max": 0},
            "sort": "change_pct_asc",
            "limit": 25,
        },
        "is_featured": True,
    },
    {
        "name": "Most Active",
        "slug": "most-active",
        "description": "Highest trading volume stocks today.",
        "icon": "activity",
        "category": "daily",
        "filters": {
            "sort": "volume_desc",
            "limit": 25,
        },
        "is_featured": True,
    },

    # ===== SECTOR SPECIFIC =====
    {
        "name": "Banking Sector",
        "slug": "banking-sector",
        "description": "All banking sector stocks.",
        "icon": "landmark",
        "category": "sector",
        "filters": {
            "sector_code": "BANK",
        },
        "is_featured": False,
    },
    {
        "name": "High Dividend Banks",
        "slug": "high-dividend-banks",
        "description": "Banking stocks with 5%+ dividend yields.",
        "icon": "percent",
        "category": "sector",
        "filters": {
            "sector_code": "BANK",
            "div_yield": {"min": 5},
        },
        "is_featured": False,
    },
    {
        "name": "Cement Sector",
        "slug": "cement-sector",
        "description": "All cement sector stocks.",
        "icon": "factory",
        "category": "sector",
        "filters": {
            "sector_code": "CEMENT",
        },
        "is_featured": False,
    },
    {
        "name": "Fertilizer Sector",
        "slug": "fertilizer-sector",
        "description": "All fertilizer sector stocks.",
        "icon": "leaf",
        "category": "sector",
        "filters": {
            "sector_code": "FERT",
        },
        "is_featured": False,
    },
    {
        "name": "Oil & Gas Sector",
        "slug": "oil-gas-sector",
        "description": "All oil & gas exploration and marketing stocks.",
        "icon": "fuel",
        "category": "sector",
        "filters": {
            "sector_code": "OIL",
        },
        "is_featured": False,
    },
    {
        "name": "Pharma Sector",
        "slug": "pharma-sector",
        "description": "All pharmaceutical stocks.",
        "icon": "pill",
        "category": "sector",
        "filters": {
            "sector_code": "PHARMA",
        },
        "is_featured": False,
    },
    {
        "name": "Tech Sector",
        "slug": "tech-sector",
        "description": "Technology & communication stocks.",
        "icon": "laptop",
        "category": "sector",
        "filters": {
            "sector_code": "TECH",
        },
        "is_featured": False,
    },
    {
        "name": "Power Sector",
        "slug": "power-sector",
        "description": "Power generation & distribution stocks.",
        "icon": "zap",
        "category": "sector",
        "filters": {
            "sector_code": "POWER",
        },
        "is_featured": False,
    },

    # ===== SPECIAL SITUATIONS =====
    {
        "name": "Near 52-Week High",
        "slug": "near-52-week-high",
        "description": "Stocks trading within 10% of their 52-week high.",
        "icon": "arrow-up-circle",
        "category": "technical",
        "filters": {
            "near_52_high": True,
        },
        "is_featured": False,
    },
    {
        "name": "Near 52-Week Low",
        "slug": "near-52-week-low",
        "description": "Stocks trading within 10% of their 52-week low - potential turnaround candidates.",
        "icon": "arrow-down-circle",
        "category": "technical",
        "filters": {
            "near_52_low": True,
        },
        "is_featured": False,
    },
    {
        "name": "High FCF Yield",
        "slug": "high-fcf-yield",
        "description": "Stocks with high free cash flow yield (>=10%).",
        "icon": "coins",
        "category": "cash_flow",
        "filters": {
            "fcf_yield": {"min": 10},
        },
        "is_featured": False,
    },
]

# PSX Sector Codes Mapping
PSX_SECTORS = {
    "BANK": "Commercial Banks",
    "CEMENT": "Cement",
    "FERT": "Fertilizer",
    "OIL": "Oil & Gas Exploration Companies",
    "OILM": "Oil & Gas Marketing Companies",
    "POWER": "Power Generation & Distribution",
    "PHARMA": "Pharmaceuticals",
    "TECH": "Technology & Communication",
    "AUTO": "Automobile Assembler",
    "AUTOPART": "Automobile Parts & Accessories",
    "CHEM": "Chemical",
    "TEXTILE": "Textile Composite",
    "SUGAR": "Sugar & Allied Industries",
    "FOOD": "Food & Personal Care Products",
    "INS": "Insurance",
    "INVBANK": "Inv. Banks / Inv. Cos. / Securities Cos.",
    "STEEL": "Engineering",
    "GLASS": "Glass & Ceramics",
    "PAPER": "Paper & Board",
    "REFINERY": "Refinery",
    "TRANSPORT": "Transport",
    "TELECOM": "Telecom",
    "MISC": "Miscellaneous",
}


class ScreenerService:
    """
    Comprehensive stock screening service for PSX stocks.
    """

    def __init__(self):
        self.db = get_supabase_service_client()

    def get_filters(self) -> List[Dict[str, Any]]:
        """Get all available screener filters."""
        return SCREENER_FILTERS

    def get_filter_categories(self) -> List[Dict[str, Any]]:
        """Get filter categories with their filters."""
        categories = {}
        for f in SCREENER_FILTERS:
            cat = f["category"]
            if cat not in categories:
                categories[cat] = {
                    "code": cat,
                    "name": cat.replace("_", " ").title(),
                    "filters": [],
                }
            categories[cat]["filters"].append({
                "code": f["code"],
                "name": f["name"],
                "description": f.get("description"),
            })
        return list(categories.values())

    def get_strategies(self, featured_only: bool = False, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get pre-built screening strategies."""
        strategies = PRESET_STRATEGIES
        if featured_only:
            strategies = [s for s in strategies if s.get("is_featured", False)]
        if category:
            strategies = [s for s in strategies if s.get("category") == category]
        return strategies

    def get_strategy(self, slug: str) -> Optional[Dict[str, Any]]:
        """Get a specific strategy by slug."""
        for strategy in PRESET_STRATEGIES:
            if strategy["slug"] == slug:
                return strategy
        return None

    def get_sectors(self) -> List[Dict[str, str]]:
        """Get all PSX sectors."""
        return [{"code": code, "name": name} for code, name in PSX_SECTORS.items()]

    async def run_screen(
        self,
        filters: Dict[str, Any],
        market_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Run a stock screen with given filters.
        """
        try:
            # Start with base query - select all fields
            query = self.db.table("stocks").select(
                "*, companies!inner(id, symbol, name, logo_url, sector_id, market_id, sectors(id, name, code))"
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
                query = query.order(sort_field, desc=False, nullsfirst=False)
            else:
                query = query.order(sort_field, desc=True, nullsfirst=False)

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
                    "logo_url": company.get("logo_url"),
                    "sector": sector.get("name") if sector else None,
                    "sector_code": sector.get("code") if sector else None,

                    # Price Data
                    "current_price": stock.get("current_price"),
                    "change_amount": stock.get("change_amount"),
                    "change_percentage": stock.get("change_percentage"),
                    "open_price": stock.get("open_price"),
                    "high_price": stock.get("high_price"),
                    "low_price": stock.get("low_price"),
                    "previous_close": stock.get("previous_close"),
                    "volume": stock.get("volume"),
                    "avg_volume": stock.get("avg_volume"),

                    # 52 Week
                    "week_52_high": stock.get("week_52_high"),
                    "week_52_low": stock.get("week_52_low"),

                    # Valuation
                    "market_cap": stock.get("market_cap"),
                    "pe_ratio": stock.get("pe_ratio"),
                    "pb_ratio": stock.get("pb_ratio"),
                    "ps_ratio": stock.get("ps_ratio"),
                    "peg_ratio": stock.get("peg_ratio"),
                    "ev_ebitda": stock.get("ev_ebitda"),

                    # Per Share
                    "eps": stock.get("eps"),
                    "book_value": stock.get("book_value"),
                    "dps": stock.get("dps"),
                    "dividend_yield": stock.get("dividend_yield"),

                    # Profitability
                    "roe": stock.get("roe"),
                    "roa": stock.get("roa"),
                    "roce": stock.get("roce"),
                    "gross_margin": stock.get("gross_margin"),
                    "operating_margin": stock.get("operating_margin"),
                    "net_margin": stock.get("net_margin"),
                    "profit_margin": stock.get("profit_margin"),

                    # Leverage
                    "debt_to_equity": stock.get("debt_to_equity"),
                    "debt_to_assets": stock.get("debt_to_assets"),
                    "current_ratio": stock.get("current_ratio"),
                    "quick_ratio": stock.get("quick_ratio"),
                    "interest_coverage": stock.get("interest_coverage"),

                    # Growth
                    "revenue_growth": stock.get("revenue_growth"),
                    "earnings_growth": stock.get("earnings_growth"),
                    "profit_growth": stock.get("profit_growth"),

                    # Other
                    "beta": stock.get("beta"),
                    "payout_ratio": stock.get("payout_ratio"),
                    "fcf_yield": stock.get("fcf_yield"),

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
                "filters_applied": filters,
                "limit": limit,
                "offset": offset,
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

        # Near 52-week high/low special filters
        if filter_code == "near_52_high" and filter_value:
            # This would require a computed field or post-processing
            return query

        if filter_code == "near_52_low" and filter_value:
            return query

        # Range filters
        if isinstance(filter_value, dict):
            field = self._get_field_name(filter_code)
            if field:
                if "min" in filter_value and filter_value["min"] is not None:
                    query = query.gte(field, filter_value["min"])
                if "max" in filter_value and filter_value["max"] is not None:
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
            # Price & Trading
            "price": "current_price",
            "change_pct": "change_percentage",
            "volume": "volume",
            "avg_volume": "avg_volume",
            "week_52_high": "week_52_high",
            "week_52_low": "week_52_low",

            # Valuation
            "market_cap": "market_cap",
            "pe_ratio": "pe_ratio",
            "pb_ratio": "pb_ratio",
            "ps_ratio": "ps_ratio",
            "peg_ratio": "peg_ratio",
            "ev_ebitda": "ev_ebitda",

            # Per Share
            "eps": "eps",
            "book_value": "book_value",
            "dps": "dps",
            "div_yield": "dividend_yield",

            # Profitability
            "roe": "roe",
            "roa": "roa",
            "roce": "roce",
            "gross_margin": "gross_margin",
            "operating_margin": "operating_margin",
            "net_margin": "net_margin",
            "profit_margin": "profit_margin",

            # Leverage
            "debt_equity": "debt_to_equity",
            "debt_assets": "debt_to_assets",
            "current_ratio": "current_ratio",
            "quick_ratio": "quick_ratio",
            "interest_coverage": "interest_coverage",

            # Growth
            "revenue_growth": "revenue_growth",
            "earnings_growth": "earnings_growth",
            "profit_growth": "profit_growth",

            # Other
            "beta": "beta",
            "payout_ratio": "payout_ratio",
            "fcf_yield": "fcf_yield",
        }
        return field_map.get(filter_code)

    def _get_sort_params(self, filters: Dict[str, Any]) -> tuple:
        """Get sort field and order from filters."""
        sort = filters.get("sort", "change_pct_desc")

        sort_map = {
            # Price
            "change_pct_desc": ("change_percentage", "desc"),
            "change_pct_asc": ("change_percentage", "asc"),
            "price_desc": ("current_price", "desc"),
            "price_asc": ("current_price", "asc"),

            # Trading
            "volume_desc": ("volume", "desc"),
            "volume_asc": ("volume", "asc"),

            # Valuation
            "market_cap_desc": ("market_cap", "desc"),
            "market_cap_asc": ("market_cap", "asc"),
            "pe_ratio_asc": ("pe_ratio", "asc"),
            "pe_ratio_desc": ("pe_ratio", "desc"),
            "pb_ratio_asc": ("pb_ratio", "asc"),
            "pb_ratio_desc": ("pb_ratio", "desc"),

            # Dividends
            "div_yield_desc": ("dividend_yield", "desc"),
            "div_yield_asc": ("dividend_yield", "asc"),

            # Profitability
            "roe_desc": ("roe", "desc"),
            "roe_asc": ("roe", "asc"),
            "profit_margin_desc": ("profit_margin", "desc"),

            # Leverage
            "debt_equity_asc": ("debt_to_equity", "asc"),
            "debt_equity_desc": ("debt_to_equity", "desc"),

            # Growth
            "revenue_growth_desc": ("revenue_growth", "desc"),
            "earnings_growth_desc": ("earnings_growth", "desc"),
        }

        return sort_map.get(sort, ("change_percentage", "desc"))

    async def run_strategy(self, slug: str, market_id: Optional[str] = None) -> Dict[str, Any]:
        """Run a pre-built strategy."""
        strategy = self.get_strategy(slug)
        if not strategy:
            return {"error": "Strategy not found"}

        return await self.run_screen(
            filters=strategy.get("filters", {}),
            market_id=market_id,
        )

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
