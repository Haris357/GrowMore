import logging
import re
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from app.scrapers.base_scraper import BaseScraper

logger = logging.getLogger(__name__)


# PSX Sector code to name mapping (actual PSX DPS codes)
PSX_SECTOR_CODES = {
    "0801": "Automobile Assembler",
    "0802": "Automobile Parts & Accessories",
    "0803": "Cable & Electrical Goods",
    "0804": "Cement",
    "0805": "Chemical",
    "0806": "Close - End Mutual Fund",
    "0807": "Commercial Banks",
    "0808": "Engineering",
    "0809": "Fertilizer",
    "0810": "Food & Personal Care Products",
    "0811": "Glass & Ceramics",
    "0812": "Insurance",
    "0813": "Inv. Banks / Inv. Cos. / Securities Cos.",
    "0814": "Jute",
    "0815": "Leasing Companies",
    "0816": "Leather & Tanneries",
    "0817": "Miscellaneous",
    "0818": "Modarabas",
    "0819": "Paper & Board",
    "0820": "Oil & Gas Exploration Companies",
    "0821": "Oil & Gas Marketing Companies",
    "0822": "Pharmaceuticals",
    "0823": "Power Generation & Distribution",
    "0824": "Power Generation & Distribution",  # IPPs
    "0825": "Refinery",
    "0826": "Sugar Allied Industries",
    "0827": "Synthetic & Rayon",
    "0828": "Technology & Communication",
    "0829": "Textile Composite",
    "0830": "Textile Spinning",
    "0831": "Textile Weaving",
    "0832": "Tobacco",
    "0833": "Transport",
    "0834": "Vanaspati & Allied Industries",
    "0835": "Woollen",
    "0836": "Real Estate Investment Trust",
    "0837": "Exchange Traded Funds",
    "0838": "Mutual Funds",
}


