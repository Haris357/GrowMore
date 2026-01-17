"""
PSX Stock Fundamentals Scraper
Scrapes comprehensive stock data from the Pakistan Stock Exchange (PSX).

Strategy:
1. Get all symbols from dps.psx.com.pk/market-watch
2. Fetch each company's detail page at dps.psx.com.pk/company/{symbol}
3. Extract fundamentals: PE, EPS, Market Cap, Margins, 52-Week Range, Free Float, etc.

Fallbacks: SCS Trade, KHI Stocks
"""
import asyncio
import logging
import re
import json
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class TickerAnalystsScraper:
    """
    Multi-source scraper for PSX stock fundamentals.
    Tries multiple Pakistani financial data sources for comprehensive coverage.
    """

    def __init__(self):
        self.timeout = 60.0
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
        }

    async def scrape(self) -> List[Dict[str, Any]]:
        """Scrape PSX stocks with fundamentals from multiple sources."""
        logger.info("Starting PSX fundamentals scrape from multiple sources")
        all_stocks = []

        try:
            # Try PSX Screener first (official source with PE, market cap, dividend yield)
            stocks = await self._scrape_psx_screener()
            if stocks:
                logger.info(f"Got {len(stocks)} stocks from PSX Screener")
                all_stocks = stocks

            # Fallback to PSX Data Portal
            if not all_stocks:
                stocks = await self._scrape_psx_portal()
                if stocks:
                    logger.info(f"Got {len(stocks)} stocks from PSX Portal")
                    all_stocks = stocks

            # Fallback to SCS Trade
            if not all_stocks:
                stocks = await self._scrape_scstrade()
                if stocks:
                    logger.info(f"Got {len(stocks)} stocks from SCS Trade")
                    all_stocks = stocks

            # Fallback to KHI Stocks
            if not all_stocks:
                stocks = await self._scrape_khistocks()
                if stocks:
                    logger.info(f"Got {len(stocks)} stocks from KHI Stocks")
                    all_stocks = stocks

            logger.info(f"Total scraped: {len(all_stocks)} stocks with fundamentals")
            return all_stocks

        except Exception as e:
            logger.error(f"Error scraping fundamentals: {e}")
            return []

    async def _scrape_psx_screener(self) -> List[Dict[str, Any]]:
        """Scrape from official PSX - get symbols from market-watch, then fetch each company page."""
        stocks = []
        symbols = []

        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            try:
                # Step 1: Get all symbols from market-watch
                response = await client.get(
                    "https://dps.psx.com.pk/market-watch",
                    headers=self.headers
                )

                if response.status_code == 200:
                    symbols = self._extract_symbols_from_market_watch(response.text)
                    logger.info(f"Found {len(symbols)} symbols from market-watch")

                if not symbols:
                    # Fallback: try screener page
                    response = await client.get(
                        "https://dps.psx.com.pk/screener",
                        headers=self.headers
                    )
                    if response.status_code == 200:
                        stocks = self._parse_psx_screener(response.text)
                        if stocks:
                            return stocks

                # Step 2: Fetch company details for each symbol (with rate limiting)
                if symbols:
                    logger.info(f"Fetching details for {len(symbols)} companies...")

                    # Process in batches to avoid overwhelming the server
                    batch_size = 10
                    for i in range(0, len(symbols), batch_size):
                        batch = symbols[i:i + batch_size]

                        # Fetch batch concurrently
                        tasks = [
                            self._fetch_company_details(client, symbol)
                            for symbol in batch
                        ]
                        results = await asyncio.gather(*tasks, return_exceptions=True)

                        for result in results:
                            if isinstance(result, dict) and result.get("symbol"):
                                stocks.append(result)

                        # Small delay between batches
                        if i + batch_size < len(symbols):
                            await asyncio.sleep(0.5)

                    logger.info(f"Successfully fetched {len(stocks)} company details")

            except Exception as e:
                logger.warning(f"PSX Screener scraping failed: {e}")

        return stocks

    def _extract_symbols_from_market_watch(self, html: str) -> List[str]:
        """Extract all stock symbols from market-watch page."""
        symbols = []
        soup = BeautifulSoup(html, "html.parser")

        table = soup.find("table")
        if not table:
            return symbols

        rows = table.find_all("tr")[1:]  # Skip header
        for row in rows:
            try:
                cells = row.find_all("td")
                if cells:
                    symbol = self._clean_text(cells[0].get_text())
                    if symbol and len(symbol) <= 10 and symbol.isalpha():
                        symbols.append(symbol.upper())
            except Exception:
                continue

        return symbols

    async def _fetch_company_details(self, client: httpx.AsyncClient, symbol: str) -> Optional[Dict[str, Any]]:
        """Fetch full company details from /company/{symbol} page."""
        try:
            response = await client.get(
                f"https://dps.psx.com.pk/company/{symbol}",
                headers=self.headers
            )

            if response.status_code == 200:
                return self._parse_company_page(response.text, symbol)

        except Exception as e:
            logger.debug(f"Failed to fetch {symbol}: {e}")

        return None

    def _parse_company_page(self, html: str, symbol: str) -> Optional[Dict[str, Any]]:
        """Parse company detail page for all fundamentals.

        Available data: Price, Market Cap, PE, EPS, Shares Outstanding, Free Float,
        52-Week Range, Profit Margins, Sales, etc.
        """
        soup = BeautifulSoup(html, "html.parser")

        stock = {
            "symbol": symbol.upper(),
            "scraped_at": datetime.utcnow(),
        }

        try:
            # Get company name from title or header
            title = soup.find("h1") or soup.find("title")
            if title:
                name = self._clean_text(title.get_text())
                if name and symbol not in name:
                    stock["name"] = name.split("|")[0].strip() if "|" in name else name

            # Find all key-value pairs on the page
            # PSX uses various formats: tables, divs with labels, etc.

            # Try finding data in tables
            for table in soup.find_all("table"):
                rows = table.find_all("tr")
                for row in rows:
                    cells = row.find_all(["td", "th"])
                    if len(cells) >= 2:
                        label = self._clean_text(cells[0].get_text()).lower()
                        value = self._clean_text(cells[-1].get_text())
                        self._map_field(stock, label, value)

            # Try finding data in definition lists or key-value divs
            for dl in soup.find_all("dl"):
                dts = dl.find_all("dt")
                dds = dl.find_all("dd")
                for dt, dd in zip(dts, dds):
                    label = self._clean_text(dt.get_text()).lower()
                    value = self._clean_text(dd.get_text())
                    self._map_field(stock, label, value)

            # Look for specific patterns in the HTML text
            text = soup.get_text()
            self._extract_from_text(stock, text)

        except Exception as e:
            logger.debug(f"Error parsing company page for {symbol}: {e}")

        return stock if stock.get("symbol") else None

    def _map_field(self, stock: Dict, label: str, value: str):
        """Map a label-value pair to stock fields."""
        if not label or not value:
            return

        label = label.lower().strip()

        # Price fields
        if "current" in label or "price" in label or "close" in label:
            if "previous" not in label and "52" not in label:
                stock["current_price"] = self._parse_decimal(value)
        elif "open" in label:
            stock["open_price"] = self._parse_decimal(value)
        elif "high" in label:
            if "52" in label or "week" in label:
                stock["week_52_high"] = self._parse_decimal(value)
            else:
                stock["high_price"] = self._parse_decimal(value)
        elif "low" in label:
            if "52" in label or "week" in label:
                stock["week_52_low"] = self._parse_decimal(value)
            else:
                stock["low_price"] = self._parse_decimal(value)

        # Volume
        elif "volume" in label:
            if "avg" in label or "average" in label:
                stock["avg_volume"] = self._parse_int(value)
            else:
                stock["volume"] = self._parse_int(value)

        # Valuation
        elif "market cap" in label or "mcap" in label:
            stock["market_cap"] = self._parse_decimal(value)
        elif "p/e" in label or "pe ratio" in label or "pe ttm" in label:
            stock["pe_ratio"] = self._parse_decimal(value)
        elif "p/b" in label or "pb ratio" in label or "price to book" in label:
            stock["pb_ratio"] = self._parse_decimal(value)

        # Per share
        elif label == "eps" or "earnings per share" in label:
            stock["eps"] = self._parse_decimal(value)
        elif "dividend yield" in label or "div yield" in label:
            stock["dividend_yield"] = self._parse_decimal(value)
        elif "book value" in label or "bvps" in label:
            stock["book_value"] = self._parse_decimal(value)

        # Shares
        elif "shares outstanding" in label:
            stock["shares_outstanding"] = self._parse_int(value)
        elif "free float" in label or "float" in label:
            stock["float_shares"] = self._parse_int(value)

        # Margins
        elif "gross" in label and "margin" in label:
            stock["gross_margin"] = self._parse_decimal(value)
        elif "net" in label and "margin" in label:
            stock["net_margin"] = self._parse_decimal(value)
        elif "operating" in label and "margin" in label:
            stock["operating_margin"] = self._parse_decimal(value)
        elif "profit margin" in label:
            stock["profit_margin"] = self._parse_decimal(value)

        # Growth
        elif "eps growth" in label or "earnings growth" in label:
            stock["earnings_growth"] = self._parse_decimal(value)
        elif "1 year" in label or "1-year" in label or "ytd" in label:
            if "change" in label:
                pass  # Skip change percentages

        # Sector
        elif "sector" in label:
            stock["sector"] = value

    def _extract_from_text(self, stock: Dict, text: str):
        """Extract data from page text using patterns."""
        import re

        # Pattern for "Label: Value" or "Label Value"
        patterns = [
            (r"Market\s*Cap[:\s]+Rs\.?\s*([\d,\.]+)", "market_cap"),
            (r"P/E\s*(?:Ratio)?[:\s]+([\d,\.]+)", "pe_ratio"),
            (r"EPS[:\s]+Rs\.?\s*([\d,\.\-]+)", "eps"),
            (r"Dividend\s*Yield[:\s]+([\d,\.]+)%?", "dividend_yield"),
            (r"52[- ]?Week\s*High[:\s]+Rs\.?\s*([\d,\.]+)", "week_52_high"),
            (r"52[- ]?Week\s*Low[:\s]+Rs\.?\s*([\d,\.]+)", "week_52_low"),
            (r"Shares\s*Outstanding[:\s]+([\d,\.]+)", "shares_outstanding"),
            (r"Free\s*Float[:\s]+([\d,\.]+)", "float_shares"),
            (r"Gross\s*(?:Profit\s*)?Margin[:\s]+([\d,\.]+)%?", "gross_margin"),
            (r"Net\s*(?:Profit\s*)?Margin[:\s]+([\d,\.]+)%?", "net_margin"),
        ]

        for pattern, field in patterns:
            if field not in stock or stock[field] is None:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    value = match.group(1)
                    if field in ["shares_outstanding", "float_shares"]:
                        stock[field] = self._parse_int(value)
                    else:
                        stock[field] = self._parse_decimal(value)

    def _parse_psx_screener(self, html: str) -> List[Dict[str, Any]]:
        """Parse PSX screener HTML page.

        Columns: Symbol, Sector, Listed In, Market Cap, Price, Change %, 1Y Change %, PE (TTM), Div Yield %, Free Float, 30D Avg Vol
        """
        stocks = []
        soup = BeautifulSoup(html, "html.parser")

        # Find the screener table
        table = soup.find("table")
        if not table:
            # Try finding by class or id
            table = soup.select_one(".screener-table, #screener-table, .data-table, table.tbl")

        if not table:
            logger.warning("No screener table found in PSX page")
            return stocks

        # Get rows
        rows = table.find_all("tr")
        if not rows:
            return stocks

        # Skip header row
        data_rows = rows[1:] if len(rows) > 1 else rows

        logger.info(f"Found {len(data_rows)} rows in PSX screener table")

        for row in data_rows:
            try:
                cells = row.find_all("td")
                if len(cells) < 6:
                    continue

                symbol = self._clean_text(cells[0].get_text())
                if not symbol or len(symbol) > 10:
                    continue

                # Parse based on PSX screener column order:
                # 0: Symbol, 1: Sector, 2: Listed In, 3: Market Cap, 4: Price,
                # 5: Change %, 6: 1Y Change %, 7: PE (TTM), 8: Div Yield %, 9: Free Float, 10: 30D Vol
                stock = {
                    "symbol": symbol.upper(),
                    "sector": self._clean_text(cells[1].get_text()) if len(cells) > 1 else None,
                    "market_cap": self._parse_decimal(cells[3].get_text()) if len(cells) > 3 else None,
                    "current_price": self._parse_decimal(cells[4].get_text()) if len(cells) > 4 else None,
                    "change_percentage": self._parse_decimal(cells[5].get_text()) if len(cells) > 5 else None,
                    "pe_ratio": self._parse_decimal(cells[7].get_text()) if len(cells) > 7 else None,
                    "dividend_yield": self._parse_decimal(cells[8].get_text()) if len(cells) > 8 else None,
                    "float_shares": self._parse_int(cells[9].get_text()) if len(cells) > 9 else None,
                    "avg_volume": self._parse_int(cells[10].get_text()) if len(cells) > 10 else None,
                    "scraped_at": datetime.utcnow(),
                }

                if stock.get("symbol"):
                    stocks.append(stock)

            except Exception as e:
                logger.debug(f"Error parsing PSX screener row: {e}")
                continue

        return stocks

    def _parse_psx_screener_item(self, item: Dict) -> Optional[Dict[str, Any]]:
        """Parse PSX screener API JSON item."""
        try:
            symbol = (
                item.get("symbol") or item.get("SYMBOL") or
                item.get("ticker") or item.get("code")
            )
            if not symbol:
                return None

            return {
                "symbol": symbol.upper(),
                "name": item.get("name") or item.get("company") or item.get("companyName") or symbol,
                "sector": item.get("sector") or item.get("sectorName"),
                "current_price": self._parse_decimal(
                    item.get("price") or item.get("current") or item.get("lastPrice")
                ),
                "change_percentage": self._parse_decimal(
                    item.get("change") or item.get("changePercent") or item.get("pctChange")
                ),
                "market_cap": self._parse_decimal(
                    item.get("marketCap") or item.get("market_cap") or item.get("mcap")
                ),
                "pe_ratio": self._parse_decimal(
                    item.get("pe") or item.get("peRatio") or item.get("pe_ratio") or item.get("peTTM")
                ),
                "dividend_yield": self._parse_decimal(
                    item.get("dividendYield") or item.get("divYield") or item.get("yield")
                ),
                "eps": self._parse_decimal(item.get("eps") or item.get("earningsPerShare")),
                "volume": self._parse_int(item.get("volume")),
                "avg_volume": self._parse_int(item.get("avgVolume") or item.get("avg_volume")),
                "float_shares": self._parse_int(item.get("freeFloat") or item.get("floatShares")),
                "week_52_high": self._parse_decimal(item.get("high52") or item.get("fiftyTwoWeekHigh")),
                "week_52_low": self._parse_decimal(item.get("low52") or item.get("fiftyTwoWeekLow")),
                "scraped_at": datetime.utcnow(),
            }
        except Exception:
            return None

    async def _scrape_scstrade(self) -> List[Dict[str, Any]]:
        """Scrape from SCS Trade - has PE, EPS, dividend yield, P/B, EV/EBITDA."""
        stocks = []

        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            try:
                # Try their stock screening/valuation page
                urls_to_try = [
                    "https://www.scstrade.com/stockscreening/Valuation",
                    "https://www.scstrade.com/stockscreening/valuation",
                    "https://www.scstrade.com/Fundamentals/Valuation",
                ]

                for url in urls_to_try:
                    try:
                        response = await client.get(url, headers=self.headers)
                        if response.status_code == 200:
                            stocks = self._parse_scstrade_valuation(response.text)
                            if stocks:
                                return stocks
                    except Exception as e:
                        logger.debug(f"SCS Trade URL {url} failed: {e}")
                        continue

            except Exception as e:
                logger.warning(f"SCS Trade scraping failed: {e}")

        return stocks

    def _parse_scstrade_valuation(self, html: str) -> List[Dict[str, Any]]:
        """Parse SCS Trade valuation page."""
        stocks = []
        soup = BeautifulSoup(html, "html.parser")

        # Find valuation table
        table = soup.find("table")
        if not table:
            return stocks

        rows = table.find_all("tr")[1:]  # Skip header
        for row in rows:
            try:
                cells = row.find_all("td")
                if len(cells) < 5:
                    continue

                symbol = self._clean_text(cells[0].get_text())
                if not symbol:
                    continue

                stock = {
                    "symbol": symbol.upper(),
                    "name": self._clean_text(cells[1].get_text()) if len(cells) > 1 else symbol,
                    "current_price": self._parse_decimal(cells[2].get_text()) if len(cells) > 2 else None,
                    "pe_ratio": self._parse_decimal(cells[3].get_text()) if len(cells) > 3 else None,
                    "pb_ratio": self._parse_decimal(cells[4].get_text()) if len(cells) > 4 else None,
                    "dividend_yield": self._parse_decimal(cells[5].get_text()) if len(cells) > 5 else None,
                    "eps": self._parse_decimal(cells[6].get_text()) if len(cells) > 6 else None,
                    "market_cap": self._parse_decimal(cells[7].get_text()) if len(cells) > 7 else None,
                    "scraped_at": datetime.utcnow(),
                }
                stocks.append(stock)
            except Exception as e:
                logger.debug(f"Error parsing SCS row: {e}")
                continue

        return stocks

    async def _scrape_khistocks(self) -> List[Dict[str, Any]]:
        """Scrape from KHI Stocks."""
        stocks = []

        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            try:
                # Try financial analysis page
                response = await client.get(
                    "https://www.khistocks.com/Company-Info/Financial-Analysis",
                    headers=self.headers
                )
                if response.status_code == 200:
                    stocks = self._parse_khistocks_fundamentals(response.text)
                    if stocks:
                        return stocks

                # Try main page for basic data
                response = await client.get(
                    "https://www.khistocks.com/",
                    headers=self.headers
                )
                if response.status_code == 200:
                    stocks = self._parse_khistocks_main(response.text)

            except Exception as e:
                logger.warning(f"KHI Stocks scraping failed: {e}")

        return stocks

    def _parse_khistocks_fundamentals(self, html: str) -> List[Dict[str, Any]]:
        """Parse KHI Stocks financial analysis page."""
        stocks = []
        soup = BeautifulSoup(html, "html.parser")

        # Find tables with financial data
        tables = soup.find_all("table")
        for table in tables:
            rows = table.find_all("tr")[1:]
            for row in rows:
                try:
                    cells = row.find_all("td")
                    if len(cells) < 4:
                        continue

                    symbol = self._clean_text(cells[0].get_text())
                    if not symbol or len(symbol) > 10:
                        continue

                    stock = {
                        "symbol": symbol.upper(),
                        "scraped_at": datetime.utcnow(),
                    }

                    # Try to extract whatever financial data is in the row
                    for i, cell in enumerate(cells[1:], 1):
                        text = self._clean_text(cell.get_text())
                        value = self._parse_decimal(text)
                        if value is not None:
                            # Map based on position (varies by table)
                            if i == 1:
                                stock["current_price"] = value
                            elif i == 2:
                                stock["eps"] = value
                            elif i == 3:
                                stock["pe_ratio"] = value

                    if stock.get("symbol"):
                        stocks.append(stock)
                except Exception:
                    continue

        return stocks

    def _parse_khistocks_main(self, html: str) -> List[Dict[str, Any]]:
        """Parse KHI Stocks main page for basic data."""
        stocks = []
        soup = BeautifulSoup(html, "html.parser")

        # Look for stock tables
        tables = soup.find_all("table")
        for table in tables:
            rows = table.find_all("tr")
            for row in rows:
                try:
                    cells = row.find_all("td")
                    if len(cells) < 2:
                        continue

                    symbol = self._clean_text(cells[0].get_text())
                    if not symbol or len(symbol) > 10:
                        continue

                    stock = {
                        "symbol": symbol.upper(),
                        "current_price": self._parse_decimal(cells[1].get_text()) if len(cells) > 1 else None,
                        "volume": self._parse_int(cells[2].get_text()) if len(cells) > 2 else None,
                        "scraped_at": datetime.utcnow(),
                    }

                    if stock.get("symbol") and stock.get("current_price"):
                        stocks.append(stock)
                except Exception:
                    continue

        return stocks

    async def _scrape_psx_portal(self) -> List[Dict[str, Any]]:
        """Scrape from PSX Data Portal for basic fundamentals."""
        stocks = []

        async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
            try:
                # Try PSX data portal
                today = datetime.utcnow().strftime('%Y-%m-%d')
                response = await client.get(
                    f"https://dps.psx.com.pk/timeseries/int/TR/{today}",
                    headers=self.headers
                )

                if response.status_code == 200:
                    try:
                        data = response.json()
                        if isinstance(data, list):
                            for item in data:
                                stock = self._parse_psx_item(item)
                                if stock:
                                    stocks.append(stock)
                        elif isinstance(data, dict) and "data" in data:
                            for item in data["data"]:
                                stock = self._parse_psx_item(item)
                                if stock:
                                    stocks.append(stock)
                    except json.JSONDecodeError:
                        pass

                # Fallback to market summary
                if not stocks:
                    response = await client.get(
                        "https://dps.psx.com.pk/market-watch",
                        headers=self.headers
                    )
                    if response.status_code == 200:
                        stocks = self._parse_psx_market_watch(response.text)

            except Exception as e:
                logger.warning(f"PSX Portal scraping failed: {e}")

        return stocks

    def _parse_psx_item(self, item: Dict) -> Optional[Dict[str, Any]]:
        """Parse PSX data portal JSON item."""
        try:
            symbol = item.get("symbol") or item.get("SYMBOL")
            if not symbol:
                return None

            return {
                "symbol": symbol.upper(),
                "name": item.get("name") or item.get("NAME") or symbol,
                "current_price": self._parse_decimal(item.get("current") or item.get("CURRENT")),
                "open_price": self._parse_decimal(item.get("open") or item.get("OPEN")),
                "high_price": self._parse_decimal(item.get("high") or item.get("HIGH")),
                "low_price": self._parse_decimal(item.get("low") or item.get("LOW")),
                "previous_close": self._parse_decimal(item.get("ldcp") or item.get("LDCP")),
                "change_amount": self._parse_decimal(item.get("change") or item.get("CHANGE")),
                "change_percentage": self._parse_decimal(item.get("change_p") or item.get("CHANGE_P")),
                "volume": self._parse_int(item.get("volume") or item.get("VOLUME")),
                "market_cap": self._parse_decimal(item.get("marketCap")),
                "scraped_at": datetime.utcnow(),
            }
        except Exception:
            return None

    def _parse_psx_market_watch(self, html: str) -> List[Dict[str, Any]]:
        """Parse PSX market watch HTML."""
        stocks = []
        soup = BeautifulSoup(html, "html.parser")

        table = soup.find("table")
        if not table:
            return stocks

        rows = table.find_all("tr")[1:]
        for row in rows:
            try:
                cells = row.find_all("td")
                if len(cells) < 8:
                    continue

                symbol = self._clean_text(cells[0].get_text())
                if not symbol:
                    continue

                stock = {
                    "symbol": symbol.upper(),
                    "current_price": self._parse_decimal(cells[7].get_text()),
                    "previous_close": self._parse_decimal(cells[3].get_text()),
                    "open_price": self._parse_decimal(cells[4].get_text()),
                    "high_price": self._parse_decimal(cells[5].get_text()),
                    "low_price": self._parse_decimal(cells[6].get_text()),
                    "change_amount": self._parse_decimal(cells[8].get_text()) if len(cells) > 8 else None,
                    "change_percentage": self._parse_decimal(cells[9].get_text()) if len(cells) > 9 else None,
                    "volume": self._parse_int(cells[10].get_text()) if len(cells) > 10 else None,
                    "scraped_at": datetime.utcnow(),
                }

                if stock.get("symbol") and stock.get("current_price"):
                    stocks.append(stock)
            except Exception:
                continue

        return stocks

    def _clean_text(self, text: str) -> str:
        """Clean text content."""
        if not text:
            return ""
        return " ".join(text.split()).strip()

    def _parse_decimal(self, value: Any) -> Optional[Decimal]:
        """Parse a value to Decimal."""
        if value is None:
            return None

        try:
            if isinstance(value, (int, float)):
                return Decimal(str(value))

            if isinstance(value, str):
                # Clean the string
                clean = value.strip()
                clean = clean.replace(",", "")
                clean = clean.replace("%", "")
                clean = clean.replace("Rs.", "").replace("Rs", "")
                clean = clean.replace("PKR", "")
                clean = clean.strip()

                # Handle suffixes like B, M, K, Cr, L
                multiplier = 1
                if clean.endswith("B"):
                    multiplier = 1_000_000_000
                    clean = clean[:-1]
                elif clean.endswith("M"):
                    multiplier = 1_000_000
                    clean = clean[:-1]
                elif clean.endswith("K"):
                    multiplier = 1_000
                    clean = clean[:-1]
                elif clean.endswith("Cr"):
                    multiplier = 10_000_000  # Crore
                    clean = clean[:-2]
                elif clean.endswith("L"):
                    multiplier = 100_000  # Lakh
                    clean = clean[:-1]

                clean = clean.strip()
                if not clean or clean == "-" or clean == "N/A":
                    return None

                return Decimal(clean) * multiplier

            return Decimal(str(value))

        except (InvalidOperation, ValueError):
            return None

    def _parse_int(self, value: Any) -> Optional[int]:
        """Parse a value to int."""
        decimal_val = self._parse_decimal(value)
        if decimal_val is not None:
            return int(decimal_val)
        return None


