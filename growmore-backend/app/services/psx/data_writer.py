"""
Supabase data writer — all database write operations for PSX data.

Writes to: companies, stocks, stock_history, financial_statements tables.
Uses a warm symbol cache to avoid N+2 DB lookups per symbol.
"""
import logging
from datetime import date, datetime
from typing import Dict, List, Optional, Tuple

from app.db.supabase import get_supabase_service_client
from .dps_client import FinancialPeriod

logger = logging.getLogger(__name__)


class PSXDataWriter:
    def __init__(self):
        self.db = get_supabase_service_client()
        self._symbol_cache: Dict[str, Tuple[str, str]] = {}  # symbol -> (company_id, stock_id)
        self._warmed = False

    def warm_symbol_cache(self):
        """Pre-load all symbol → (company_id, stock_id) mappings. Call once at startup."""
        try:
            companies = self.db.table("companies").select("id, symbol").execute()
            for company in (companies.data or []):
                symbol = company.get("symbol")
                company_id = company.get("id")
                if not symbol or not company_id:
                    continue
                stock_result = self.db.table("stocks").select("id").eq(
                    "company_id", company_id
                ).limit(1).execute()
                if stock_result.data:
                    self._symbol_cache[symbol] = (company_id, stock_result.data[0]["id"])
            self._warmed = True
            logger.info(f"Symbol cache warmed: {len(self._symbol_cache)} symbols")
        except Exception as e:
            logger.error(f"Failed to warm symbol cache: {e}")

    def get_ids(self, symbol: str) -> Optional[Tuple[str, str]]:
        """Get (company_id, stock_id) for a symbol from cache."""
        return self._symbol_cache.get(symbol)

    def update_stock_price(self, symbol: str, price_data: dict) -> bool:
        """Update stocks table with price data."""
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
        """Upsert a stock_history row."""
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
                # Only update logo if current one is placeholder
                current = self.db.table("companies").select("logo_url").eq(
                    "id", company_id
                ).execute()
                current_logo = current.data[0].get("logo_url", "") if current.data else ""
                if not current_logo or "ui-avatars" in current_logo or "placeholder" in current_logo:
                    update["logo_url"] = logo_url
            if update:
                self.db.table("companies").update(update).eq("id", company_id).execute()
                return True
            return False
        except Exception as e:
            logger.debug(f"Error updating company {symbol}: {e}")
            return False

    def update_company_name(self, symbol: str, name: str) -> bool:
        """Update company name if we have a better one."""
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

    def save_financial_statements(self, company_id: str, financials: List[FinancialPeriod]) -> int:
        """Upsert financial statements. Returns count saved."""
        saved = 0
        fin_fields = [
            "revenue", "cost_of_revenue", "gross_profit", "operating_expenses",
            "operating_income", "ebitda", "interest_expense", "net_income", "eps",
            "total_assets", "current_assets", "non_current_assets",
            "total_liabilities", "current_liabilities", "non_current_liabilities",
            "total_equity", "operating_cash_flow", "investing_cash_flow",
            "financing_cash_flow", "net_cash_change", "free_cash_flow",
        ]

        for fp in financials:
            try:
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

                # Check existing
                query = self.db.table("financial_statements").select("id").eq(
                    "company_id", company_id
                ).eq("period_type", fp.period_type).eq("fiscal_year", fp.fiscal_year)

                if fp.quarter:
                    query = query.eq("quarter", fp.quarter)
                else:
                    query = query.is_("quarter", "null")

                existing = query.execute()

                if existing.data:
                    self.db.table("financial_statements").update(row).eq(
                        "id", existing.data[0]["id"]
                    ).execute()
                else:
                    self.db.table("financial_statements").insert(row).execute()

                saved += 1
            except Exception as e:
                logger.debug(f"Error saving financial FY{fp.fiscal_year}: {e}")

        return saved

    def ensure_company_exists(
        self, symbol: str, name: str, sector_code: Optional[str] = None
    ) -> Optional[str]:
        """Create company + stock rows if they don't exist. Returns company_id."""
        if symbol in self._symbol_cache:
            return self._symbol_cache[symbol][0]

        try:
            # Check if company already exists
            existing = self.db.table("companies").select("id").eq("symbol", symbol).execute()
            if existing.data:
                company_id = existing.data[0]["id"]
                # Check stock
                stock = self.db.table("stocks").select("id").eq("company_id", company_id).execute()
                if stock.data:
                    self._symbol_cache[symbol] = (company_id, stock.data[0]["id"])
                    return company_id
                # Create stock row
                stock_row = self.db.table("stocks").insert({
                    "company_id": company_id,
                    "current_price": 0,
                    "last_updated": datetime.utcnow().isoformat(),
                }).execute()
                if stock_row.data:
                    self._symbol_cache[symbol] = (company_id, stock_row.data[0]["id"])
                return company_id

            # Look up sector_id
            sector_id = None
            if sector_code:
                sector_result = self.db.table("sectors").select("id").eq("code", sector_code).execute()
                if sector_result.data:
                    sector_id = sector_result.data[0]["id"]

            # Look up market_id (PSX)
            market_result = self.db.table("markets").select("id").limit(1).execute()
            market_id = market_result.data[0]["id"] if market_result.data else None

            company_insert = {
                "symbol": symbol,
                "name": name or symbol,
                "is_active": True,
            }
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
