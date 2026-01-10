"""CSV Export Generator."""

import csv
import io
from datetime import datetime
from typing import Any, Dict, List, Optional


class CSVGenerator:
    """Generate CSV exports."""

    def generate_portfolio_csv(
        self,
        holdings: List[Dict[str, Any]],
        include_headers: bool = True,
    ) -> str:
        """
        Generate portfolio holdings CSV.

        Args:
            holdings: List of holding dictionaries
            include_headers: Whether to include header row

        Returns:
            CSV string
        """
        output = io.StringIO()
        writer = csv.writer(output)

        if include_headers:
            writer.writerow([
                "Symbol",
                "Name",
                "Sector",
                "Quantity",
                "Average Price",
                "Current Price",
                "Total Invested",
                "Current Value",
                "Gain/Loss",
                "Gain/Loss %",
                "Day Change %",
            ])

        for h in holdings:
            writer.writerow([
                h.get("symbol", ""),
                h.get("name", ""),
                h.get("sector", ""),
                h.get("quantity", 0),
                h.get("average_price", 0),
                h.get("current_price", 0),
                h.get("total_invested", 0),
                h.get("current_value", 0),
                h.get("gain_loss", 0),
                h.get("gain_loss_pct", 0),
                h.get("day_change_pct", 0),
            ])

        return output.getvalue()

    def generate_transactions_csv(
        self,
        transactions: List[Dict[str, Any]],
        include_headers: bool = True,
    ) -> str:
        """
        Generate transactions CSV.

        Args:
            transactions: List of transaction dictionaries
            include_headers: Whether to include header row

        Returns:
            CSV string
        """
        output = io.StringIO()
        writer = csv.writer(output)

        if include_headers:
            writer.writerow([
                "Date",
                "Type",
                "Symbol",
                "Quantity",
                "Price",
                "Total Amount",
                "Fees",
                "Status",
                "Notes",
            ])

        for t in transactions:
            date = t.get("date", "")
            if isinstance(date, datetime):
                date = date.strftime("%Y-%m-%d %H:%M:%S")

            writer.writerow([
                date,
                t.get("type", ""),
                t.get("symbol", ""),
                t.get("quantity", 0),
                t.get("price", 0),
                t.get("total", 0),
                t.get("fees", 0),
                t.get("status", ""),
                t.get("notes", ""),
            ])

        return output.getvalue()

    def generate_watchlist_csv(
        self,
        stocks: List[Dict[str, Any]],
        include_headers: bool = True,
    ) -> str:
        """
        Generate watchlist CSV.

        Args:
            stocks: List of stock dictionaries
            include_headers: Whether to include header row

        Returns:
            CSV string
        """
        output = io.StringIO()
        writer = csv.writer(output)

        if include_headers:
            writer.writerow([
                "Symbol",
                "Name",
                "Sector",
                "Current Price",
                "Change",
                "Change %",
                "Volume",
                "Market Cap",
                "52W High",
                "52W Low",
            ])

        for s in stocks:
            writer.writerow([
                s.get("symbol", ""),
                s.get("name", ""),
                s.get("sector", ""),
                s.get("current_price", 0),
                s.get("change_amount", 0),
                s.get("change_percentage", 0),
                s.get("volume", 0),
                s.get("market_cap", 0),
                s.get("high_52week", 0),
                s.get("low_52week", 0),
            ])

        return output.getvalue()

    def generate_alerts_csv(
        self,
        alerts: List[Dict[str, Any]],
        include_headers: bool = True,
    ) -> str:
        """
        Generate alerts CSV.

        Args:
            alerts: List of alert dictionaries
            include_headers: Whether to include header row

        Returns:
            CSV string
        """
        output = io.StringIO()
        writer = csv.writer(output)

        if include_headers:
            writer.writerow([
                "Symbol",
                "Alert Type",
                "Condition",
                "Target Price",
                "Current Price",
                "Status",
                "Created At",
                "Triggered At",
            ])

        for a in alerts:
            created = a.get("created_at", "")
            triggered = a.get("triggered_at", "")
            if isinstance(created, datetime):
                created = created.strftime("%Y-%m-%d %H:%M:%S")
            if isinstance(triggered, datetime):
                triggered = triggered.strftime("%Y-%m-%d %H:%M:%S")

            writer.writerow([
                a.get("symbol", ""),
                a.get("alert_type", ""),
                a.get("condition", ""),
                a.get("target_price", 0),
                a.get("current_price", 0),
                a.get("status", ""),
                created,
                triggered or "",
            ])

        return output.getvalue()

    def generate_goals_csv(
        self,
        goals: List[Dict[str, Any]],
        include_headers: bool = True,
    ) -> str:
        """
        Generate goals CSV.

        Args:
            goals: List of goal dictionaries
            include_headers: Whether to include header row

        Returns:
            CSV string
        """
        output = io.StringIO()
        writer = csv.writer(output)

        if include_headers:
            writer.writerow([
                "Name",
                "Target Amount",
                "Current Amount",
                "Progress %",
                "Target Date",
                "Status",
                "Created At",
            ])

        for g in goals:
            target_date = g.get("target_date", "")
            created = g.get("created_at", "")
            if isinstance(target_date, datetime):
                target_date = target_date.strftime("%Y-%m-%d")
            if isinstance(created, datetime):
                created = created.strftime("%Y-%m-%d")

            current = float(g.get("current_amount", 0) or 0)
            target = float(g.get("target_amount", 0) or 1)
            progress = (current / target * 100) if target > 0 else 0

            writer.writerow([
                g.get("name", ""),
                g.get("target_amount", 0),
                g.get("current_amount", 0),
                f"{progress:.1f}",
                target_date,
                g.get("status", ""),
                created,
            ])

        return output.getvalue()

    def generate_stock_screener_csv(
        self,
        stocks: List[Dict[str, Any]],
        include_headers: bool = True,
    ) -> str:
        """
        Generate stock screener results CSV.

        Args:
            stocks: List of screened stock dictionaries
            include_headers: Whether to include header row

        Returns:
            CSV string
        """
        output = io.StringIO()
        writer = csv.writer(output)

        if include_headers:
            writer.writerow([
                "Symbol",
                "Name",
                "Sector",
                "Price",
                "Change %",
                "Volume",
                "Market Cap",
                "P/E Ratio",
                "EPS",
                "Dividend Yield",
                "52W High",
                "52W Low",
            ])

        for s in stocks:
            writer.writerow([
                s.get("symbol", ""),
                s.get("name", ""),
                s.get("sector", ""),
                s.get("current_price", 0),
                s.get("change_percentage", 0),
                s.get("volume", 0),
                s.get("market_cap", 0),
                s.get("pe_ratio", "N/A"),
                s.get("eps", "N/A"),
                s.get("dividend_yield", "N/A"),
                s.get("high_52week", 0),
                s.get("low_52week", 0),
            ])

        return output.getvalue()

    def generate_generic_csv(
        self,
        data: List[Dict[str, Any]],
        columns: Optional[List[str]] = None,
        include_headers: bool = True,
    ) -> str:
        """
        Generate generic CSV from list of dictionaries.

        Args:
            data: List of dictionaries
            columns: Optional list of column keys (uses all keys if None)
            include_headers: Whether to include header row

        Returns:
            CSV string
        """
        if not data:
            return ""

        output = io.StringIO()
        writer = csv.writer(output)

        # Get columns
        if columns is None:
            columns = list(data[0].keys())

        if include_headers:
            # Convert column keys to display names
            headers = [col.replace("_", " ").title() for col in columns]
            writer.writerow(headers)

        for row in data:
            values = []
            for col in columns:
                value = row.get(col, "")
                if isinstance(value, datetime):
                    value = value.strftime("%Y-%m-%d %H:%M:%S")
                elif isinstance(value, (dict, list)):
                    value = str(value)
                values.append(value)
            writer.writerow(values)

        return output.getvalue()
