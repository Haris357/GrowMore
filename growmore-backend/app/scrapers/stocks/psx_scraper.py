import logging
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from app.scrapers.base_scraper import BaseScraper

logger = logging.getLogger(__name__)


class PSXScraper(BaseScraper):
    def __init__(self):
        super().__init__(
            source_name="Pakistan Stock Exchange",
            base_url="https://dps.psx.com.pk",
        )

    async def scrape(self) -> List[Dict[str, Any]]:
        stocks = []

        # Try the data portal first
        url = f"{self.base_url}/timeseries/int/TR/{datetime.utcnow().strftime('%Y-%m-%d')}"
        html = await self.fetch(url)

        if html:
            try:
                import json
                data = json.loads(html)
                for item in data if isinstance(data, list) else data.get("data", []):
                    stock = self.parse_item(item)
                    if stock:
                        stocks.append(stock)
            except Exception as e:
                logger.error(f"Error parsing PSX data portal response: {e}")

        # Try alternate endpoint
        if not stocks:
            url = f"{self.base_url}/market-watch"
            html = await self.fetch(url)
            if html:
                stocks = self._parse_market_watch_html(html)

        # Final fallback
        if not stocks:
            stocks = await self._scrape_fallback()

        return stocks

    def _parse_market_watch_html(self, html: str) -> List[Dict[str, Any]]:
        stocks = []
        soup = self.parse_html(html)

        # Find the market data table - PSX uses table.tbl class
        table = soup.select_one("table.tbl, table.table, #datatable, .market-data")
        if not table:
            logger.warning("No market watch table found")
            return stocks

        # Get data rows from tbody
        rows = table.select("tbody tr")
        if not rows:
            rows = table.select("tr")[1:]  # Skip header if no tbody

        logger.info(f"Found {len(rows)} stock rows in PSX market watch")

        for row in rows:
            stock = self._parse_psx_market_watch_row(row)
            if stock:
                stocks.append(stock)

        return stocks

    def _parse_psx_market_watch_row(self, row: Any) -> Optional[Dict[str, Any]]:
        """Parse a row from PSX dps.psx.com.pk market-watch table.

        Column order: SYMBOL, SECTOR, LISTED IN, LDCP, OPEN, HIGH, LOW, CURRENT, CHANGE, CHANGE%, VOLUME, VALUE
        """
        try:
            cells = row.select("td")
            if len(cells) < 11:
                return None

            symbol = self.clean_text(cells[0].get_text())
            if not symbol:
                return None

            # Column indices based on PSX table structure
            sector = self.clean_text(cells[1].get_text())  # SECTOR
            ldcp = self._parse_decimal(cells[3].get_text())  # Last Day Close Price
            open_price = self._parse_decimal(cells[4].get_text())  # OPEN
            high_price = self._parse_decimal(cells[5].get_text())  # HIGH
            low_price = self._parse_decimal(cells[6].get_text())  # LOW
            current_price = self._parse_decimal(cells[7].get_text())  # CURRENT
            change = self._parse_decimal(cells[8].get_text())  # CHANGE
            change_pct = self._parse_decimal(cells[9].get_text())  # CHANGE%
            volume = self._parse_int(cells[10].get_text())  # VOLUME

            if not symbol or current_price is None:
                return None

            return {
                "symbol": symbol,
                "sector": sector,
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
        stocks = []

        # Try hamariweb - they have free PSX data
        url = "https://hamariweb.com/finance/stockexchanges/psx.aspx"
        html = await self.fetch(url)

        if html:
            soup = self.parse_html(html)
            # Find all tables with stock data
            tables = soup.select("table")
            for table in tables:
                rows = table.select("tr")
                for row in rows[1:]:  # Skip header
                    cells = row.select("td")
                    if len(cells) >= 4:
                        try:
                            symbol_cell = cells[0].get_text().strip()
                            price_text = cells[1].get_text().strip().replace(",", "")
                            change_text = cells[2].get_text().strip().replace(",", "").replace("+", "")

                            if symbol_cell and price_text:
                                current_price = self._parse_decimal(price_text)
                                change = self._parse_decimal(change_text)

                                if current_price and current_price > 0:
                                    stocks.append({
                                        "symbol": symbol_cell,
                                        "current_price": current_price,
                                        "change_amount": change,
                                        "change_percentage": self._parse_decimal(cells[3].get_text().strip().replace("%", "")) if len(cells) > 3 else None,
                                        "volume": None,
                                        "last_updated": datetime.utcnow(),
                                    })
                        except Exception as e:
                            continue

        # Try psx official as last resort
        if not stocks:
            url = "https://www.psx.com.pk/market-summary/"
            html = await self.fetch(url)

            if html:
                soup = self.parse_html(html)
                rows = soup.select("table tr, .stock-row")
                for row in rows[1:]:
                    stock = self._parse_table_row(row)
                    if stock:
                        stocks.append(stock)

        return stocks

    def _parse_table_row(self, row: Any) -> Optional[Dict[str, Any]]:
        try:
            cells = row.select("td")
            if len(cells) < 5:
                return None

            symbol = self.clean_text(cells[0].get_text())
            current_price = self._parse_decimal(cells[1].get_text())
            change = self._parse_decimal(cells[2].get_text())
            change_pct = self._parse_decimal(cells[3].get_text())
            volume = self._parse_int(cells[4].get_text())

            if not symbol or current_price is None:
                return None

            return {
                "symbol": symbol,
                "current_price": current_price,
                "change_amount": change,
                "change_percentage": change_pct,
                "volume": volume,
                "last_updated": datetime.utcnow(),
            }
        except Exception as e:
            logger.error(f"Error parsing PSX table row: {e}")
            return None

    def parse_item(self, item: Any) -> Optional[Dict[str, Any]]:
        try:
            symbol = item.get("symbol", "")
            if not symbol:
                return None

            return {
                "symbol": symbol,
                "name": item.get("name", symbol),
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
        if value is None:
            return None
        try:
            if isinstance(value, str):
                value = value.replace(",", "").replace("%", "").strip()
            return Decimal(str(value))
        except Exception:
            return None

    def _parse_int(self, value: Any) -> Optional[int]:
        if value is None:
            return None
        try:
            if isinstance(value, str):
                value = value.replace(",", "").strip()
            return int(float(value))
        except Exception:
            return None

    async def scrape_company_details(self, symbol: str) -> Optional[Dict[str, Any]]:
        url = f"https://www.psx.com.pk/company/{symbol}"
        html = await self.fetch(url)

        if not html:
            return None

        soup = self.parse_html(html)

        try:
            return {
                "symbol": symbol,
                "name": self.clean_text(soup.select_one(".company-name, h1").get_text()) if soup.select_one(".company-name, h1") else symbol,
                "sector": self.clean_text(soup.select_one(".sector").get_text()) if soup.select_one(".sector") else None,
                "description": self.clean_text(soup.select_one(".company-description, .about").get_text()) if soup.select_one(".company-description, .about") else None,
            }
        except Exception as e:
            logger.error(f"Error scraping company details for {symbol}: {e}")
            return None
