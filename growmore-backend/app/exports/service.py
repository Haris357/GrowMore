"""Export Service - High-level export functionality."""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.db.supabase import get_supabase_service_client
from app.exports.pdf import PDFGenerator
from app.exports.csv_export import CSVGenerator
from app.exports.excel import ExcelGenerator
from app.services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)


class ExportService:
    """Service for generating exports."""

    def __init__(self):
        self.db = get_supabase_service_client()
        self.pdf = PDFGenerator()
        self.csv = CSVGenerator()
        self.excel = ExcelGenerator()
        self.analytics = AnalyticsService(self.db)

    # ==================== Portfolio Exports ====================

    async def export_portfolio_pdf(
        self,
        user_id: str,
        portfolio_id: Optional[str] = None,
    ) -> bytes:
        """
        Export portfolio report as PDF.

        Args:
            user_id: User ID
            portfolio_id: Optional specific portfolio

        Returns:
            PDF file bytes
        """
        # Get user info
        user_result = self.db.table("users").select(
            "display_name, email"
        ).eq("id", user_id).execute()
        user = user_result.data[0] if user_result.data else {}
        user_name = user.get("display_name") or user.get("email", "User")

        # Get portfolio analytics
        report_data = await self.analytics.get_portfolio_analytics(user_id, portfolio_id)

        return self.pdf.generate_portfolio_report(
            user_name=user_name,
            report_data=report_data,
            report_period=datetime.utcnow().strftime("%B %Y"),
        )

    async def export_portfolio_csv(
        self,
        user_id: str,
        portfolio_id: Optional[str] = None,
    ) -> str:
        """
        Export portfolio holdings as CSV.

        Args:
            user_id: User ID
            portfolio_id: Optional specific portfolio

        Returns:
            CSV string
        """
        report_data = await self.analytics.get_portfolio_analytics(user_id, portfolio_id)
        holdings = report_data.get("holdings", [])
        return self.csv.generate_portfolio_csv(holdings)

    async def export_portfolio_excel(
        self,
        user_id: str,
        portfolio_id: Optional[str] = None,
    ) -> bytes:
        """
        Export portfolio as Excel.

        Args:
            user_id: User ID
            portfolio_id: Optional specific portfolio

        Returns:
            Excel file bytes
        """
        user_result = self.db.table("users").select(
            "display_name, email"
        ).eq("id", user_id).execute()
        user = user_result.data[0] if user_result.data else {}
        user_name = user.get("display_name") or user.get("email", "User")

        report_data = await self.analytics.get_portfolio_analytics(user_id, portfolio_id)
        return self.excel.generate_portfolio_excel(user_name, report_data)

    # ==================== Transaction Exports ====================

    async def export_transactions_pdf(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> bytes:
        """Export transactions as PDF."""
        user_result = self.db.table("users").select(
            "display_name, email"
        ).eq("id", user_id).execute()
        user = user_result.data[0] if user_result.data else {}
        user_name = user.get("display_name") or user.get("email", "User")

        transactions = await self._get_transactions(user_id, start_date, end_date)

        date_range = None
        if start_date and end_date:
            date_range = f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"

        return self.pdf.generate_transaction_history(user_name, transactions, date_range)

    async def export_transactions_csv(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> str:
        """Export transactions as CSV."""
        transactions = await self._get_transactions(user_id, start_date, end_date)
        return self.csv.generate_transactions_csv(transactions)

    async def export_transactions_excel(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> bytes:
        """Export transactions as Excel."""
        user_result = self.db.table("users").select(
            "display_name, email"
        ).eq("id", user_id).execute()
        user = user_result.data[0] if user_result.data else {}
        user_name = user.get("display_name") or user.get("email", "User")

        transactions = await self._get_transactions(user_id, start_date, end_date)
        return self.excel.generate_transactions_excel(transactions, user_name)

    async def _get_transactions(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """Get transactions for a user."""
        query = self.db.table("transactions").select("*").eq("user_id", user_id)

        if start_date:
            query = query.gte("created_at", start_date.isoformat())
        if end_date:
            query = query.lte("created_at", end_date.isoformat())

        result = query.order("created_at", desc=True).execute()
        return result.data or []

    # ==================== Watchlist Exports ====================

    async def export_watchlist_pdf(
        self,
        user_id: str,
        watchlist_id: str,
    ) -> bytes:
        """Export watchlist as PDF."""
        user_result = self.db.table("users").select(
            "display_name, email"
        ).eq("id", user_id).execute()
        user = user_result.data[0] if user_result.data else {}
        user_name = user.get("display_name") or user.get("email", "User")

        watchlist, stocks = await self._get_watchlist_with_stocks(watchlist_id)
        return self.pdf.generate_watchlist_report(
            user_name,
            watchlist.get("name", "Watchlist"),
            stocks,
        )

    async def export_watchlist_csv(
        self,
        user_id: str,
        watchlist_id: str,
    ) -> str:
        """Export watchlist as CSV."""
        _, stocks = await self._get_watchlist_with_stocks(watchlist_id)
        return self.csv.generate_watchlist_csv(stocks)

    async def export_watchlist_excel(
        self,
        user_id: str,
        watchlist_id: str,
    ) -> bytes:
        """Export watchlist as Excel."""
        watchlist, stocks = await self._get_watchlist_with_stocks(watchlist_id)
        return self.excel.generate_watchlist_excel(
            watchlist.get("name", "Watchlist"),
            stocks,
        )

    async def _get_watchlist_with_stocks(
        self,
        watchlist_id: str,
    ) -> tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """Get watchlist with stock details."""
        # Get watchlist
        watchlist_result = self.db.table("watchlists").select("*").eq(
            "id", watchlist_id
        ).execute()
        watchlist = watchlist_result.data[0] if watchlist_result.data else {}

        # Get watchlist items with stock data
        items_result = self.db.table("watchlist_items").select(
            "*, stocks(*)"
        ).eq("watchlist_id", watchlist_id).execute()

        stocks = []
        for item in (items_result.data or []):
            stock = item.get("stocks", {}) or {}
            stocks.append(stock)

        return watchlist, stocks

    # ==================== Goals Exports ====================

    async def export_goals_csv(self, user_id: str) -> str:
        """Export goals as CSV."""
        result = self.db.table("investment_goals").select("*").eq(
            "user_id", user_id
        ).execute()
        goals = result.data or []
        return self.csv.generate_goals_csv(goals)

    async def export_goals_excel(self, user_id: str) -> bytes:
        """Export goals as Excel."""
        result = self.db.table("investment_goals").select("*").eq(
            "user_id", user_id
        ).execute()
        goals = result.data or []
        return self.excel.generate_generic_excel(
            data=goals,
            sheet_name="Goals",
            title="Investment Goals",
            columns=["name", "target_amount", "current_amount", "target_date", "status", "created_at"],
        )

    # ==================== Alerts Exports ====================

    async def export_alerts_csv(self, user_id: str) -> str:
        """Export price alerts as CSV."""
        result = self.db.table("price_alerts").select("*").eq(
            "user_id", user_id
        ).execute()
        alerts = result.data or []
        return self.csv.generate_alerts_csv(alerts)

    # ==================== Screener Exports ====================

    async def export_screener_results_csv(
        self,
        stocks: List[Dict[str, Any]],
    ) -> str:
        """Export screener results as CSV."""
        return self.csv.generate_stock_screener_csv(stocks)

    async def export_screener_results_excel(
        self,
        stocks: List[Dict[str, Any]],
    ) -> bytes:
        """Export screener results as Excel."""
        return self.excel.generate_generic_excel(
            data=stocks,
            sheet_name="Screener Results",
            title="Stock Screener Results",
            columns=[
                "symbol", "name", "sector", "current_price",
                "change_percentage", "volume", "market_cap",
            ],
        )


# Singleton instance
export_service = ExportService()
