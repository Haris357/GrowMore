from datetime import date, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client

from app.models.stock import Company, Stock, StockHistory
from app.repositories.stock_repository import CompanyRepository, StockRepository, StockHistoryRepository
from app.core.exceptions import NotFoundError
from app.schemas.stock import StockRatingsResponse, RatingMetric


class StockService:
    def __init__(self, db: Client):
        self.db = db
        self.company_repo = CompanyRepository(db)
        self.stock_repo = StockRepository(db)
        self.history_repo = StockHistoryRepository(db)

    async def get_stocks(
        self,
        market_id: Optional[UUID] = None,
        sector_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "symbol",
        sort_order: str = "asc",
    ) -> Dict[str, Any]:
        return await self.stock_repo.get_stocks_with_companies(
            market_id=market_id,
            sector_id=sector_id,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    async def get_stock_by_id(self, stock_id: UUID) -> Dict[str, Any]:
        stock = await self.stock_repo.get_by_id(stock_id)
        if not stock:
            raise NotFoundError("Stock")

        company = await self.company_repo.get_by_id(stock["company_id"])
        if not company:
            raise NotFoundError("Company")

        return {
            **stock,
            "company": company,
        }

    async def get_stock_by_symbol(self, market_id: UUID, symbol: str) -> Dict[str, Any]:
        company = await self.company_repo.get_by_symbol(market_id, symbol)
        if not company:
            raise NotFoundError("Company")

        stock = await self.stock_repo.get_by_company(company.id)
        if not stock:
            raise NotFoundError("Stock")

        return {
            "stock": stock,
            "company": company,
        }

    async def get_stock_history(
        self,
        stock_id: UUID,
        period: str = "1M",
    ) -> Dict[str, Any]:
        stock = await self.stock_repo.get_by_id(stock_id)
        if not stock:
            raise NotFoundError("Stock")

        to_date = date.today()
        period_days = {
            "1W": 7,
            "1M": 30,
            "3M": 90,
            "6M": 180,
            "1Y": 365,
            "2Y": 730,
            "3Y": 1095,
            "5Y": 1825,
        }
        days = period_days.get(period, 30)
        from_date = to_date - timedelta(days=days)

        history = await self.history_repo.get_history(
            stock_id=stock_id,
            from_date=from_date,
            to_date=to_date,
            limit=days,
        )

        return {
            "stock_id": stock_id,
            "period": period,
            "history": history,
        }

    async def get_top_gainers(self, market_id: UUID, limit: int = 10) -> List[Dict[str, Any]]:
        return await self.stock_repo.get_top_gainers(market_id, limit)

    async def get_top_losers(self, market_id: UUID, limit: int = 10) -> List[Dict[str, Any]]:
        return await self.stock_repo.get_top_losers(market_id, limit)

    async def get_most_active(self, market_id: UUID, limit: int = 10) -> List[Dict[str, Any]]:
        return await self.stock_repo.get_most_active(market_id, limit)

    async def search_stocks(
        self, market_id: UUID, search_term: str, limit: int = 20
    ) -> List[Company]:
        return await self.company_repo.search_companies(market_id, search_term, limit)

    async def update_stock_price(
        self, stock_id: UUID, price_data: Dict[str, Any]
    ) -> Optional[Stock]:
        return await self.stock_repo.update_stock_price(stock_id, price_data)

    async def get_financials(
        self,
        stock_id: UUID,
        period_type: str = "annual",
        limit: int = 5,
    ) -> Dict[str, Any]:
        """Get financial statements for a stock."""
        stock = await self.stock_repo.get_by_id(stock_id)
        if not stock:
            raise NotFoundError("Stock")

        company = await self.company_repo.get_by_id(stock["company_id"])
        if not company:
            raise NotFoundError("Company")

        company_id = stock["company_id"]
        symbol = company.symbol if hasattr(company, 'symbol') else company.get("symbol", "")

        try:
            result = self.db.table("financial_statements").select("*").eq(
                "company_id", str(company_id)
            ).eq("period_type", period_type).order(
                "fiscal_year", desc=True
            ).limit(limit).execute()
            statements = result.data or []
        except Exception:
            statements = []

        return {
            "stock_id": stock_id,
            "symbol": symbol,
            "statements": statements,
        }

    async def get_ratings(self, stock_id: UUID) -> StockRatingsResponse:
        """Compute Good/Bad ratings for a stock based on its metrics."""
        stock_data = await self.stock_repo.get_by_id(stock_id)
        if not stock_data:
            raise NotFoundError("Stock")

        company = await self.company_repo.get_by_id(stock_data["company_id"])
        symbol = company.symbol if hasattr(company, 'symbol') else company.get("symbol", "")

        def safe_float(val) -> Optional[float]:
            if val is None:
                return None
            try:
                return float(val)
            except (ValueError, TypeError):
                return None

        def fmt_pct(val) -> str:
            v = safe_float(val)
            return f"{v:.1f}%" if v is not None else "N/A"

        def fmt_ratio(val) -> str:
            v = safe_float(val)
            return f"{v:.2f}" if v is not None else "N/A"

        def fmt_val(val) -> str:
            v = safe_float(val)
            if v is None:
                return "N/A"
            if abs(v) >= 1e9:
                return f"Rs. {v/1e9:.1f}B"
            if abs(v) >= 1e7:
                return f"Rs. {v/1e7:.1f}Cr"
            if abs(v) >= 1e5:
                return f"Rs. {v/1e5:.1f}L"
            return f"Rs. {v:,.0f}"

        def rate(val, good_fn) -> str:
            v = safe_float(val)
            if v is None:
                return "neutral"
            return "good" if good_fn(v) else "bad"

        growth_metrics = [
            RatingMetric(name="Revenue Growth", category="growth",
                         value=str(safe_float(stock_data.get("revenue_growth")) or ""),
                         display_value=fmt_pct(stock_data.get("revenue_growth")),
                         status=rate(stock_data.get("revenue_growth"), lambda v: v > 0)),
            RatingMetric(name="Operating Profit Growth", category="growth",
                         value=str(safe_float(stock_data.get("profit_growth")) or ""),
                         display_value=fmt_pct(stock_data.get("profit_growth")),
                         status=rate(stock_data.get("profit_growth"), lambda v: v > 0)),
            RatingMetric(name="Net Profit Growth", category="growth",
                         value=str(safe_float(stock_data.get("earnings_growth")) or ""),
                         display_value=fmt_pct(stock_data.get("earnings_growth")),
                         status=rate(stock_data.get("earnings_growth"), lambda v: v > 0)),
            RatingMetric(name="EPS Growth Trend", category="growth",
                         value=str(safe_float(stock_data.get("earnings_growth")) or ""),
                         display_value=fmt_pct(stock_data.get("earnings_growth")),
                         status=rate(stock_data.get("earnings_growth"), lambda v: v > 5)),
        ]

        stability_metrics = [
            RatingMetric(name="Operating Profit Margin", category="stability",
                         value=str(safe_float(stock_data.get("operating_margin")) or ""),
                         display_value=fmt_pct(stock_data.get("operating_margin")),
                         status=rate(stock_data.get("operating_margin"), lambda v: v > 10)),
            RatingMetric(name="Net Profit Margin", category="stability",
                         value=str(safe_float(stock_data.get("net_margin")) or ""),
                         display_value=fmt_pct(stock_data.get("net_margin")),
                         status=rate(stock_data.get("net_margin"), lambda v: v > 5)),
            RatingMetric(name="Debt to Equity", category="stability",
                         value=str(safe_float(stock_data.get("debt_to_equity")) or ""),
                         display_value=fmt_ratio(stock_data.get("debt_to_equity")),
                         status=rate(stock_data.get("debt_to_equity"), lambda v: v < 1)),
            RatingMetric(name="Current Ratio", category="stability",
                         value=str(safe_float(stock_data.get("current_ratio")) or ""),
                         display_value=fmt_ratio(stock_data.get("current_ratio")),
                         status=rate(stock_data.get("current_ratio"), lambda v: v > 1.5)),
            RatingMetric(name="Return on Equity (ROE)", category="stability",
                         value=str(safe_float(stock_data.get("roe")) or ""),
                         display_value=fmt_pct(stock_data.get("roe")),
                         status=rate(stock_data.get("roe"), lambda v: v > 15)),
        ]

        valuation_metrics = [
            RatingMetric(name="Price to Earnings (P/E)", category="valuation",
                         value=str(safe_float(stock_data.get("pe_ratio")) or ""),
                         display_value=f"{fmt_ratio(stock_data.get('pe_ratio'))}x",
                         status=rate(stock_data.get("pe_ratio"), lambda v: 0 < v < 25)),
            RatingMetric(name="Price to Book (P/B)", category="valuation",
                         value=str(safe_float(stock_data.get("pb_ratio")) or ""),
                         display_value=fmt_ratio(stock_data.get("pb_ratio")),
                         status=rate(stock_data.get("pb_ratio"), lambda v: 0 < v < 3)),
            RatingMetric(name="Price to Sales (P/S)", category="valuation",
                         value=str(safe_float(stock_data.get("ps_ratio")) or ""),
                         display_value=fmt_ratio(stock_data.get("ps_ratio")),
                         status=rate(stock_data.get("ps_ratio"), lambda v: 0 < v < 2)),
            RatingMetric(name="Dividend Yield", category="valuation",
                         value=str(safe_float(stock_data.get("dividend_yield")) or ""),
                         display_value=fmt_pct(stock_data.get("dividend_yield")),
                         status=rate(stock_data.get("dividend_yield"), lambda v: v > 3)),
            RatingMetric(name="EV/EBITDA", category="valuation",
                         value=str(safe_float(stock_data.get("ev_ebitda")) or ""),
                         display_value=f"{fmt_ratio(stock_data.get('ev_ebitda'))}x",
                         status=rate(stock_data.get("ev_ebitda"), lambda v: 0 < v < 15)),
        ]

        efficiency_metrics = [
            RatingMetric(name="Return on Assets (ROA)", category="efficiency",
                         value=str(safe_float(stock_data.get("roa")) or ""),
                         display_value=fmt_pct(stock_data.get("roa")),
                         status=rate(stock_data.get("roa"), lambda v: v > 5)),
            RatingMetric(name="Gross Margin", category="efficiency",
                         value=str(safe_float(stock_data.get("gross_margin")) or ""),
                         display_value=fmt_pct(stock_data.get("gross_margin")),
                         status=rate(stock_data.get("gross_margin"), lambda v: v > 20)),
        ]

        fcf = safe_float(stock_data.get("free_cash_flow"))
        ocf = safe_float(stock_data.get("operating_cash_flow"))
        cash_flow_metrics = [
            RatingMetric(name="Free Cash Flow", category="cash_flow",
                         value=str(fcf or ""),
                         display_value=fmt_val(fcf),
                         status="good" if fcf and fcf > 0 else ("bad" if fcf is not None else "neutral")),
            RatingMetric(name="Operating Cash Flow", category="cash_flow",
                         value=str(ocf or ""),
                         display_value=fmt_val(ocf),
                         status="good" if ocf and ocf > 0 else ("bad" if ocf is not None else "neutral")),
            RatingMetric(name="FCF Yield", category="cash_flow",
                         value=str(safe_float(stock_data.get("fcf_yield")) or ""),
                         display_value=fmt_pct(stock_data.get("fcf_yield")),
                         status=rate(stock_data.get("fcf_yield"), lambda v: v > 5)),
        ]

        return StockRatingsResponse(
            stock_id=stock_id,
            symbol=symbol,
            growth_metrics=growth_metrics,
            stability_metrics=stability_metrics,
            valuation_metrics=valuation_metrics,
            efficiency_metrics=efficiency_metrics,
            cash_flow_metrics=cash_flow_metrics,
        )
