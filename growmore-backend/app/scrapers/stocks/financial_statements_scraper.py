"""
Financial Statements Scraper for PSX Stocks.
Scrapes income statement, balance sheet, cash flow, and ratio data
from PSX Data Portal (dps.psx.com.pk).
"""
import asyncio
import logging
import re
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from app.scrapers.base_scraper import BaseScraper

logger = logging.getLogger(__name__)


class FinancialStatementsScraper(BaseScraper):
    """Scraper for financial statements from PSX Data Portal."""

    def __init__(self):
        super().__init__(
            source_name="PSX Financial Statements",
            base_url="https://dps.psx.com.pk",
        )

    async def scrape(self) -> List[Dict[str, Any]]:
        """Not used directly — use scrape_company_financials instead."""
        return []

    def parse_item(self, item: Any) -> Optional[Dict[str, Any]]:
        if isinstance(item, dict):
            return item
        return None

    async def scrape_company_financials(self, symbol: str) -> Dict[str, Any]:
        """Scrape all financial data for a company from PSX.

        Returns dict with keys: financials (list of yearly data), ratios, equity_info
        """
        result = {
            "symbol": symbol,
            "financials": [],
            "ratios": {},
            "equity_info": {},
        }

        url = f"{self.base_url}/company/{symbol}"
        html = await self.fetch(url)
        if not html:
            logger.warning(f"Failed to fetch PSX page for {symbol}")
            return result

        soup = self.parse_html(html)

        # Parse FINANCIALS tab data
        result["financials"] = self._parse_financials_tab(soup, symbol)

        # Parse RATIOS tab data
        result["ratios"] = self._parse_ratios_tab(soup, symbol)

        # Parse EQUITY tab data
        result["equity_info"] = self._parse_equity_tab(soup, symbol)

        return result

    def _parse_financials_tab(self, soup, symbol: str) -> List[Dict[str, Any]]:
        """Parse the FINANCIALS section from the company page.

        PSX shows annual data: Sales, Profit after Tax, EPS for multiple years.
        Also quarterly data.
        """
        financials = []

        try:
            # Look for financial data tables
            # PSX uses div-based layouts with tables inside tabs
            tables = soup.select("table")

            for table in tables:
                headers = []
                header_row = table.select_one("thead tr, tr:first-child")
                if header_row:
                    headers = [self.clean_text(th.get_text()).strip()
                               for th in header_row.select("th, td")]

                # Look for year headers like "2024", "2023", "FY2024" etc.
                year_columns = []
                for i, h in enumerate(headers):
                    year_match = re.search(r"(20\d{2})", h)
                    if year_match:
                        year_columns.append((i, int(year_match.group(1))))

                if not year_columns:
                    continue

                rows = table.select("tbody tr, tr")
                for row in rows:
                    cells = row.select("td, th")
                    if len(cells) < 2:
                        continue

                    label = self.clean_text(cells[0].get_text()).lower()

                    for col_idx, year in year_columns:
                        if col_idx >= len(cells):
                            continue

                        value_text = self.clean_text(cells[col_idx].get_text())
                        value = self._parse_financial_number(value_text)

                        # Find or create the year entry
                        year_entry = None
                        for f in financials:
                            if f.get("fiscal_year") == year:
                                year_entry = f
                                break
                        if not year_entry:
                            year_entry = {
                                "fiscal_year": year,
                                "period_type": "annual",
                                "symbol": symbol,
                            }
                            financials.append(year_entry)

                        # Map labels to fields
                        if any(kw in label for kw in ["sales", "revenue", "turnover", "mark-up earned", "markup earned"]):
                            year_entry["revenue"] = value
                        elif any(kw in label for kw in ["profit after tax", "net profit", "net income", "profit/(loss)"]):
                            year_entry["net_income"] = value
                        elif "eps" in label or "earning per share" in label or "earnings per share" in label:
                            year_entry["eps"] = value
                        elif "total income" in label:
                            year_entry["total_income"] = value
                        elif "gross profit" in label:
                            year_entry["gross_profit"] = value
                        elif "operating" in label and ("profit" in label or "income" in label):
                            year_entry["operating_income"] = value
                        elif "ebitda" in label:
                            year_entry["ebitda"] = value
                        elif "total assets" in label:
                            year_entry["total_assets"] = value
                        elif "total liabilities" in label:
                            year_entry["total_liabilities"] = value
                        elif "total equity" in label or "shareholders equity" in label:
                            year_entry["total_equity"] = value
                        elif "current assets" in label:
                            year_entry["current_assets"] = value
                        elif "current liabilities" in label:
                            year_entry["current_liabilities"] = value
                        elif "operating cash" in label or "cash from operations" in label:
                            year_entry["operating_cash_flow"] = value
                        elif "investing" in label and "cash" in label:
                            year_entry["investing_cash_flow"] = value
                        elif "financing" in label and "cash" in label:
                            year_entry["financing_cash_flow"] = value
                        elif "free cash flow" in label:
                            year_entry["free_cash_flow"] = value

            # Also try to parse quarterly data sections
            quarterly = self._parse_quarterly_data(soup, symbol)
            financials.extend(quarterly)

        except Exception as e:
            logger.error(f"Error parsing financials for {symbol}: {e}")

        logger.info(f"Parsed {len(financials)} financial periods for {symbol}")
        return financials

    def _parse_quarterly_data(self, soup, symbol: str) -> List[Dict[str, Any]]:
        """Parse quarterly financial data if available."""
        quarterly = []
        try:
            # Look for quarterly tables (often labeled Q1, Q2, Q3, Q4)
            for table in soup.select("table"):
                headers = []
                header_row = table.select_one("thead tr, tr:first-child")
                if header_row:
                    headers = [self.clean_text(th.get_text()).strip()
                               for th in header_row.select("th, td")]

                quarter_columns = []
                for i, h in enumerate(headers):
                    q_match = re.search(r"Q(\d)\s*(20\d{2})", h)
                    if q_match:
                        quarter_columns.append((i, int(q_match.group(2)), int(q_match.group(1))))

                if not quarter_columns:
                    continue

                rows = table.select("tbody tr, tr")
                for row in rows:
                    cells = row.select("td, th")
                    if len(cells) < 2:
                        continue

                    label = self.clean_text(cells[0].get_text()).lower()

                    for col_idx, year, quarter in quarter_columns:
                        if col_idx >= len(cells):
                            continue

                        value_text = self.clean_text(cells[col_idx].get_text())
                        value = self._parse_financial_number(value_text)

                        q_entry = None
                        for q in quarterly:
                            if q.get("fiscal_year") == year and q.get("quarter") == quarter:
                                q_entry = q
                                break
                        if not q_entry:
                            q_entry = {
                                "fiscal_year": year,
                                "quarter": quarter,
                                "period_type": "quarterly",
                                "symbol": symbol,
                            }
                            quarterly.append(q_entry)

                        if any(kw in label for kw in ["sales", "revenue", "turnover", "mark-up earned"]):
                            q_entry["revenue"] = value
                        elif any(kw in label for kw in ["profit after tax", "net profit", "net income"]):
                            q_entry["net_income"] = value
                        elif "eps" in label:
                            q_entry["eps"] = value

        except Exception as e:
            logger.error(f"Error parsing quarterly data for {symbol}: {e}")

        return quarterly

    def _parse_ratios_tab(self, soup, symbol: str) -> Dict[str, Any]:
        """Parse the RATIOS section."""
        ratios = {}
        try:
            for table in soup.select("table"):
                rows = table.select("tr")
                for row in rows:
                    cells = row.select("td, th")
                    if len(cells) < 2:
                        continue
                    label = self.clean_text(cells[0].get_text()).lower()
                    value = self.clean_text(cells[-1].get_text())

                    if "net profit margin" in label:
                        ratios["net_profit_margin"] = self._parse_decimal(value)
                    elif "gross profit margin" in label:
                        ratios["gross_profit_margin"] = self._parse_decimal(value)
                    elif "operating margin" in label or "operating profit margin" in label:
                        ratios["operating_margin"] = self._parse_decimal(value)
                    elif "eps growth" in label:
                        ratios["eps_growth"] = self._parse_decimal(value)
                    elif "peg" in label:
                        ratios["peg"] = self._parse_decimal(value)
                    elif "return on equity" in label or label == "roe":
                        ratios["roe"] = self._parse_decimal(value)
                    elif "return on assets" in label or label == "roa":
                        ratios["roa"] = self._parse_decimal(value)
                    elif "debt" in label and "equity" in label:
                        ratios["debt_to_equity"] = self._parse_decimal(value)
                    elif "current ratio" in label:
                        ratios["current_ratio"] = self._parse_decimal(value)
        except Exception as e:
            logger.error(f"Error parsing ratios for {symbol}: {e}")

        return ratios

    def _parse_equity_tab(self, soup, symbol: str) -> Dict[str, Any]:
        """Parse the EQUITY section."""
        equity = {}
        try:
            for table in soup.select("table"):
                rows = table.select("tr")
                for row in rows:
                    cells = row.select("td, th")
                    if len(cells) < 2:
                        continue
                    label = self.clean_text(cells[0].get_text()).lower()
                    value = self.clean_text(cells[-1].get_text())

                    if "market cap" in label:
                        equity["market_cap"] = self._parse_large_number(value)
                    elif "shares" in label and ("outstanding" in label or "total" in label):
                        equity["shares_outstanding"] = self._parse_int(value.replace(",", ""))
                    elif "free float" in label:
                        if "%" in value:
                            equity["free_float_pct"] = self._parse_decimal(value)
                        else:
                            equity["free_float_shares"] = self._parse_int(value.replace(",", ""))

            # Also look for stat divs
            for item in soup.select(".stat, .info__row, [class*='stat']"):
                label_elem = item.select_one("label, .stat__label, .info__label, span:first-child")
                value_elem = item.select_one(".stat__value, .info__value, span:last-child")
                if label_elem and value_elem:
                    label = self.clean_text(label_elem.get_text()).lower()
                    value = self.clean_text(value_elem.get_text())
                    if "market cap" in label:
                        equity["market_cap"] = self._parse_large_number(value)
                    elif "free float" in label and "%" in value:
                        equity["free_float_pct"] = self._parse_decimal(value)

        except Exception as e:
            logger.error(f"Error parsing equity for {symbol}: {e}")

        return equity

    async def scrape_all_financials(self, symbols: List[str]) -> List[Dict[str, Any]]:
        """Scrape financial statements for multiple symbols."""
        results = []
        total = len(symbols)

        for i, symbol in enumerate(symbols):
            logger.info(f"Scraping financials for {symbol} ({i+1}/{total})")
            data = await self.scrape_company_financials(symbol)
            if data and data.get("financials"):
                results.append(data)
            await asyncio.sleep(0.5)

        logger.info(f"Scraped financials for {len(results)}/{total} symbols")
        return results

    def _parse_financial_number(self, value: str) -> Optional[float]:
        """Parse a financial number that may be in thousands (000's)."""
        if not value:
            return None
        value = value.strip().replace(",", "").replace("(", "-").replace(")", "")
        value = re.sub(r"[^\d.\-]", "", value)
        if not value or value == "-":
            return None
        try:
            return float(value)
        except ValueError:
            return None

    def _parse_decimal(self, value: Any) -> Optional[float]:
        if value is None:
            return None
        try:
            if isinstance(value, str):
                value = value.replace(",", "").replace("%", "").strip()
                if not value or value in ("-", "--", "n/a", "N/A"):
                    return None
            return float(str(value))
        except Exception:
            return None

    def _parse_int(self, value: Any) -> Optional[int]:
        if value is None:
            return None
        try:
            if isinstance(value, str):
                value = value.replace(",", "").strip()
                if not value or value in ("-", "--"):
                    return None
            return int(float(value))
        except Exception:
            return None

    def _parse_large_number(self, value: str) -> Optional[float]:
        if not value:
            return None
        value = value.strip().upper()
        for prefix in ["RS.", "RS", "PKR", "$"]:
            value = value.replace(prefix, "")
        value = value.strip()
        if not value or value in ("-", "--"):
            return None
        try:
            multiplier = 1
            if value.endswith("CR") or value.endswith("CRORE"):
                value = value.replace("CRORE", "").replace("CR", "").strip()
                multiplier = 10000000
            elif value.endswith("L") or value.endswith("LAKH"):
                value = value.replace("LAKH", "").replace("L", "").strip()
                multiplier = 100000
            elif value.endswith("B"):
                value = value.replace("B", "").strip()
                multiplier = 1000000000
            elif value.endswith("M"):
                value = value.replace("M", "").strip()
                multiplier = 1000000
            elif value.endswith("K"):
                value = value.replace("K", "").strip()
                multiplier = 1000
            value = value.replace(",", "")
            return float(value) * multiplier
        except Exception:
            return None


def get_financial_statements_scraper():
    return FinancialStatementsScraper()
