"""
Unified PSX Scraper — Single comprehensive scraper for all Pakistan Stock Exchange data.

Replaces: PSXScraper, TickerAnalystsScraper, FinancialStatementsScraper, FundamentalsScraper.

Data sources:
  - /market-watch       → all symbols + OHLCV price data
  - /company/{symbol}   → fundamentals + financials + ratios + equity + logo

Two operation modes:
  - scrape_market_prices()  → daily quick run, prices only (~1 request, ~10s)
  - scrape_full()           → weekly deep run, everything (~N+1 requests, ~3min)

Writes to 4 tables: companies, stocks, stock_history, financial_statements.
"""
import asyncio
import logging
import re
import time
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.scrapers.base_scraper import BaseScraper
from app.scrapers.stocks.psx_constants import COMPANY_WEBSITES, PSX_SECTOR_CODES
from app.db.supabase import get_supabase_service_client

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════
# Data Classes
# ═══════════════════════════════════════════════════════════════

@dataclass
class MarketWatchRow:
    symbol: str
    name: str
    sector_code: Optional[str] = None
    sector_name: Optional[str] = None
    listed_in: Optional[str] = None
    current_price: Optional[float] = None
    open_price: Optional[float] = None
    high_price: Optional[float] = None
    low_price: Optional[float] = None
    previous_close: Optional[float] = None
    change_amount: Optional[float] = None
    change_percentage: Optional[float] = None
    volume: Optional[int] = None


@dataclass
class CompanyInfo:
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    sector: Optional[str] = None


@dataclass
class FundamentalsData:
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    ps_ratio: Optional[float] = None
    peg_ratio: Optional[float] = None
    ev_ebitda: Optional[float] = None
    eps: Optional[float] = None
    book_value: Optional[float] = None
    dps: Optional[float] = None
    dividend_yield: Optional[float] = None
    shares_outstanding: Optional[int] = None
    float_shares: Optional[int] = None
    week_52_high: Optional[float] = None
    week_52_low: Optional[float] = None
    avg_volume: Optional[int] = None
    volume: Optional[int] = None
    current_price: Optional[float] = None
    change_amount: Optional[float] = None
    change_percentage: Optional[float] = None


@dataclass
class RatiosData:
    roe: Optional[float] = None
    roa: Optional[float] = None
    roce: Optional[float] = None
    gross_margin: Optional[float] = None
    operating_margin: Optional[float] = None
    net_margin: Optional[float] = None
    profit_margin: Optional[float] = None
    debt_to_equity: Optional[float] = None
    debt_to_assets: Optional[float] = None
    current_ratio: Optional[float] = None
    quick_ratio: Optional[float] = None
    interest_coverage: Optional[float] = None
    revenue_growth: Optional[float] = None
    earnings_growth: Optional[float] = None
    profit_growth: Optional[float] = None


@dataclass
class FinancialPeriod:
    fiscal_year: int
    period_type: str = "annual"
    quarter: Optional[int] = None
    revenue: Optional[float] = None
    cost_of_revenue: Optional[float] = None
    gross_profit: Optional[float] = None
    operating_expenses: Optional[float] = None
    operating_income: Optional[float] = None
    ebitda: Optional[float] = None
    interest_expense: Optional[float] = None
    net_income: Optional[float] = None
    eps: Optional[float] = None
    total_assets: Optional[float] = None
    current_assets: Optional[float] = None
    non_current_assets: Optional[float] = None
    total_liabilities: Optional[float] = None
    current_liabilities: Optional[float] = None
    non_current_liabilities: Optional[float] = None
    total_equity: Optional[float] = None
    operating_cash_flow: Optional[float] = None
    investing_cash_flow: Optional[float] = None
    financing_cash_flow: Optional[float] = None
    net_cash_change: Optional[float] = None
    free_cash_flow: Optional[float] = None


@dataclass
class EquityData:
    market_cap: Optional[float] = None
    shares_outstanding: Optional[int] = None
    free_float_pct: Optional[float] = None
    free_float_shares: Optional[int] = None


@dataclass
class CompanyFullData:
    symbol: str
    info: CompanyInfo = field(default_factory=CompanyInfo)
    fundamentals: FundamentalsData = field(default_factory=FundamentalsData)
    ratios: RatiosData = field(default_factory=RatiosData)
    financials: List[FinancialPeriod] = field(default_factory=list)
    equity: EquityData = field(default_factory=EquityData)


@dataclass
class ScrapeResult:
    mode: str
    symbols_found: int = 0
    prices_updated: int = 0
    history_saved: int = 0
    companies_updated: int = 0
    fundamentals_updated: int = 0
    financials_saved: int = 0
    errors: List[str] = field(default_factory=list)
    duration_seconds: float = 0.0


# ═══════════════════════════════════════════════════════════════
# Unified Scraper
# ═══════════════════════════════════════════════════════════════

