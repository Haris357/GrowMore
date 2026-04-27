"""
Supabase data writer — all database write operations for PSX data.

Writes to: companies, stocks, stock_history, financial_statements tables.
Uses a warm symbol cache to avoid N+1 DB lookups per symbol.
"""
import logging
from datetime import date, datetime
from typing import Dict, List, Optional, Tuple

from app.db.supabase import get_supabase_service_client
from .dps_client import FinancialPeriod

logger = logging.getLogger(__name__)

BATCH_SIZE = 500  # Max rows per Supabase request


class PSXDataWriter:
    def __init__(self):
        self.db = get_supabase_service_client()
        self._symbol_cache: Dict[str, Tuple[str, str]] = {}  # symbol -> (company_id, stock_id)
        self._warmed = False

    def warm_symbol_cache(self):
        """Pre-load all symbol → (company_id, stock_id) mappings. Call once at startup."""
        try:
            # Single query: join stocks with companies to get symbol+ids in one round-trip
            stocks = self.db.table("stocks").select("id, company_id, companies(symbol)").execute()
            for row in (stocks.data or []):
                company = row.get("companies") or {}
                symbol = company.get("symbol")
                company_id = row.get("company_id")
                stock_id = row.get("id")
                if symbol and company_id and stock_id:
                    self._symbol_cache[symbol] = (company_id, stock_id)
            self._warmed = True
            logger.info(f"Symbol cache warmed: {len(self._symbol_cache)} symbols")
        except Exception as e:
            logger.error(f"Failed to warm symbol cache: {e}")

    def get_ids(self, symbol: str) -> Optional[Tuple[str, str]]:
        """Get (company_id, stock_id) for a symbol from cache."""
        return self._symbol_cache.get(symbol)

    # ─── Single-row writes (used outside sync loops) ───────────────────────────

    def update_stock_price(self, symbol: str, price_data: dict) -> bool:
        """Update stocks table with price data for a single symbol."""
        ids = self.get_ids(symbol)
        if not ids:
            return False
        _, stock_id = ids
        try:
            self.db.table("stocks").update(price_data).eq("id", stock_id).execute()
            return True
        except Exception as e:
            logger.debug(f"Error updating price for {symbol}: {e}")
            return False

    def upsert_stock_history(self, symbol: str, date_val: date, history_data: dict) -> bool:
        """Upsert a single stock_history row."""
        ids = self.get_ids(symbol)
        if not ids:
            return False
        _, stock_id = ids
        try:
            row = {**history_data, "stock_id": stock_id, "date": date_val.isoformat()}
            self.db.table("stock_history").upsert(
                row, on_conflict="stock_id,date"
            ).execute()
            return True
        except Exception as e:
            logger.debug(f"Error upserting history for {symbol}: {e}")
            return False

    def update_company(self, symbol: str, company_data: dict, logo_url: Optional[str] = None) -> bool:
        """Update companies table."""
        ids = self.get_ids(symbol)
        if not ids:
            return False
        company_id, _ = ids
        try:
            update = {**company_data}
            if logo_url:
                update["logo_url"] = logo_url
            if update:
                self.db.table("companies").update(update).eq("id", company_id).execute()
                return True
            return False
        except Exception as e:
            logger.debug(f"Error updating company {symbol}: {e}")
            return False

    def update_company_name(self, symbol: str, name: str) -> bool:
        """Update a single company name."""
        if not name or name == symbol:
            return False
        ids = self.get_ids(symbol)
        if not ids:
            return False
        company_id, _ = ids
        try:
            self.db.table("companies").update({"name": name}).eq("id", company_id).execute()
            return True
        except Exception as e:
            logger.debug(f"Error updating name for {symbol}: {e}")
            return False

    def update_stock_fundamentals(self, symbol: str, fundamentals_data: dict) -> bool:
        """Update stocks table with fundamentals/ratios."""
        ids = self.get_ids(symbol)
        if not ids:
            return False
        _, stock_id = ids
        try:
            if fundamentals_data:
                self.db.table("stocks").update(fundamentals_data).eq("id", stock_id).execute()
                return True
            return False
        except Exception as e:
            logger.debug(f"Error updating fundamentals for {symbol}: {e}")
            return False

    # ─── Batch writes (used in sync loops) ─────────────────────────────────────

    def batch_update_stock_prices(self, rows: List[dict]) -> int:
        """
        Batch upsert stock prices. Each row must include 'id' (stock_id).
        Returns count of rows processed.
        """
        if not rows:
            return 0
        count = 0
        for i in range(0, len(rows), BATCH_SIZE):
            batch = rows[i:i + BATCH_SIZE]
            try:
                self.db.table("stocks").upsert(batch, on_conflict="id").execute()
                count += len(batch)
            except Exception as e:
                logger.error(f"Error batch updating stock prices (chunk {i}): {e}")
        return count

    def batch_upsert_stock_history(self, rows: List[dict]) -> int:
        """
        Batch upsert stock history. Each row must include 'stock_id' and 'date'.
        Returns count of rows processed.
        """
        if not rows:
            return 0
        count = 0
        for i in range(0, len(rows), BATCH_SIZE):
            batch = rows[i:i + BATCH_SIZE]
            try:
                self.db.table("stock_history").upsert(
                    batch, on_conflict="stock_id,date"
                ).execute()
                count += len(batch)
            except Exception as e:
                logger.error(f"Error batch upserting stock history (chunk {i}): {e}")
        return count

    def batch_update_company_names(self, rows: List[dict]) -> None:
        """
        Batch update company names. Each row must include 'id' and 'name'.
        """
        if not rows:
            return
        for i in range(0, len(rows), BATCH_SIZE):
            batch = rows[i:i + BATCH_SIZE]
            try:
                self.db.table("companies").upsert(batch, on_conflict="id").execute()
            except Exception as e:
                logger.error(f"Error batch updating company names (chunk {i}): {e}")

    # ─── Financial statements ───────────────────────────────────────────────────

    def save_financial_statements(self, company_id: str, financials: List[FinancialPeriod]) -> int:
        """Batch upsert financial statements. Returns count saved."""
        fin_fields = [
            "revenue", "cost_of_revenue", "gross_profit", "operating_expenses",
            "operating_income", "ebitda", "interest_expense", "net_income", "eps",
            "total_assets", "current_assets", "non_current_assets",
            "total_liabilities", "current_liabilities", "non_current_liabilities",
            "total_equity", "operating_cash_flow", "investing_cash_flow",
            "financing_cash_flow", "net_cash_change", "free_cash_flow",
        ]

        rows = []
        for fp in financials:
            if not fp.fiscal_year:
                continue
            row = {
                "company_id": company_id,
                "period_type": fp.period_type,
                "fiscal_year": fp.fiscal_year,
                "quarter": fp.quarter,
            }
            for field_name in fin_fields:
                val = getattr(fp, field_name, None)
                if val is not None:
                    try:
                        row[field_name] = float(val)
                    except (ValueError, TypeError):
                        pass
            rows.append(row)

        if not rows:
            return 0

        # Try batch upsert using the unique constraint columns
        try:
            self.db.table("financial_statements").upsert(
                rows, on_conflict="company_id,period_type,fiscal_year,quarter"
            ).execute()
            return len(rows)
        except Exception:
            # Fallback: individual upserts (handles NULL quarter edge case)
            saved = 0
            for row in rows:
                try:
                    self.db.table("financial_statements").upsert(row).execute()
                    saved += 1
                except Exception as e:
                    logger.debug(f"Error saving financial FY{row.get('fiscal_year')}: {e}")
            return saved

    # ─── Company/stock creation ─────────────────────────────────────────────────

    def ensure_company_exists(
        self, symbol: str, name: str, sector_code: Optional[str] = None
    ) -> Optional[str]:
        """Create company + stock rows if they don't exist. Returns company_id."""
        if symbol in self._symbol_cache:
            return self._symbol_cache[symbol][0]

        try:
            existing = self.db.table("companies").select("id").eq("symbol", symbol).execute()
            if existing.data:
                company_id = existing.data[0]["id"]
                stock = self.db.table("stocks").select("id").eq("company_id", company_id).limit(1).execute()
                if stock.data:
                    self._symbol_cache[symbol] = (company_id, stock.data[0]["id"])
                    return company_id
                stock_row = self.db.table("stocks").insert({
                    "company_id": company_id,
                    "current_price": 0,
                    "last_updated": datetime.utcnow().isoformat(),
                }).execute()
                if stock_row.data:
                    self._symbol_cache[symbol] = (company_id, stock_row.data[0]["id"])
                return company_id

            sector_id = None
            if sector_code:
                sector_result = self.db.table("sectors").select("id").eq("code", sector_code).execute()
                if sector_result.data:
                    sector_id = sector_result.data[0]["id"]

            market_result = self.db.table("markets").select("id").limit(1).execute()
            market_id = market_result.data[0]["id"] if market_result.data else None

            company_insert = {"symbol": symbol, "name": name or symbol, "is_active": True}
            if sector_id:
                company_insert["sector_id"] = sector_id
            if market_id:
                company_insert["market_id"] = market_id

            company_result = self.db.table("companies").insert(company_insert).execute()
            if not company_result.data:
                return None

            company_id = company_result.data[0]["id"]
            stock_result = self.db.table("stocks").insert({
                "company_id": company_id,
                "current_price": 0,
                "last_updated": datetime.utcnow().isoformat(),
            }).execute()

            if stock_result.data:
                self._symbol_cache[symbol] = (company_id, stock_result.data[0]["id"])

            logger.info(f"Created new company + stock: {symbol}")
            return company_id

        except Exception as e:
            logger.error(f"Error ensuring company {symbol}: {e}")
            return None