# Strategy templates similar to tickeranalysts.com
SCREENER_TEMPLATES = {
    "beginners_safe_start": {
        "name": "Beginner's Safe Start",
        "description": "Safe stocks for first-time investors with reasonable valuations and dividends",
        "filters": {
            "pe_max": 15,
            "dividend_yield_min": 5,
            "debt_to_equity_max": 1,
        }
    },
    "warren_buffett": {
        "name": "Warren Buffett Style",
        "description": "Quality companies at fair prices with strong fundamentals",
        "filters": {
            "pe_max": 15,
            "debt_to_equity_max": 0.5,
            "roe_min": 15,
            "profit_margin_min": 10,
        }
    },
    "charlie_munger": {
        "name": "Charlie Munger Style",
        "description": "Quality-focused with high ROE and strong margins",
        "filters": {
            "roe_min": 15,
            "operating_margin_min": 10,
            "revenue_growth_min": 5,
        }
    },
    "benjamin_graham": {
        "name": "Benjamin Graham Value",
        "description": "Classic value investing with margin of safety",
        "filters": {
            "pe_max": 12,
            "pb_max": 1.5,
            "current_ratio_min": 1.5,
            "debt_to_equity_max": 0.5,
        }
    },
    "high_dividend": {
        "name": "High Dividend Yield",
        "description": "Income-focused with high dividend payouts",
        "filters": {
            "dividend_yield_min": 8,
            "payout_ratio_max": 80,
        }
    },
    "growth_stocks": {
        "name": "High Growth",
        "description": "Fast-growing companies with strong momentum",
        "filters": {
            "revenue_growth_min": 20,
            "earnings_growth_min": 20,
            "roe_min": 15,
        }
    },
    "low_debt": {
        "name": "Low Debt Champions",
        "description": "Financially stable companies with minimal debt",
        "filters": {
            "debt_to_equity_max": 0.3,
            "current_ratio_min": 2,
            "interest_coverage_min": 5,
        }
    },
    "momentum": {
        "name": "Momentum Trading",
        "description": "Stocks with strong price momentum",
        "filters": {
            "change_percentage_min": 2,
            "volume_min": 100000,
        }
    },
    "undervalued": {
        "name": "Undervalued Gems",
        "description": "Potentially undervalued stocks trading below book value",
        "filters": {
            "pb_max": 1,
            "pe_max": 10,
            "roe_min": 10,
        }
    },
    "quality_large_cap": {
        "name": "Quality Large Cap",
        "description": "Large, stable companies with consistent performance",
        "filters": {
            "market_cap_min": 50000000000,  # 50B PKR
            "roe_min": 12,
            "debt_to_equity_max": 1,
        }
    },
}


