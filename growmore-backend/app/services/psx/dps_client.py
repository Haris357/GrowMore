"""
DPS PSX Portal client (dps.psx.com.pk).

Secondary data source for:
- Bulk market-watch prices (1 HTML request, ~650 stocks)
- Financial statements from company pages
- EOD historical data
"""
import asyncio
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
from bs4 import BeautifulSoup

from app.config.settings import settings
from .constants import PSX_SECTOR_CODES, COMPANY_WEBSITES

logger = logging.getLogger(__name__)


# ── Data Classes (migrated from unified_psx_scraper.py) ──

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


class DPSPortalClient:
    """Client for DPS PSX Portal — HTML scraping for bulk prices and financial statements."""

    def __init__(self):
        self._base_url = settings.dps_psx_base_url
        self._headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

    async def _fetch(self, url: str, max_retries: int = 3) -> Optional[str]:
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(30.0, connect=15.0),
                    verify=False,
                    follow_redirects=True,
                ) as client:
                    response = await client.get(url, headers=self._headers)
                    response.raise_for_status()
                    return response.text
            except httpx.HTTPStatusError as e:
                logger.warning(f"HTTP {e.response.status_code} for {url} (attempt {attempt + 1})")
            except httpx.RequestError as e:
                logger.warning(f"Request error for {url}: {e} (attempt {attempt + 1})")
            if attempt < max_retries - 1:
                await asyncio.sleep(2.0 * (attempt + 1))
        logger.error(f"Failed to fetch {url} after {max_retries} attempts")
        return None

    def _parse_html(self, html: str) -> BeautifulSoup:
        return BeautifulSoup(html, "html.parser")

    def _clean_text(self, text: Optional[str]) -> str:
        if not text:
            return ""
        return " ".join(text.split()).strip()

    # ── Market Watch ──

    async def fetch_market_watch(self) -> List[MarketWatchRow]:
        """Fetch and parse /market-watch. Returns all ~650 stocks with OHLCV."""
        html = await self._fetch(f"{self._base_url}/market-watch")
        if not html:
            raise RuntimeError("Failed to fetch DPS market-watch")
        return self._parse_market_watch(html)

    def _parse_market_watch(self, html: str) -> List[MarketWatchRow]:
        rows = []
        soup = self._parse_html(html)

        table = soup.select_one("table.tbl") or soup.select_one("table")
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
        try:
            cells = tr.select("td")
            if len(cells) < 10:
                return None

            first_cell = cells[0]
            symbol = first_cell.get("data-search") or first_cell.get("data-order")
            if not symbol:
                strong = first_cell.select_one("strong")
                if strong:
                    symbol = self._clean_text(strong.get_text())
            if not symbol:
                return None

            anchor = first_cell.select_one("a.tbl__symbol, a[data-title]")
            name = symbol
            if anchor:
                dt = anchor.get("data-title")
                if dt:
                    name = dt.replace("&amp;", "&")

            sector_code = self._clean_text(cells[1].get_text()) if len(cells) > 1 else None
            sector_name = PSX_SECTOR_CODES.get(sector_code) if sector_code else None
            listed_in = self._clean_text(cells[2].get_text()) if len(cells) > 2 else None

            def cell_val(cell):
                return cell.get("data-order") or self._clean_text(cell.get_text())

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

    # ── Company Page (Financial Statements + Fundamentals + Ratios) ──

    async def fetch_company_data(self, symbol: str) -> Optional[CompanyFullData]:
        """Fetch and parse /company/{symbol} for financials, fundamentals, ratios."""
        html = await self._fetch(f"{self._base_url}/company/{symbol}")
        if not html:
            return None
        return self._parse_company_page(html, symbol)

    def _parse_company_page(self, html: str, symbol: str) -> CompanyFullData:
        soup = self._parse_html(html)
        data = CompanyFullData(symbol=symbol)
        data.info = self._parse_company_info(soup, symbol)
        data.fundamentals = self._parse_fundamentals(soup)
        data.ratios = self._parse_ratios(soup)
        data.financials = self._parse_financials(soup, symbol)
        data.equity = self._parse_equity(soup)
        # Authoritative pass: DPS stat tiles (div.stats_label + div.stats_value).
        # These are the reliable source for market cap, P/E, 52-week range,
        # shares outstanding, and free float — override anything guessed above.
        self._parse_stats_blocks(soup, data.fundamentals, data.equity)
        # Prefer the latest *completed* annual EPS. DPS lists the current fiscal
        # year as an "annual" row too, but it only holds year-to-date figures
        # (e.g. one quarter), so exclude it. The inline page EPS is unreliable.
        if data.financials:
            current_year = datetime.now().year
            annual = sorted(
                [
                    p for p in data.financials
                    if p.period_type == "annual" and p.eps is not None
                    and p.fiscal_year < current_year
                ],
                key=lambda p: p.fiscal_year,
                reverse=True,
            )
            if annual:
                data.fundamentals.eps = annual[0].eps
        return data

    def _parse_stats_blocks(self, soup, f: "FundamentalsData", eq: "EquityData") -> None:
        """
        Parse the DPS company-page stat tiles: <div class="stats_label"> paired with
        the following <div class="stats_value">. Authoritative for the valuation
        fundamentals the PSX Terminal API used to provide.
        """
        try:
            for lab in soup.select("div.stats_label"):
                label = self._clean_text(lab.get_text()).lower()
                val_el = lab.find_next_sibling()
                if val_el is None:
                    continue
                value = self._clean_text(val_el.get_text())
                if not value:
                    continue

                if "market cap" in label:
                    # DPS reports market cap in thousands (000's).
                    mc = self._to_float(value)
                    if mc is not None:
                        f.market_cap = mc * 1000
                        eq.market_cap = mc * 1000
                elif "p/e" in label:
                    pe = self._to_float(value)
                    if pe is not None:
                        f.pe_ratio = pe
                elif "52" in label and "range" in label:
                    lo, hi = self._parse_range(value)
                    if lo is not None:
                        f.week_52_low = lo
                    if hi is not None:
                        f.week_52_high = hi
                elif label.startswith("shares"):
                    sh = self._to_int(value)
                    if sh:
                        f.shares_outstanding = sh
                        eq.shares_outstanding = sh
                elif "free float" in label:
                    if "%" in value:
                        pct = self._to_float(value)
                        if pct is not None:
                            eq.free_float_pct = pct
                    else:
                        ff = self._to_int(value)
                        if ff:
                            f.float_shares = ff
                            eq.free_float_shares = ff
                elif label == "volume" and f.volume is None:
                    v = self._to_int(value)
                    if v:
                        f.volume = v
        except Exception as e:
            logger.debug(f"Error parsing stats blocks: {e}")

    def _parse_range(self, text: str) -> tuple:
        """Split a '200.01 – 369.99' style range into (low, high), separator-agnostic."""
        nums = re.findall(r"[\d,]+\.?\d*", text or "")
        if len(nums) >= 2:
            return self._to_float(nums[0]), self._to_float(nums[1])
        return None, None

    def _parse_company_info(self, soup, symbol: str) -> CompanyInfo:
        info = CompanyInfo()
        try:
            name_elem = soup.select_one(".quote__name")
            if name_elem:
                info.name = self._clean_text(name_elem.get_text()).replace("&amp;", "&")

            desc_elem = soup.select_one(".company__about, .company__description, .profile__text")
            if desc_elem:
                info.description = self._clean_text(desc_elem.get_text())[:1000]

            sector_link = soup.select_one("a[href*='/sector/']")
            if sector_link:
                info.sector = self._clean_text(sector_link.get_text())

            info.logo_url = self._extract_logo_url(soup, symbol)
        except Exception as e:
            logger.debug(f"Error parsing company info for {symbol}: {e}")
        return info

    def _parse_fundamentals(self, soup) -> FundamentalsData:
        f = FundamentalsData()
        try:
            price_elem = soup.select_one(".quote__close")
            if price_elem:
                f.current_price = self._to_float(
                    self._clean_text(price_elem.get_text()).replace("Rs.", "").replace(",", "")
                )

            change_elem = soup.select_one(".quote__change")
            if change_elem:
                text = self._clean_text(change_elem.get_text())
                match = re.search(r"([+-]?\d+\.?\d*)\s*\(([+-]?\d+\.?\d*)%\)", text)
                if match:
                    f.change_amount = self._to_float(match.group(1))
                    f.change_percentage = self._to_float(match.group(2))

            for table in soup.select("table"):
                for row in table.select("tr"):
                    cells = row.select("td, th")
                    if len(cells) >= 2:
                        label = self._clean_text(cells[0].get_text()).lower()
                        value = self._clean_text(cells[-1].get_text())
                        self._map_fundamental(f, label, value)

            for dl in soup.select("dl"):
                dts = dl.select("dt")
                dds = dl.select("dd")
                for dt, dd in zip(dts, dds):
                    label = self._clean_text(dt.get_text()).lower()
                    value = self._clean_text(dd.get_text())
                    self._map_fundamental(f, label, value)

            for item in soup.select(".quote__stat, .stats__item, .info__row"):
                label_elem = item.select_one(".stat__label, .info__label, label")
                value_elem = item.select_one(".stat__value, .info__value, span")
                if label_elem and value_elem:
                    label = self._clean_text(label_elem.get_text()).lower()
                    value = self._clean_text(value_elem.get_text())
                    self._map_fundamental(f, label, value)

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
        if not label or not value:
            return

        if ("current" in label or "close" in label) and "previous" not in label and "52" not in label:
            if f.current_price is None:
                f.current_price = self._to_float(value.replace("Rs.", "").replace(",", ""))
        elif "high" in label:
            if "52" in label or "week" in label:
                f.week_52_high = f.week_52_high or self._to_float(value.replace("Rs.", "").replace(",", ""))
        elif "low" in label:
            if "52" in label or "week" in label:
                f.week_52_low = f.week_52_low or self._to_float(value.replace("Rs.", "").replace(",", ""))
        elif "volume" in label:
            if "avg" in label or "average" in label:
                f.avg_volume = f.avg_volume or self._to_int(value)
            else:
                f.volume = f.volume or self._to_int(value)
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
        elif label == "eps" or "earnings per share" in label:
            f.eps = f.eps or self._to_float(value.replace("Rs.", ""))
        elif "dividend yield" in label or "div yield" in label:
            f.dividend_yield = f.dividend_yield or self._to_float(value.replace("%", ""))
        elif "book value" in label or "bvps" in label:
            f.book_value = f.book_value or self._to_float(value.replace("Rs.", ""))
        elif "dps" in label or "dividend per share" in label:
            f.dps = f.dps or self._to_float(value.replace("Rs.", ""))
        elif "shares outstanding" in label or "outstanding shares" in label:
            f.shares_outstanding = f.shares_outstanding or self._to_int(value)
        elif "free float" in label or "float" in label:
            f.float_shares = f.float_shares or self._to_int(value)

    def _parse_ratios(self, soup) -> RatiosData:
        r = RatiosData()
        try:
            for table in soup.select("table"):
                for row in table.select("tr"):
                    cells = row.select("td, th")
                    if len(cells) < 2:
                        continue
                    label = self._clean_text(cells[0].get_text()).lower()
                    value = self._clean_text(cells[-1].get_text())
                    self._map_ratio(r, label, value)
        except Exception as e:
            logger.debug(f"Error parsing ratios: {e}")
        return r

    def _map_ratio(self, r: RatiosData, label: str, value: str):
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
        periods: List[FinancialPeriod] = []
        try:
            for table in soup.select("table"):
                headers = []
                header_row = table.select_one("thead tr, tr:first-child")
                if header_row:
                    headers = [self._clean_text(th.get_text()).strip()
                               for th in header_row.select("th, td")]

                year_cols = []
                for i, h in enumerate(headers):
                    ym = re.search(r"(20\d{2})", h)
                    if ym:
                        year_cols.append((i, int(ym.group(1))))

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
                    label = self._clean_text(cells[0].get_text()).lower()

                    for col_idx, year in year_cols:
                        if col_idx >= len(cells):
                            continue
                        val = self._parse_financial_number(
                            self._clean_text(cells[col_idx].get_text())
                        )
                        period = self._find_or_create_period(periods, year, "annual")
                        self._map_financial_field(period, label, val)

                    for col_idx, year, quarter in quarter_cols:
                        if col_idx >= len(cells):
                            continue
                        val = self._parse_financial_number(
                            self._clean_text(cells[col_idx].get_text())
                        )
                        period = self._find_or_create_period(periods, year, "quarterly", quarter)
                        self._map_financial_field(period, label, val)
        except Exception as e:
            logger.debug(f"Error parsing financials for {symbol}: {e}")
        return periods

    def _find_or_create_period(
        self, periods: List[FinancialPeriod], year: int, period_type: str, quarter: Optional[int] = None
    ) -> FinancialPeriod:
        for p in periods:
            if p.fiscal_year == year and p.period_type == period_type and p.quarter == quarter:
                return p
        new_period = FinancialPeriod(fiscal_year=year, period_type=period_type, quarter=quarter)
        periods.append(new_period)
        return new_period

    def _map_financial_field(self, period: FinancialPeriod, label: str, value: Optional[float]):
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
        eq = EquityData()
        try:
            for table in soup.select("table"):
                for row in table.select("tr"):
                    cells = row.select("td, th")
                    if len(cells) < 2:
                        continue
                    label = self._clean_text(cells[0].get_text()).lower()
                    value = self._clean_text(cells[-1].get_text())
                    if "market cap" in label:
                        eq.market_cap = eq.market_cap or self._parse_large_number(value)
                    elif "shares" in label and ("outstanding" in label or "total" in label):
                        eq.shares_outstanding = eq.shares_outstanding or self._to_int(value.replace(",", ""))
                    elif "free float" in label:
                        if "%" in value:
                            eq.free_float_pct = eq.free_float_pct or self._to_float(value.replace("%", ""))
                        else:
                            eq.free_float_shares = eq.free_float_shares or self._to_int(value.replace(",", ""))

            for item in soup.select(".stat, .info__row, [class*='stat']"):
                label_elem = item.select_one("label, .stat__label, .info__label, span:first-child")
                value_elem = item.select_one(".stat__value, .info__value, span:last-child")
                if label_elem and value_elem:
                    label = self._clean_text(label_elem.get_text()).lower()
                    value = self._clean_text(value_elem.get_text())
                    if "market cap" in label:
                        eq.market_cap = eq.market_cap or self._parse_large_number(value)
                    elif "free float" in label and "%" in value:
                        eq.free_float_pct = eq.free_float_pct or self._to_float(value.replace("%", ""))
        except Exception as e:
            logger.debug(f"Error parsing equity: {e}")
        return eq

    def _extract_logo_url(self, soup, symbol: str) -> Optional[str]:
        for selector in ["img.quote__logo", "img.company__logo", ".quote__header img", ".company-header img"]:
            img = soup.select_one(selector)
            if img and img.get("src"):
                src = img["src"]
                if not src.startswith("http"):
                    src = f"{self._base_url}{src}"
                return src

        if symbol in COMPANY_WEBSITES:
            return f"https://logo.clearbit.com/{COMPANY_WEBSITES[symbol]}"

        initials = symbol[:2].upper()
        colors = ["0ea5e9", "8b5cf6", "ec4899", "f97316", "22c55e", "06b6d4", "6366f1", "f43f5e"]
        color_idx = sum(ord(c) for c in symbol) % len(colors)
        return f"https://ui-avatars.com/api/?name={initials}&background={colors[color_idx]}&color=fff&size=128&bold=true&format=png"

    # ── Historical OHLCV (POST /historical) ──

    async def fetch_historical(
        self, symbol: str, months: int = 24
    ) -> List[Dict[str, Any]]:
        """
        Fetch historical OHLCV data from DPS /historical endpoint.
        Goes back `months` months. Returns list of dicts sorted by date:
        [{date: "2024-03-09", open: 344.74, high: 359.99, low: 344.74, close: 344.97, volume: 3897451}]
        """
        from dateutil.relativedelta import relativedelta
        from datetime import date as date_cls

        today = date_cls.today()
        start = today - relativedelta(months=months)

        all_rows: List[Dict[str, Any]] = []
        current = date_cls(start.year, start.month, 1)

        while current <= today:
            try:
                rows = await self._fetch_historical_month(symbol, current.year, current.month)
                all_rows.extend(rows)
            except Exception as e:
                logger.debug(f"Error fetching history for {symbol} {current.year}-{current.month}: {e}")
            current += relativedelta(months=1)

        # Filter to exact date range and sort
        start_iso = start.isoformat()
        today_iso = today.isoformat()
        filtered = [
            r for r in all_rows
            if r.get("date") and start_iso <= r["date"] <= today_iso
        ]
        filtered.sort(key=lambda r: r["date"])
        return filtered

    async def _fetch_historical_month(
        self, symbol: str, year: int, month: int
    ) -> List[Dict[str, Any]]:
        """Fetch one month of historical data via POST /historical."""
        rows: List[Dict[str, Any]] = []
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, connect=15.0),
                verify=False,
                follow_redirects=True,
            ) as client:
                response = await client.post(
                    f"{self._base_url}/historical",
                    data={"month": month, "year": year, "symbol": symbol},
                    headers=self._headers,
                )
                response.raise_for_status()
                html = response.text
        except Exception as e:
            logger.debug(f"HTTP error fetching history {symbol} {year}-{month}: {e}")
            return rows

        soup = self._parse_html(html)
        headers = [h.getText().strip().upper() for h in soup.select("th")]
        if not headers:
            return rows

        # Find column indices — PSX uses "DATE " (with trailing space)
        col_map: Dict[str, int] = {}
        for i, h in enumerate(headers):
            hc = h.strip()
            if hc in ("DATE", "TIME"):
                col_map["date"] = i
            elif hc == "OPEN":
                col_map["open"] = i
            elif hc == "HIGH":
                col_map["high"] = i
            elif hc == "LOW":
                col_map["low"] = i
            elif hc == "CLOSE":
                col_map["close"] = i
            elif hc == "VOLUME":
                col_map["volume"] = i

        if "date" not in col_map:
            return rows

        max_idx = max(col_map.values())
        for tr in soup.select("tr"):
            cells = [c.getText().strip() for c in tr.select("td")]
            if not cells or len(cells) <= max_idx:
                continue
            try:
                date_str = cells[col_map["date"]]
                dt = datetime.strptime(date_str, "%b %d, %Y").date()
                row: Dict[str, Any] = {"date": dt.isoformat()}
                for key in ("open", "high", "low", "close"):
                    if key in col_map:
                        row[key] = self._to_float(cells[col_map[key]])
                if "volume" in col_map:
                    row["volume"] = self._to_int(cells[col_map["volume"]])
                rows.append(row)
            except (ValueError, IndexError):
                continue
        return rows

    # ── EOD History (timeseries JSON) ──

    async def fetch_eod_history(self, symbol: str) -> List[dict]:
        """Fetch /timeseries/eod/{symbol} → [{timestamp, close, volume, open}]."""
        url = f"{self._base_url}/timeseries/eod/{symbol}"
        html = await self._fetch(url)
        if not html:
            return []
        try:
            import json
            data = json.loads(html)
            if data.get("status") != 1:
                return []
            result = []
            for row in data.get("data", []):
                if len(row) >= 4:
                    result.append({
                        "timestamp": row[0],
                        "close": row[1],
                        "volume": row[2],
                        "open": row[3],
                    })
            return result
        except Exception as e:
            logger.debug(f"Error parsing EOD history for {symbol}: {e}")
            return []

    # ── Market Activity (announcements feed + payouts) ──

    async def _post(self, url: str, data: Dict[str, Any], max_retries: int = 3) -> Optional[str]:
        headers = {**self._headers, "X-Requested-With": "XMLHttpRequest"}
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(30.0, connect=15.0), verify=False, follow_redirects=True
                ) as client:
                    response = await client.post(url, data=data, headers=headers)
                    response.raise_for_status()
                    return response.text
            except (httpx.HTTPStatusError, httpx.RequestError) as e:
                logger.warning(f"POST {url} failed (attempt {attempt + 1}): {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(1.5 * (attempt + 1))
        return None

    @staticmethod
    def _classify_activity(title: str) -> str:
        t = (title or "").lower()
        if any(k in t for k in ["sold", "bought", "purchase of shares", "disposal of shares",
                                 "disclosure of interest", "acquisition of shares", "shares by",
                                 "sale of shares", "closed period"]):
            return "insider"
        if any(k in t for k in ["financial result", "financial statement", "quarterly", "half year",
                                 "half-year", "annual accounts", "nine month", "earning", "profit"]):
            return "earnings"
        if any(k in t for k in ["dividend", "bonus", "book closure", "payout", "entitlement", "right issue"]):
            return "payout"
        return "announcement"

    async def fetch_market_activity(self, query: str = "", offset: int = 0, count: int = 100) -> List[Dict[str, Any]]:
        """Fetch the PSX announcements feed (date, time, title, category, document_url)."""
        html = await self._post("https://dps.psx.com.pk/announcements", {
            "type": "psx", "symbol": "", "query": query, "count": count,
            "offset": offset, "date_from": "", "date_to": "", "page": "annc",
        })
        if not html:
            return []
        soup = self._parse_html(html)
        out: List[Dict[str, Any]] = []
        for tr in soup.select("tr"):
            cells = tr.select("td")
            if len(cells) < 3:
                continue
            date_label = self._clean_text(cells[0].get_text())
            time_label = self._clean_text(cells[1].get_text())
            title = self._clean_text(cells[2].get_text())
            if not title:
                continue
            doc_url = None
            link = tr.select_one("a[href]")
            if link:
                href = link.get("href", "")
                if href and not href.lower().startswith("javascript"):
                    doc_url = href if href.startswith("http") else f"{self._base_url}{href}"
            out.append({
                "date": date_label,
                "time": time_label,
                "title": title,
                "category": self._classify_activity(title),
                "document_url": doc_url,
            })
        return out

    async def fetch_payouts(self, count: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Fetch the payouts (dividends/bonus) feed."""
        html = await self._post("https://dps.psx.com.pk/payouts", {
            "symbol": "", "query": "", "count": count, "offset": offset,
            "date_from": "", "date_to": "", "page": "payouts",
        })
        if not html:
            return []
        soup = self._parse_html(html)
        out: List[Dict[str, Any]] = []
        for tr in soup.select("tr"):
            cells = tr.select("td")
            if len(cells) < 5:
                continue
            vals = [self._clean_text(c.get_text()) for c in cells]
            symbol = vals[0]
            if not symbol:
                continue
            out.append({
                "symbol": symbol,
                "company": vals[1] if len(vals) > 1 else "",
                "sector": vals[2] if len(vals) > 2 else "",
                "payout": vals[3] if len(vals) > 3 else "",
                "date": vals[4] if len(vals) > 4 else "",
                "book_closure": vals[5] if len(vals) > 5 else "",
                "category": "payout",
            })
        return out

    # ── Company Announcements (Activities) ──

    async def fetch_company_announcements(self, symbol: str) -> List[Dict[str, Any]]:
        """
        Fetch the "Company Announcements" table from /company/{symbol}.
        Returns normalized activity items: date, title, category, priority, document_url.
        """
        html = await self._fetch(f"{self._base_url}/company/{symbol}")
        if not html:
            return []
        return self._parse_announcements(html)

    def _parse_announcements(self, html: str) -> List[Dict[str, Any]]:
        soup = self._parse_html(html)
        for table in soup.select("table"):
            headers = [self._clean_text(th.get_text()).lower() for th in table.select("th")]
            if "title" not in headers or "date" not in headers:
                continue
            di, ti = headers.index("date"), headers.index("title")
            body = table.select_one("tbody") or table
            out: List[Dict[str, Any]] = []
            for tr in body.select("tr"):
                cells = tr.select("td")
                if len(cells) <= max(di, ti):
                    continue
                title = self._clean_text(cells[ti].get_text())
                if not title:
                    continue
                date_label = self._clean_text(cells[di].get_text())
                doc_url = None
                link = tr.select_one("a[href]")
                if link:
                    href = link.get("href", "")
                    if href and not href.lower().startswith("javascript"):
                        doc_url = href if href.startswith("http") else f"{self._base_url}{href}"
                category, priority = self._classify_announcement(title)
                out.append({
                    "date": self._parse_announcement_date(date_label),
                    "date_label": date_label,
                    "title": title,
                    "category": category,
                    "priority": priority,
                    "document_url": doc_url,
                })
            return out
        return []

    def _parse_announcement_date(self, raw: str) -> Optional[str]:
        for fmt in ("%b %d, %Y", "%B %d, %Y", "%d %b %Y", "%Y-%m-%d"):
            try:
                return datetime.strptime(raw.strip(), fmt).date().isoformat()
            except (ValueError, TypeError):
                continue
        return None

    def _classify_announcement(self, title: str) -> tuple:
        """Derive (category, priority) from an announcement title. priority ∈ critical|high|medium."""
        t = title.lower()
        if any(k in t for k in ("merger", "acquisition", "amalgamation", "scheme of arrangement", "joint venture", "spin-off")):
            return "Corporate Action", "critical"
        if "dividend" in t or "bonus" in t or "right" in t and "share" in t:
            return "Dividend", "high"
        if "financial result" in t or "financial statement" in t:
            return "Financial Result", "high"
        if any(k in t for k in ("quarterly report", "half yearly", "half-yearly", "annual report", "transmission of")):
            return "Report", "medium"
        if "board" in t and ("meeting" in t or "directors" in t):
            return "Board Meeting", "medium"
        if any(k in t for k in ("notice", "advertisement", "postal ballot", "agm", "egm")):
            return "Notice", "medium"
        return "Announcement", "medium"

    # ── Utility Parsers ──

    def _to_float(self, value: Any) -> Optional[float]:
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
        f = self._to_float(value)
        return int(f) if f is not None else None

    def _parse_financial_number(self, value: str) -> Optional[float]:
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