class PSXScraper(BaseScraper):
    def __init__(self):
        super().__init__(
            source_name="Pakistan Stock Exchange",
            base_url="https://dps.psx.com.pk",
        )

    async def scrape(self) -> List[Dict[str, Any]]:
        """Main scrape method - directly fetches from market-watch which has all the data."""
        stocks = []

        # Market watch is the most reliable source - has all stocks with prices
        url = f"{self.base_url}/market-watch"
        logger.info(f"Fetching PSX market watch from {url}")
        html = await self.fetch(url)

        if html:
            stocks = self._parse_market_watch_html(html)
            logger.info(f"Parsed {len(stocks)} stocks from market-watch")

        # Fallback sources if market-watch fails
        if not stocks:
            logger.warning("Market watch failed, trying fallback sources...")
            stocks = await self._scrape_fallback()

        return stocks

    def _parse_market_watch_html(self, html: str) -> List[Dict[str, Any]]:
        """Parse the market-watch HTML table which contains all PSX stocks.

        The table structure is:
        <table class="tbl">
            <tbody class="tbl__body">
                <tr>
                    <td data-search="SYMBOL" data-order="SYMBOL">
                        <a class="tbl__symbol" href="/company/SYMBOL" data-title="Full Company Name">
                            <strong>SYMBOL</strong>
                        </a>
                    </td>
                    <td>SECTOR_CODE</td>
                    <td>LISTED_IN</td>
                    <td class="right" data-order="LDCP">LDCP</td>
                    <td class="right" data-order="OPEN">OPEN</td>
                    <td class="right" data-order="HIGH">HIGH</td>
                    <td class="right" data-order="LOW">LOW</td>
                    <td class="right" data-order="CURRENT">CURRENT</td>
                    <td class="right" data-order="CHANGE">CHANGE</td>
                    <td class="right" data-order="CHANGE%">CHANGE%</td>
                    <td class="right" data-order="VOLUME">VOLUME</td>
                </tr>
            </tbody>
        </table>
        """
        stocks = []
        soup = self.parse_html(html)

        # Find the market data table - PSX uses table.tbl class
        table = soup.select_one("table.tbl")
        if not table:
            logger.warning("No market watch table found with class 'tbl'")
            # Try other selectors
            table = soup.select_one("table.table, #datatable, .market-data, table")
            if not table:
                logger.error("No table found at all in market-watch page")
                return stocks

        # Get data rows from tbody
        tbody = table.select_one("tbody.tbl__body, tbody")
        if tbody:
            rows = tbody.select("tr")
        else:
            rows = table.select("tr")[1:]  # Skip header if no tbody

        logger.info(f"Found {len(rows)} rows in PSX market watch table")

        for row in rows:
            stock = self._parse_psx_market_watch_row(row)
            if stock:
                stocks.append(stock)

        return stocks

    def _parse_psx_market_watch_row(self, row: Any) -> Optional[Dict[str, Any]]:
        """Parse a row from PSX dps.psx.com.pk market-watch table.

        Extracts:
        - Symbol from data-search attribute or <strong> tag
        - Company name from data-title attribute of anchor
        - Sector code from second <td>
        - Price data from subsequent cells using data-order attributes
        """
        try:
            cells = row.select("td")
            if len(cells) < 10:
                return None

            # Extract symbol - check data-search attribute first, then strong tag
            first_cell = cells[0]
            symbol = first_cell.get("data-search") or first_cell.get("data-order")
            if not symbol:
                strong_tag = first_cell.select_one("strong")
                if strong_tag:
                    symbol = self.clean_text(strong_tag.get_text())

            if not symbol:
                return None

            # Extract company name from data-title attribute of anchor
            anchor = first_cell.select_one("a.tbl__symbol, a[data-title]")
            company_name = None
            if anchor:
                company_name = anchor.get("data-title")
                if company_name:
                    # Decode HTML entities
                    company_name = company_name.replace("&amp;", "&")

            if not company_name:
                company_name = symbol  # Fallback to symbol if name not found

            # Extract sector code from second cell
            sector_code = self.clean_text(cells[1].get_text()) if len(cells) > 1 else None

            # Get sector name from code mapping
            sector_name = PSX_SECTOR_CODES.get(sector_code, sector_code) if sector_code else None

            # Extract listed_in from third cell
            listed_in = self.clean_text(cells[2].get_text()) if len(cells) > 2 else None

            # Extract price data - use data-order attribute for clean numeric values
            def get_cell_value(cell):
                """Get numeric value from cell, preferring data-order attribute."""
                data_order = cell.get("data-order")
                if data_order:
                    return data_order
                return self.clean_text(cell.get_text())

            ldcp = self._parse_decimal(get_cell_value(cells[3])) if len(cells) > 3 else None
            open_price = self._parse_decimal(get_cell_value(cells[4])) if len(cells) > 4 else None
            high_price = self._parse_decimal(get_cell_value(cells[5])) if len(cells) > 5 else None
            low_price = self._parse_decimal(get_cell_value(cells[6])) if len(cells) > 6 else None
            current_price = self._parse_decimal(get_cell_value(cells[7])) if len(cells) > 7 else None
            change = self._parse_decimal(get_cell_value(cells[8])) if len(cells) > 8 else None
            change_pct = self._parse_decimal(get_cell_value(cells[9])) if len(cells) > 9 else None
            volume = self._parse_int(get_cell_value(cells[10])) if len(cells) > 10 else None

            # Accept stocks even if price is None (some stocks may be suspended)
            if not symbol:
                return None

            return {
                "symbol": symbol,
                "name": company_name,
                "sector_code": sector_code,
                "sector": sector_name,
                "listed_in": listed_in,
                "current_price": current_price,
                "open_price": open_price,
                "high_price": high_price,
                "low_price": low_price,
                "previous_close": ldcp,
                "change_amount": change,
                "change_percentage": change_pct,
                "volume": volume,
                "last_updated": datetime.utcnow(),
            }
        except Exception as e:
            logger.error(f"Error parsing PSX market watch row: {e}")
            return None

    async def _scrape_fallback(self) -> List[Dict[str, Any]]:
        """Fallback scraper if market-watch fails."""
        stocks = []
        logger.info("Using fallback scraping methods...")

        # Try PSX main summary page
        url = f"{self.base_url}/"
        html = await self.fetch(url)

        if html:
            soup = self.parse_html(html)
            # Look for any stock tables on the main page
            tables = soup.select("table.tbl, table")
            for table in tables:
                tbody = table.select_one("tbody")
                rows = tbody.select("tr") if tbody else table.select("tr")[1:]
                for row in rows:
                    stock = self._parse_psx_market_watch_row(row)
                    if stock:
                        stocks.append(stock)

        return stocks

    def parse_item(self, item: Any) -> Optional[Dict[str, Any]]:
        """Parse a JSON item (for future API support)."""
        try:
            symbol = item.get("symbol", "")
            if not symbol:
                return None

            return {
                "symbol": symbol,
                "name": item.get("name", symbol),
                "sector": item.get("sector"),
                "sector_code": item.get("sectorCode"),
                "current_price": self._parse_decimal(item.get("current", 0)),
                "open_price": self._parse_decimal(item.get("open", 0)),
                "high_price": self._parse_decimal(item.get("high", 0)),
                "low_price": self._parse_decimal(item.get("low", 0)),
                "close_price": self._parse_decimal(item.get("close", 0)),
                "previous_close": self._parse_decimal(item.get("previousClose", 0)),
                "change_amount": self._parse_decimal(item.get("change", 0)),
                "change_percentage": self._parse_decimal(item.get("changePercent", 0)),
                "volume": item.get("volume", 0),
                "market_cap": self._parse_decimal(item.get("marketCap", 0)),
                "last_updated": datetime.utcnow(),
            }
        except Exception as e:
            logger.error(f"Error parsing PSX item: {e}")
            return None

    def _parse_decimal(self, value: Any) -> Optional[Decimal]:
        """Parse a value to Decimal, handling various formats."""
        if value is None:
            return None
        try:
            if isinstance(value, str):
                # Remove commas, percentage signs, and whitespace
                value = value.replace(",", "").replace("%", "").strip()
                # Handle empty strings
                if not value or value == "-" or value == "--":
                    return None
            return Decimal(str(value))
        except Exception:
            return None

    def _parse_int(self, value: Any) -> Optional[int]:
        """Parse a value to integer, handling various formats."""
        if value is None:
            return None
        try:
            if isinstance(value, str):
                value = value.replace(",", "").strip()
                # Handle empty strings
                if not value or value == "-" or value == "--":
                    return None
            return int(float(value))
        except Exception:
            return None

    async def scrape_company_details(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Scrape detailed company information from PSX company page."""
        url = f"{self.base_url}/company/{symbol}"
        html = await self.fetch(url)

        if not html:
            return None

        soup = self.parse_html(html)

        try:
            # Extract company name from quote__name class
            name = symbol
            name_elem = soup.select_one(".quote__name")
            if name_elem:
                name = self.clean_text(name_elem.get_text())
                # Decode HTML entities
                name = name.replace("&amp;", "&")

            # Extract current price from quote__close
            current_price = None
            price_elem = soup.select_one(".quote__close")
            if price_elem:
                price_text = self.clean_text(price_elem.get_text())
                # Remove "Rs." prefix
                price_text = price_text.replace("Rs.", "").strip()
                current_price = self._parse_decimal(price_text)

            return {
                "symbol": symbol,
                "name": name,
                "current_price": current_price,
            }
        except Exception as e:
            logger.error(f"Error scraping company details for {symbol}: {e}")
            return None

    async def scrape_all_listings(self) -> List[Dict[str, Any]]:
        """Scrape all company listings - alias for scrape() method."""
        return await self.scrape()

    def get_sector_name(self, sector_code: str) -> Optional[str]:
        """Get sector name from sector code."""
        return PSX_SECTOR_CODES.get(sector_code)