# All available columns/metrics for screener
SCREENER_COLUMNS = {
    # Basic Info
    "symbol": {"label": "Symbol", "type": "string"},
    "name": {"label": "Company Name", "type": "string"},
    "sector": {"label": "Sector", "type": "string"},

    # Price Data
    "current_price": {"label": "Price", "type": "currency", "format": "Rs."},
    "change_amount": {"label": "Change", "type": "currency", "format": "Rs."},
    "change_percentage": {"label": "Change %", "type": "percentage"},
    "open_price": {"label": "Open", "type": "currency"},
    "high_price": {"label": "High", "type": "currency"},
    "low_price": {"label": "Low", "type": "currency"},
    "previous_close": {"label": "Prev Close", "type": "currency"},
    "volume": {"label": "Volume", "type": "number"},
    "avg_volume": {"label": "Avg Volume", "type": "number"},

    # 52 Week
    "week_52_high": {"label": "52W High", "type": "currency"},
    "week_52_low": {"label": "52W Low", "type": "currency"},

    # Valuation
    "market_cap": {"label": "Market Cap", "type": "currency", "format": "Cr"},
    "pe_ratio": {"label": "P/E Ratio", "type": "decimal"},
    "pb_ratio": {"label": "P/B Ratio", "type": "decimal"},
    "ps_ratio": {"label": "P/S Ratio", "type": "decimal"},
    "peg_ratio": {"label": "PEG Ratio", "type": "decimal"},
    "ev_ebitda": {"label": "EV/EBITDA", "type": "decimal"},

    # Per Share
    "eps": {"label": "EPS", "type": "currency"},
    "book_value": {"label": "Book Value", "type": "currency"},
    "dps": {"label": "DPS", "type": "currency"},
    "dividend_yield": {"label": "Dividend Yield", "type": "percentage"},

    # Profitability
    "roe": {"label": "ROE", "type": "percentage"},
    "roa": {"label": "ROA", "type": "percentage"},
    "roce": {"label": "ROCE", "type": "percentage"},
    "gross_margin": {"label": "Gross Margin", "type": "percentage"},
    "operating_margin": {"label": "Operating Margin", "type": "percentage"},
    "net_margin": {"label": "Net Margin", "type": "percentage"},
    "profit_margin": {"label": "Profit Margin", "type": "percentage"},

    # Leverage
    "debt_to_equity": {"label": "Debt/Equity", "type": "decimal"},
    "debt_to_assets": {"label": "Debt/Assets", "type": "decimal"},
    "current_ratio": {"label": "Current Ratio", "type": "decimal"},
    "quick_ratio": {"label": "Quick Ratio", "type": "decimal"},
    "interest_coverage": {"label": "Interest Coverage", "type": "decimal"},

    # Growth
    "revenue_growth": {"label": "Revenue Growth", "type": "percentage"},
    "earnings_growth": {"label": "Earnings Growth", "type": "percentage"},
    "profit_growth": {"label": "Profit Growth", "type": "percentage"},
    "asset_growth": {"label": "Asset Growth", "type": "percentage"},

    # Cash Flow
    "free_cash_flow": {"label": "Free Cash Flow", "type": "currency"},
    "operating_cash_flow": {"label": "Operating Cash Flow", "type": "currency"},
    "fcf_yield": {"label": "FCF Yield", "type": "percentage"},

    # Other
    "beta": {"label": "Beta", "type": "decimal"},
    "shares_outstanding": {"label": "Shares Outstanding", "type": "number"},
    "payout_ratio": {"label": "Payout Ratio", "type": "percentage"},
}


# PSX Sectors
PSX_SECTORS = [
    "All Sectors",
    "Automobile Assembler",
    "Automobile Parts & Accessories",
    "Banking",
    "Cable & Electrical Goods",
    "Cement",
    "Chemical",
    "Close-End Mutual Fund",
    "Commercial Banks",
    "Engineering",
    "Fertilizer",
    "Food & Personal Care Products",
    "Glass & Ceramics",
    "Insurance",
    "Inv. Banks / Inv. Cos. / Securities Cos.",
    "Jute",
    "Leasing Companies",
    "Leather & Tanneries",
    "Miscellaneous",
    "Modarabas",
    "Oil & Gas Exploration Companies",
    "Oil & Gas Marketing Companies",
    "Paper & Board",
    "Pharmaceuticals",
    "Power Generation & Distribution",
    "Real Estate Investment Trust",
    "Refinery",
    "Sugar & Allied Industries",
    "Synthetic & Rayon",
    "Technology & Communication",
    "Textile Composite",
    "Textile Spinning",
    "Textile Weaving",
    "Tobacco",
    "Transport",
    "Vanaspati & Allied Industries",
    "Woollen",
]