class UnifiedPSXScraper(BaseScraper):
    """Single comprehensive scraper for all PSX data."""

    def __init__(
        self,
        batch_size: int = 5,
        batch_delay: float = 1.0,
        request_delay: float = 0.3,
    ):
        super().__init__(
            source_name="Pakistan Stock Exchange",
            base_url="https://dps.psx.com.pk",
        )
        self.batch_size = batch_size
        self.batch_delay = batch_delay
        self.request_delay = request_delay
        self.db = get_supabase_service_client()

    async def scrape(self) -> List[Dict[str, Any]]:
        """BaseScraper interface — runs daily price scrape."""
        result = await self.scrape_market_prices()
        return [{"result": result}]

    def parse_item(self, item: Any) -> Optional[Dict[str, Any]]:
        if isinstance(item, dict):
            return item
        return None

    # ───────────────────────────────────────────────────────
    # Public Modes
    # ───────────────────────────────────────────────────────

    async def scrape_market_prices(self) -> ScrapeResult:
        """DAILY mode: Fast price-only scrape from /market-watch."""
        result = ScrapeResult(mode="prices")
        start = time.time()

        try:
            html = await self.fetch(f"{self.base_url}/market-watch")
            if not html:
                result.errors.append("Failed to fetch /market-watch")
                return result

            rows = self._parse_market_watch(html)
            result.symbols_found = len(rows)
            logger.info(f"Parsed {len(rows)} stocks from market-watch")

            for row in rows:
                try:
                    saved = await self._save_market_data(row)
                    if saved:
                        result.prices_updated += 1
                        result.history_saved += 1
                except Exception as e:
                    result.errors.append(f"{row.symbol}: {e}")

        except Exception as e:
            result.errors.append(f"Market watch failed: {e}")
            logger.error(f"Market watch scrape failed: {e}")

        result.duration_seconds = time.time() - start
        logger.info(
            f"Daily scrape done: {result.prices_updated} prices, "
            f"{result.history_saved} history, {len(result.errors)} errors "
            f"in {result.duration_seconds:.1f}s"
        )
        return result

    async def scrape_full(self, symbols: Optional[List[str]] = None) -> ScrapeResult:
        """WEEKLY mode: Complete scrape — prices + company details + fundamentals + financials."""
        result = ScrapeResult(mode="full")
        start = time.time()

        # Phase 1: Market prices
        try:
            html = await self.fetch(f"{self.base_url}/market-watch")
            if not html:
                result.errors.append("CRITICAL: Failed to fetch /market-watch")
                return result

            market_rows = self._parse_market_watch(html)
            result.symbols_found = len(market_rows)
            logger.info(f"Phase 1: Parsed {len(market_rows)} stocks from market-watch")

            for row in market_rows:
                try:
                    if await self._save_market_data(row):
                        result.prices_updated += 1
                        result.history_saved += 1
                except Exception as e:
                    result.errors.append(f"{row.symbol} price: {e}")

        except Exception as e:
            result.errors.append(f"CRITICAL: Market watch failed: {e}")
            logger.error(f"Market watch scrape failed: {e}")
            return result

        # Phase 2: Company details (batched)
        target_symbols = symbols or [row.symbol for row in market_rows]
        logger.info(f"Phase 2: Fetching details for {len(target_symbols)} companies...")

        company_results = await self._fetch_companies_batched(target_symbols)
        logger.info(f"Phase 2: Got details for {len(company_results)} companies")

        # Phase 3: Save company data
        for symbol, data in company_results.items():
            try:
                company_saved, fundamentals_saved, financials_count = await self._save_company_full(symbol, data)
                if company_saved:
                    result.companies_updated += 1
                if fundamentals_saved:
                    result.fundamentals_updated += 1
                result.financials_saved += financials_count
            except Exception as e:
                result.errors.append(f"{symbol} save: {e}")
                logger.error(f"Error saving {symbol}: {e}")

        result.duration_seconds = time.time() - start
        logger.info(
            f"Full scrape done: {result.prices_updated} prices, "
            f"{result.companies_updated} companies, {result.fundamentals_updated} fundamentals, "
            f"{result.financials_saved} financials, {len(result.errors)} errors "
            f"in {result.duration_seconds:.1f}s"
        )
        return result

    async def scrape_company(self, symbol: str) -> Optional[CompanyFullData]:
        """Scrape everything for a single company."""
        html = await self.fetch(f"{self.base_url}/company/{symbol}")
        if not html:
            return None
        return self._parse_company_page(html, symbol)

    # ───────────────────────────────────────────────────────
    # Market Watch Parsing
    # ───────────────────────────────────────────────────────

    def _parse_market_watch(self, html: str) -> List[MarketWatchRow]:
        """Parse the market-watch HTML table."""
        rows = []
        soup = self.parse_html(html)

        table = soup.select_one("table.tbl")
        if not table:
            table = soup.select_one("table")
            if not table:
                logger.error("No table found in market-watch page")
                return rows

        tbody = table.select_one("tbody.tbl__body, tbody")
        tr_rows = tbody.select("tr") if tbody else table.select("tr")[1:]

        for tr in tr_rows:
            row = self._parse_market_watch_row(tr)
            if row:
                rows.append(row)

        return rows

    def _parse_market_watch_row(self, tr) -> Optional[MarketWatchRow]:
        """Parse a single row from the market-watch table."""
        try:
            cells = tr.select("td")
            if len(cells) < 10:
                return None

            first_cell = cells[0]
            symbol = first_cell.get("data-search") or first_cell.get("data-order")
            if not symbol:
                strong = first_cell.select_one("strong")
                if strong:
                    symbol = self.clean_text(strong.get_text())
            if not symbol:
                return None

            anchor = first_cell.select_one("a.tbl__symbol, a[data-title]")
            name = symbol
            if anchor:
                dt = anchor.get("data-title")
                if dt:
                    name = dt.replace("&amp;", "&")

            sector_code = self.clean_text(cells[1].get_text()) if len(cells) > 1 else None
            sector_name = PSX_SECTOR_CODES.get(sector_code) if sector_code else None
            listed_in = self.clean_text(cells[2].get_text()) if len(cells) > 2 else None

            def cell_val(cell):
                return cell.get("data-order") or self.clean_text(cell.get_text())

            return MarketWatchRow(
                symbol=symbol,
                name=name,
                sector_code=sector_code,
                sector_name=sector_name,
                listed_in=listed_in,
                previous_close=self._to_float(cell_val(cells[3])) if len(cells) > 3 else None,
                open_price=self._to_float(cell_val(cells[4])) if len(cells) > 4 else None,
                high_price=self._to_float(cell_val(cells[5])) if len(cells) > 5 else None,
                low_price=self._to_float(cell_val(cells[6])) if len(cells) > 6 else None,
                current_price=self._to_float(cell_val(cells[7])) if len(cells) > 7 else None,
                change_amount=self._to_float(cell_val(cells[8])) if len(cells) > 8 else None,
                change_percentage=self._to_float(cell_val(cells[9])) if len(cells) > 9 else None,
                volume=self._to_int(cell_val(cells[10])) if len(cells) > 10 else None,
            )
        except Exception as e:
            logger.debug(f"Error parsing market-watch row: {e}")
            return None

    # ───────────────────────────────────────────────────────
    # Company Page Parsing
    # ───────────────────────────────────────────────────────

    def _parse_company_page(self, html: str, symbol: str) -> CompanyFullData:
        """Master parser for a company page — extracts all data in one pass."""
        soup = self.parse_html(html)
        data = CompanyFullData(symbol=symbol)

        data.info = self._parse_company_info(soup, symbol)
        data.fundamentals = self._parse_fundamentals(soup)
        data.ratios = self._parse_ratios(soup)
        data.financials = self._parse_financials(soup, symbol)
        data.equity = self._parse_equity(soup)

        return data

    def _parse_company_info(self, soup, symbol: str) -> CompanyInfo:
        """Extract company name, description, logo from company page."""
        info = CompanyInfo()

        try:
            name_elem = soup.select_one(".quote__name")
            if name_elem:
                info.name = self.clean_text(name_elem.get_text()).replace("&amp;", "&")

            # Description from about/profile section
            desc_elem = soup.select_one(".company__about, .company__description, .profile__text")
            if desc_elem:
                info.description = self.clean_text(desc_elem.get_text())[:1000]

            # Sector from breadcrumb or sector link
            sector_link = soup.select_one("a[href*='/sector/']")
            if sector_link:
                info.sector = self.clean_text(sector_link.get_text())

            # Logo
            info.logo_url = self._extract_logo_url(soup, symbol)

        except Exception as e:
            logger.debug(f"Error parsing company info for {symbol}: {e}")

        return info

    def _parse_fundamentals(self, soup) -> FundamentalsData:
        """Extract fundamentals from company page tables and stat elements."""
        f = FundamentalsData()

        try:
            # Parse price from quote header
            price_elem = soup.select_one(".quote__close")
            if price_elem:
                f.current_price = self._to_float(
                    self.clean_text(price_elem.get_text()).replace("Rs.", "").replace(",", "")
                )

            change_elem = soup.select_one(".quote__change")
            if change_elem:
                text = self.clean_text(change_elem.get_text())
                match = re.search(r"([+-]?\d+\.?\d*)\s*\(([+-]?\d+\.?\d*)%\)", text)
                if match:
                    f.change_amount = self._to_float(match.group(1))
                    f.change_percentage = self._to_float(match.group(2))

            # Parse key-value pairs from tables
            for table in soup.select("table"):
                for row in table.select("tr"):
                    cells = row.select("td, th")
                    if len(cells) >= 2:
                        label = self.clean_text(cells[0].get_text()).lower()
                        value = self.clean_text(cells[-1].get_text())
                        self._map_fundamental(f, label, value)

            # Parse from definition lists
            for dl in soup.select("dl"):
                dts = dl.select("dt")
                dds = dl.select("dd")
                for dt, dd in zip(dts, dds):
                    label = self.clean_text(dt.get_text()).lower()
                    value = self.clean_text(dd.get_text())
                    self._map_fundamental(f, label, value)

            # Parse from stat divs
            for item in soup.select(".quote__stat, .stats__item, .info__row"):
                label_elem = item.select_one(".stat__label, .info__label, label")
                value_elem = item.select_one(".stat__value, .info__value, span")
                if label_elem and value_elem:
                    label = self.clean_text(label_elem.get_text()).lower()
                    value = self.clean_text(value_elem.get_text())
                    self._map_fundamental(f, label, value)

            # Regex fallbacks from page text
            text = soup.get_text()
            patterns = [
                (r"Market\s*Cap[:\s]+Rs\.?\s*([\d,\.]+)", "market_cap"),
                (r"P/E\s*(?:Ratio)?[:\s]+([\d,\.]+)", "pe_ratio"),
                (r"EPS[:\s]+Rs\.?\s*([\d,\.\-]+)", "eps"),
                (r"Dividend\s*Yield[:\s]+([\d,\.]+)%?", "dividend_yield"),
                (r"52[- ]?Week\s*High[:\s]+Rs\.?\s*([\d,\.]+)", "week_52_high"),
                (r"52[- ]?Week\s*Low[:\s]+Rs\.?\s*([\d,\.]+)", "week_52_low"),
                (r"Shares\s*Outstanding[:\s]+([\d,\.]+)", "shares_outstanding"),
                (r"Free\s*Float[:\s]+([\d,\.]+)", "float_shares"),
            ]
            for pattern, attr in patterns:
                if getattr(f, attr, None) is None:
                    match = re.search(pattern, text, re.IGNORECASE)
                    if match:
                        val = match.group(1)
                        if attr in ("shares_outstanding", "float_shares"):
                            setattr(f, attr, self._to_int(val))
                        else:
                            setattr(f, attr, self._to_float(val))

        except Exception as e:
            logger.debug(f"Error parsing fundamentals: {e}")

        return f

    def _map_fundamental(self, f: FundamentalsData, label: str, value: str):
        """Map a label-value pair to FundamentalsData fields."""
        if not label or not value:
            return

        # Price
        if ("current" in label or "close" in label) and "previous" not in label and "52" not in label:
            if f.current_price is None:
                f.current_price = self._to_float(value.replace("Rs.", "").replace(",", ""))
        elif "open" in label and "52" not in label:
            pass  # open from market-watch is more reliable
        elif "high" in label:
            if "52" in label or "week" in label:
                f.week_52_high = f.week_52_high or self._to_float(value.replace("Rs.", "").replace(",", ""))
            # daily high from market-watch
        elif "low" in label:
            if "52" in label or "week" in label:
                f.week_52_low = f.week_52_low or self._to_float(value.replace("Rs.", "").replace(",", ""))

        # Volume
        elif "volume" in label:
            if "avg" in label or "average" in label:
                f.avg_volume = f.avg_volume or self._to_int(value)
            else:
                f.volume = f.volume or self._to_int(value)

        # Valuation
        elif "market cap" in label or "mcap" in label:
            f.market_cap = f.market_cap or self._parse_large_number(value)
        elif "p/e" in label or "pe ratio" in label or "pe ttm" in label:
            f.pe_ratio = f.pe_ratio or self._to_float(value)
        elif "p/b" in label or "pb ratio" in label or "price to book" in label:
            f.pb_ratio = f.pb_ratio or self._to_float(value)
        elif "p/s" in label or "ps ratio" in label or "price to sales" in label:
            f.ps_ratio = f.ps_ratio or self._to_float(value)
        elif "peg" in label:
            f.peg_ratio = f.peg_ratio or self._to_float(value)
        elif "ev/ebitda" in label or "ev ebitda" in label:
            f.ev_ebitda = f.ev_ebitda or self._to_float(value)

        # Per share
        elif label == "eps" or "earnings per share" in label:
            f.eps = f.eps or self._to_float(value.replace("Rs.", ""))
        elif "dividend yield" in label or "div yield" in label:
            f.dividend_yield = f.dividend_yield or self._to_float(value.replace("%", ""))
        elif "book value" in label or "bvps" in label:
            f.book_value = f.book_value or self._to_float(value.replace("Rs.", ""))
        elif "dps" in label or "dividend per share" in label:
            f.dps = f.dps or self._to_float(value.replace("Rs.", ""))

        # Shares
        elif "shares outstanding" in label or "outstanding shares" in label:
            f.shares_outstanding = f.shares_outstanding or self._to_int(value)
        elif "free float" in label or "float" in label:
            f.float_shares = f.float_shares or self._to_int(value)

    def _parse_ratios(self, soup) -> RatiosData:
        """Extract ratio metrics from tables/sections."""
        r = RatiosData()

        try:
            for table in soup.select("table"):
                for row in table.select("tr"):
                    cells = row.select("td, th")
                    if len(cells) < 2:
                        continue
                    label = self.clean_text(cells[0].get_text()).lower()
                    value = self.clean_text(cells[-1].get_text())
                    self._map_ratio(r, label, value)
        except Exception as e:
            logger.debug(f"Error parsing ratios: {e}")

        return r

    def _map_ratio(self, r: RatiosData, label: str, value: str):
        """Map a label-value pair to RatiosData fields."""
        if not label or not value:
            return

        if "return on equity" in label or label == "roe":
            r.roe = r.roe or self._to_float(value.replace("%", ""))
        elif "return on assets" in label or label == "roa":
            r.roa = r.roa or self._to_float(value.replace("%", ""))
        elif "roce" in label or "return on capital" in label:
            r.roce = r.roce or self._to_float(value.replace("%", ""))
        elif "gross" in label and "margin" in label:
            r.gross_margin = r.gross_margin or self._to_float(value.replace("%", ""))
        elif "operating" in label and "margin" in label:
            r.operating_margin = r.operating_margin or self._to_float(value.replace("%", ""))
        elif "net" in label and ("margin" in label or "profit margin" in label):
            r.net_margin = r.net_margin or self._to_float(value.replace("%", ""))
        elif "profit margin" in label:
            r.profit_margin = r.profit_margin or self._to_float(value.replace("%", ""))
        elif "debt" in label and "equity" in label:
            r.debt_to_equity = r.debt_to_equity or self._to_float(value)
        elif "debt" in label and "asset" in label:
            r.debt_to_assets = r.debt_to_assets or self._to_float(value)
        elif "current ratio" in label:
            r.current_ratio = r.current_ratio or self._to_float(value)
        elif "quick ratio" in label:
            r.quick_ratio = r.quick_ratio or self._to_float(value)
        elif "interest coverage" in label:
            r.interest_coverage = r.interest_coverage or self._to_float(value)
        elif "revenue growth" in label or "sales growth" in label:
            r.revenue_growth = r.revenue_growth or self._to_float(value.replace("%", ""))
        elif "eps growth" in label or "earnings growth" in label:
            r.earnings_growth = r.earnings_growth or self._to_float(value.replace("%", ""))
        elif "profit growth" in label:
            r.profit_growth = r.profit_growth or self._to_float(value.replace("%", ""))

    def _parse_financials(self, soup, symbol: str) -> List[FinancialPeriod]:
        """Extract annual + quarterly financial statements from tables."""
        periods: List[FinancialPeriod] = []

        try:
            for table in soup.select("table"):
                headers = []
                header_row = table.select_one("thead tr, tr:first-child")
                if header_row:
                    headers = [self.clean_text(th.get_text()).strip()
                               for th in header_row.select("th, td")]

                # Annual year columns (e.g., "2024", "FY2024")
                year_cols = []
                for i, h in enumerate(headers):
                    ym = re.search(r"(20\d{2})", h)
                    if ym:
                        year_cols.append((i, int(ym.group(1))))

                # Quarterly columns (e.g., "Q1 2024")
                quarter_cols = []
                for i, h in enumerate(headers):
                    qm = re.search(r"Q(\d)\s*(20\d{2})", h)
                    if qm:
                        quarter_cols.append((i, int(qm.group(2)), int(qm.group(1))))

                if not year_cols and not quarter_cols:
                    continue

                data_rows = table.select("tbody tr, tr")
                for row in data_rows:
                    cells = row.select("td, th")
                    if len(cells) < 2:
                        continue
                    label = self.clean_text(cells[0].get_text()).lower()

                    # Process annual columns
                    for col_idx, year in year_cols:
                        if col_idx >= len(cells):
                            continue
                        val = self._parse_financial_number(
                            self.clean_text(cells[col_idx].get_text())
                        )
                        period = self._find_or_create_period(periods, year, "annual")
                        self._map_financial_field(period, label, val)

                    # Process quarterly columns
                    for col_idx, year, quarter in quarter_cols:
                        if col_idx >= len(cells):
                            continue
                        val = self._parse_financial_number(
                            self.clean_text(cells[col_idx].get_text())
                        )
                        period = self._find_or_create_period(periods, year, "quarterly", quarter)
                        self._map_financial_field(period, label, val)

        except Exception as e:
            logger.debug(f"Error parsing financials for {symbol}: {e}")

        return periods

    def _find_or_create_period(
        self, periods: List[FinancialPeriod], year: int, period_type: str, quarter: Optional[int] = None
    ) -> FinancialPeriod:
        """Find existing period or create new one."""
        for p in periods:
            if p.fiscal_year == year and p.period_type == period_type and p.quarter == quarter:
                return p
        new_period = FinancialPeriod(fiscal_year=year, period_type=period_type, quarter=quarter)
        periods.append(new_period)
        return new_period

    def _map_financial_field(self, period: FinancialPeriod, label: str, value: Optional[float]):
        """Map a financial table label to a FinancialPeriod field."""
        if value is None:
            return

        if any(kw in label for kw in ["sales", "revenue", "turnover", "mark-up earned", "markup earned"]):
            period.revenue = period.revenue or value
        elif any(kw in label for kw in ["profit after tax", "net profit", "net income", "profit/(loss)"]):
            period.net_income = period.net_income or value
        elif "eps" in label or "earning per share" in label or "earnings per share" in label:
            period.eps = period.eps or value
        elif "gross profit" in label:
            period.gross_profit = period.gross_profit or value
        elif "cost of" in label and ("revenue" in label or "sales" in label or "goods" in label):
            period.cost_of_revenue = period.cost_of_revenue or value
        elif "operating" in label and ("profit" in label or "income" in label) and "cash" not in label:
            period.operating_income = period.operating_income or value
        elif "operating" in label and "expense" in label:
            period.operating_expenses = period.operating_expenses or value
        elif "ebitda" in label:
            period.ebitda = period.ebitda or value
        elif "interest" in label and "expense" in label:
            period.interest_expense = period.interest_expense or value
        elif "total assets" in label:
            period.total_assets = period.total_assets or value
        elif "current assets" in label and "non" not in label:
            period.current_assets = period.current_assets or value
        elif "non" in label and "current" in label and "asset" in label:
            period.non_current_assets = period.non_current_assets or value
        elif "total liabilities" in label:
            period.total_liabilities = period.total_liabilities or value
        elif "current liabilities" in label and "non" not in label:
            period.current_liabilities = period.current_liabilities or value
        elif "non" in label and "current" in label and "liabilit" in label:
            period.non_current_liabilities = period.non_current_liabilities or value
        elif "total equity" in label or "shareholders equity" in label or "shareholder" in label:
            period.total_equity = period.total_equity or value
        elif ("operating" in label or "operations" in label) and "cash" in label:
            period.operating_cash_flow = period.operating_cash_flow or value
        elif "investing" in label and "cash" in label:
            period.investing_cash_flow = period.investing_cash_flow or value
        elif "financing" in label and "cash" in label:
            period.financing_cash_flow = period.financing_cash_flow or value
        elif "free cash flow" in label:
            period.free_cash_flow = period.free_cash_flow or value
        elif "net" in label and "cash" in label and "change" in label:
            period.net_cash_change = period.net_cash_change or value

    def _parse_equity(self, soup) -> EquityData:
        """Extract equity/shares info."""
        eq = EquityData()

        try:
            for table in soup.select("table"):
                for row in table.select("tr"):
                    cells = row.select("td, th")
                    if len(cells) < 2:
                        continue
                    label = self.clean_text(cells[0].get_text()).lower()
                    value = self.clean_text(cells[-1].get_text())

                    if "market cap" in label:
                        eq.market_cap = eq.market_cap or self._parse_large_number(value)
                    elif "shares" in label and ("outstanding" in label or "total" in label):
                        eq.shares_outstanding = eq.shares_outstanding or self._to_int(value.replace(",", ""))
                    elif "free float" in label:
                        if "%" in value:
                            eq.free_float_pct = eq.free_float_pct or self._to_float(value.replace("%", ""))
                        else:
                            eq.free_float_shares = eq.free_float_shares or self._to_int(value.replace(",", ""))

            # Also check stat divs
            for item in soup.select(".stat, .info__row, [class*='stat']"):
                label_elem = item.select_one("label, .stat__label, .info__label, span:first-child")
                value_elem = item.select_one(".stat__value, .info__value, span:last-child")
                if label_elem and value_elem:
                    label = self.clean_text(label_elem.get_text()).lower()
                    value = self.clean_text(value_elem.get_text())
                    if "market cap" in label:
                        eq.market_cap = eq.market_cap or self._parse_large_number(value)
                    elif "free float" in label and "%" in value:
                        eq.free_float_pct = eq.free_float_pct or self._to_float(value.replace("%", ""))

        except Exception as e:
            logger.debug(f"Error parsing equity: {e}")

        return eq

    def _extract_logo_url(self, soup, symbol: str) -> Optional[str]:
        """Extract company logo URL from PSX page or Clearbit fallback."""
        # Try PSX page logo
        for selector in ["img.quote__logo", "img.company__logo", ".quote__header img", ".company-header img"]:
            img = soup.select_one(selector)
            if img and img.get("src"):
                src = img["src"]
                if not src.startswith("http"):
                    src = f"{self.base_url}{src}"
                return src

        # Clearbit fallback
        if symbol in COMPANY_WEBSITES:
            return f"https://logo.clearbit.com/{COMPANY_WEBSITES[symbol]}"

        # UI Avatars fallback
        initials = symbol[:2].upper()
        colors = ["0ea5e9", "8b5cf6", "ec4899", "f97316", "22c55e", "06b6d4", "6366f1", "f43f5e"]
        color_idx = sum(ord(c) for c in symbol) % len(colors)
        return f"https://ui-avatars.com/api/?name={initials}&background={colors[color_idx]}&color=fff&size=128&bold=true&format=png"

    # ───────────────────────────────────────────────────────
    # Batched Fetching
    # ───────────────────────────────────────────────────────

    async def _fetch_companies_batched(self, symbols: List[str]) -> Dict[str, CompanyFullData]:
        """Fetch company pages in controlled batches."""
        results: Dict[str, CompanyFullData] = {}
        total = len(symbols)

        for i in range(0, total, self.batch_size):
            batch = symbols[i:i + self.batch_size]

            tasks = []
            for j, sym in enumerate(batch):
                tasks.append(self._fetch_and_parse_company(sym, delay=j * self.request_delay))

            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            for sym, res in zip(batch, batch_results):
                if isinstance(res, CompanyFullData):
                    results[sym] = res
                elif isinstance(res, Exception):
                    logger.debug(f"Failed to scrape {sym}: {res}")

            done = min(i + self.batch_size, total)
            if done % 50 == 0 or done == total:
                logger.info(f"  Progress: {done}/{total} companies fetched")

            if i + self.batch_size < total:
                await asyncio.sleep(self.batch_delay)

        return results

    async def _fetch_and_parse_company(self, symbol: str, delay: float = 0) -> CompanyFullData:
        """Fetch and parse a single company page."""
        if delay > 0:
            await asyncio.sleep(delay)

        html = await self.fetch(f"{self.base_url}/company/{symbol}")
        if not html:
            raise ValueError(f"Failed to fetch page for {symbol}")

        return self._parse_company_page(html, symbol)

    # ───────────────────────────────────────────────────────
    # Database Writes
    # ───────────────────────────────────────────────────────

    async def _save_market_data(self, row: MarketWatchRow) -> bool:
        """Save price data to stocks + stock_history for one symbol."""
        try:
            # Find company
            company_result = self.db.table("companies").select("id").eq(
                "symbol", row.symbol
            ).execute()
            if not company_result.data:
                return False

            company_id = company_result.data[0]["id"]

            # Find stock
            stock_result = self.db.table("stocks").select("id").eq(
                "company_id", company_id
            ).execute()
            if not stock_result.data:
                return False

            stock_id = stock_result.data[0]["id"]

            # Update stocks table — price columns
            update = {"last_updated": datetime.utcnow().isoformat()}
            if row.current_price is not None:
                update["current_price"] = row.current_price
            if row.open_price is not None:
                update["open_price"] = row.open_price
            if row.high_price is not None:
                update["high_price"] = row.high_price
            if row.low_price is not None:
                update["low_price"] = row.low_price
            if row.previous_close is not None:
                update["previous_close"] = row.previous_close
            if row.change_amount is not None:
                update["change_amount"] = row.change_amount
            if row.change_percentage is not None:
                update["change_percentage"] = row.change_percentage
            if row.volume is not None:
                update["volume"] = row.volume

            self.db.table("stocks").update(update).eq("id", stock_id).execute()

            # Upsert stock_history
            today = date.today().isoformat()
            history_data = {
                "stock_id": stock_id,
                "date": today,
                "open_price": row.open_price,
                "high_price": row.high_price,
                "low_price": row.low_price,
                "close_price": row.current_price,
                "volume": row.volume,
            }
            self.db.table("stock_history").upsert(
                history_data, on_conflict="stock_id,date"
            ).execute()

            # Update company name if we have a better one
            if row.name and row.name != row.symbol:
                self.db.table("companies").update(
                    {"name": row.name}
                ).eq("id", company_id).execute()

            return True

        except Exception as e:
            logger.debug(f"Error saving market data for {row.symbol}: {e}")
            return False

    async def _save_company_full(
        self, symbol: str, data: CompanyFullData
    ) -> Tuple[bool, bool, int]:
        """Save all company data. Returns (company_saved, fundamentals_saved, financials_count)."""
        company_saved = False
        fundamentals_saved = False
        financials_count = 0

        try:
            # Find company
            company_result = self.db.table("companies").select("id, logo_url").eq(
                "symbol", symbol
            ).execute()
            if not company_result.data:
                return (False, False, 0)

            company_id = company_result.data[0]["id"]
            current_logo = company_result.data[0].get("logo_url")

            # Update company info
            company_update = {}
            if data.info.name and data.info.name != symbol:
                company_update["name"] = data.info.name
            if data.info.description:
                company_update["description"] = data.info.description
            if data.info.logo_url and (
                not current_logo
                or "ui-avatars" in (current_logo or "")
                or "placeholder" in (current_logo or "")
            ):
                company_update["logo_url"] = data.info.logo_url

            if company_update:
                self.db.table("companies").update(company_update).eq("id", company_id).execute()
                company_saved = True

            # Find stock
            stock_result = self.db.table("stocks").select("id").eq(
                "company_id", company_id
            ).execute()
            if not stock_result.data:
                return (company_saved, False, 0)

            stock_id = stock_result.data[0]["id"]

            # Update fundamentals on stocks table
            stock_update = {"last_updated": datetime.utcnow().isoformat()}
            fund = data.fundamentals
            ratios = data.ratios
            eq = data.equity

            # Fundamentals
            fund_fields = {
                "market_cap": fund.market_cap or eq.market_cap,
                "pe_ratio": fund.pe_ratio,
                "pb_ratio": fund.pb_ratio,
                "ps_ratio": fund.ps_ratio,
                "peg_ratio": fund.peg_ratio,
                "ev_ebitda": fund.ev_ebitda,
                "eps": fund.eps,
                "book_value": fund.book_value,
                "dps": fund.dps,
                "dividend_yield": fund.dividend_yield,
                "shares_outstanding": fund.shares_outstanding or eq.shares_outstanding,
                "float_shares": fund.float_shares or eq.free_float_shares,
                "week_52_high": fund.week_52_high,
                "week_52_low": fund.week_52_low,
                "avg_volume": fund.avg_volume,
            }

            # Ratios
            ratio_fields = {
                "roe": ratios.roe,
                "roa": ratios.roa,
                "roce": ratios.roce,
                "gross_margin": ratios.gross_margin,
                "operating_margin": ratios.operating_margin,
                "net_margin": ratios.net_margin,
                "profit_margin": ratios.profit_margin,
                "debt_to_equity": ratios.debt_to_equity,
                "debt_to_assets": ratios.debt_to_assets,
                "current_ratio": ratios.current_ratio,
                "quick_ratio": ratios.quick_ratio,
                "interest_coverage": ratios.interest_coverage,
                "revenue_growth": ratios.revenue_growth,
                "earnings_growth": ratios.earnings_growth,
                "profit_growth": ratios.profit_growth,
            }

            for k, v in {**fund_fields, **ratio_fields}.items():
                if v is not None:
                    try:
                        stock_update[k] = float(v) if not isinstance(v, int) else v
                    except (ValueError, TypeError):
                        pass

            if len(stock_update) > 1:  # More than just last_updated
                self.db.table("stocks").update(stock_update).eq("id", stock_id).execute()
                fundamentals_saved = True

            # Save financial statements
            financials_count = await self._save_financial_statements(company_id, data.financials)

        except Exception as e:
            logger.error(f"Error saving full data for {symbol}: {e}")

        return (company_saved, fundamentals_saved, financials_count)

    async def _save_financial_statements(
        self, company_id: str, financials: List[FinancialPeriod]
    ) -> int:
        """Upsert financial statements. Returns count saved."""
        saved = 0

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

                fin_fields = [
                    "revenue", "cost_of_revenue", "gross_profit", "operating_expenses",
                    "operating_income", "ebitda", "interest_expense", "net_income", "eps",
                    "total_assets", "current_assets", "non_current_assets",
                    "total_liabilities", "current_liabilities", "non_current_liabilities",
                    "total_equity", "operating_cash_flow", "investing_cash_flow",
                    "financing_cash_flow", "net_cash_change", "free_cash_flow",
                ]

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

    # ───────────────────────────────────────────────────────
    # Parsing Utilities
    # ───────────────────────────────────────────────────────

    def _to_float(self, value: Any) -> Optional[float]:
        """Parse any value to float. Handles commas, %, Rs., empty/dash."""
        if value is None:
            return None
        try:
            if isinstance(value, (int, float)):
                return float(value)
            s = str(value).replace(",", "").replace("%", "").replace("Rs.", "").replace("Rs", "").strip()
            if not s or s in ("-", "--", "N/A", "n/a", "None"):
                return None
            return float(s)
        except (ValueError, TypeError):
            return None

    def _to_int(self, value: Any) -> Optional[int]:
        """Parse any value to int via float intermediate."""
        f = self._to_float(value)
        return int(f) if f is not None else None

    def _parse_financial_number(self, value: str) -> Optional[float]:
        """Parse financial statement numbers (handles parenthesized negatives, 000s)."""
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

    def _parse_large_number(self, value: Any) -> Optional[float]:
        """Parse numbers with suffixes: B, M, K, Cr, L and currency prefixes."""
        if value is None:
            return None
        s = str(value).strip().upper()
        for prefix in ["RS.", "RS", "PKR", "$"]:
            s = s.replace(prefix, "")
        s = s.strip()
        if not s or s in ("-", "--"):
            return None

        try:
            multiplier = 1
            if s.endswith("CRORE") or s.endswith("CR"):
                s = s.replace("CRORE", "").replace("CR", "").strip()
                multiplier = 1e7
            elif s.endswith("LAKH") or s.endswith("LAC") or s.endswith("L"):
                s = s.replace("LAKH", "").replace("LAC", "").replace("L", "").strip()
                multiplier = 1e5
            elif s.endswith("B"):
                s = s.replace("B", "").strip()
                multiplier = 1e9
            elif s.endswith("M"):
                s = s.replace("M", "").strip()
                multiplier = 1e6
            elif s.endswith("K"):
                s = s.replace("K", "").strip()
                multiplier = 1e3

            s = s.replace(",", "")
            return float(s) * multiplier
        except (ValueError, TypeError):
            return None
