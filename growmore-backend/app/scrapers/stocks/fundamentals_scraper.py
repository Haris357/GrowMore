"""
Fundamentals Scraper for PSX Stocks.
Scrapes fundamental data from multiple sources including:
- PSX Data Portal (dps.psx.com.pk)
- PSX Financials Portal (financials.psx.com.pk)
"""
import logging
import re
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from app.scrapers.base_scraper import BaseScraper

logger = logging.getLogger(__name__)


class FundamentalsScraper(BaseScraper):
    """Scraper for stock fundamental data from PSX sources."""

    def __init__(self):
        super().__init__(
            source_name="PSX Fundamentals",
            base_url="https://dps.psx.com.pk",
        )
        self.financials_url = "https://financials.psx.com.pk"

    async def scrape(self) -> List[Dict[str, Any]]:
        """Main scrape method - scrapes fundamentals for all stocks."""
        # Get all stock symbols from PSX
        from app.scrapers.stocks.psx_scraper import PSXScraper
        psx_scraper = PSXScraper()
        stocks = await psx_scraper.scrape()
        symbols = [s.get("symbol") for s in stocks if s.get("symbol")]
        return await self.scrape_all_fundamentals(symbols[:50])  # Limit to 50 for testing

    def parse_item(self, item: Any) -> Optional[Dict[str, Any]]:
        """Parse a single item - not used for this scraper."""
        if isinstance(item, dict):
            return item
        return None

    async def scrape_company_fundamentals(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Scrape comprehensive fundamental data for a single company.

        Args:
            symbol: The stock symbol (e.g., 'OGDC', 'HBL')

        Returns:
            Dictionary containing all fundamental data or None if failed
        """
        fundamentals = {
            "symbol": symbol,
            "scraped_at": datetime.utcnow().isoformat(),
        }

        # Scrape from PSX Data Portal company page
        dps_data = await self._scrape_dps_company(symbol)
        if dps_data:
            fundamentals.update(dps_data)

        # Scrape from PSX Financials Portal
        financials_data = await self._scrape_financials_portal(symbol)
        if financials_data:
            fundamentals.update(financials_data)

        return fundamentals if len(fundamentals) > 2 else None

    async def _scrape_dps_company(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Scrape company data from dps.psx.com.pk/company/{symbol}."""
        url = f"{self.base_url}/company/{symbol}"
        html = await self.fetch(url)

        if not html:
            logger.warning(f"Failed to fetch DPS page for {symbol}")
            return None

        soup = self.parse_html(html)
        data = {}

        try:
            # Company name from quote__name
            name_elem = soup.select_one(".quote__name")
            if name_elem:
                data["name"] = self.clean_text(name_elem.get_text()).replace("&amp;", "&")

            # Current price from quote__close
            price_elem = soup.select_one(".quote__close")
            if price_elem:
                price_text = self.clean_text(price_elem.get_text())
                price_text = price_text.replace("Rs.", "").replace(",", "").strip()
                data["current_price"] = self._parse_decimal(price_text)

            # Change info from quote__change
            change_elem = soup.select_one(".quote__change")
            if change_elem:
                change_text = self.clean_text(change_elem.get_text())
                # Parse change amount and percentage
                match = re.search(r"([+-]?\d+\.?\d*)\s*\(([+-]?\d+\.?\d*)%\)", change_text)
                if match:
                    data["change_amount"] = self._parse_decimal(match.group(1))
                    data["change_percentage"] = self._parse_decimal(match.group(2))

            # Volume and other stats from quote__stats or similar
            stats_items = soup.select(".quote__stat, .stats__item, .info__row")
            for item in stats_items:
                label_elem = item.select_one(".stat__label, .info__label, label")
                value_elem = item.select_one(".stat__value, .info__value, span")

                if label_elem and value_elem:
                    label = self.clean_text(label_elem.get_text()).lower()
                    value = self.clean_text(value_elem.get_text())

                    # Map known labels to our fields
                    if "volume" in label:
                        data["volume"] = self._parse_int(value.replace(",", ""))
                    elif "market cap" in label:
                        data["market_cap"] = self._parse_large_number(value)
                    elif "52w high" in label or "52 week high" in label:
                        data["week_52_high"] = self._parse_decimal(value.replace("Rs.", "").replace(",", ""))
                    elif "52w low" in label or "52 week low" in label:
                        data["week_52_low"] = self._parse_decimal(value.replace("Rs.", "").replace(",", ""))
                    elif "p/e" in label or "pe ratio" in label:
                        data["pe_ratio"] = self._parse_decimal(value)
                    elif "eps" in label:
                        data["eps"] = self._parse_decimal(value.replace("Rs.", ""))
                    elif "dividend yield" in label:
                        data["dividend_yield"] = self._parse_decimal(value.replace("%", ""))

            # Extract sector from breadcrumb or sector link
            sector_link = soup.select_one("a[href*='/sector/']")
            if sector_link:
                data["sector"] = self.clean_text(sector_link.get_text())

            logger.info(f"Scraped DPS data for {symbol}: {len(data)} fields")
            return data

        except Exception as e:
            logger.error(f"Error scraping DPS page for {symbol}: {e}")
            return None

    async def _scrape_financials_portal(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Scrape financial data from financials.psx.com.pk."""
        url = f"{self.financials_url}/company/{symbol}"
        html = await self.fetch(url)

        if not html:
            return None

        soup = self.parse_html(html)
        data = {}

        try:
            # Look for financial tables or data sections
            tables = soup.select("table")
            for table in tables:
                rows = table.select("tr")
                for row in rows:
                    cells = row.select("td, th")
                    if len(cells) >= 2:
                        label = self.clean_text(cells[0].get_text()).lower()
                        value = self.clean_text(cells[-1].get_text())

                        # Map financial metrics
                        if "revenue" in label or "sales" in label:
                            data["revenue"] = self._parse_large_number(value)
                        elif "net income" in label or "profit after tax" in label:
                            data["net_income"] = self._parse_large_number(value)
                        elif "total assets" in label:
                            data["total_assets"] = self._parse_large_number(value)
                        elif "total liabilities" in label:
                            data["total_liabilities"] = self._parse_large_number(value)
                        elif "total equity" in label or "shareholders equity" in label:
                            data["total_equity"] = self._parse_large_number(value)
                        elif "roe" in label or "return on equity" in label:
                            data["roe"] = self._parse_decimal(value.replace("%", ""))
                        elif "roa" in label or "return on assets" in label:
                            data["roa"] = self._parse_decimal(value.replace("%", ""))
                        elif "debt" in label and "equity" in label:
                            data["debt_to_equity"] = self._parse_decimal(value)
                        elif "current ratio" in label:
                            data["current_ratio"] = self._parse_decimal(value)
                        elif "quick ratio" in label:
                            data["quick_ratio"] = self._parse_decimal(value)
                        elif "gross margin" in label:
                            data["gross_margin"] = self._parse_decimal(value.replace("%", ""))
                        elif "net margin" in label:
                            data["net_margin"] = self._parse_decimal(value.replace("%", ""))
                        elif "p/b" in label or "price to book" in label:
                            data["pb_ratio"] = self._parse_decimal(value)
                        elif "book value" in label:
                            data["book_value"] = self._parse_decimal(value.replace("Rs.", ""))
                        elif "face value" in label:
                            data["face_value"] = self._parse_decimal(value.replace("Rs.", ""))
                        elif "outstanding shares" in label or "shares outstanding" in label:
                            data["outstanding_shares"] = self._parse_int(value.replace(",", ""))
                        elif "free float" in label:
                            data["free_float"] = self._parse_decimal(value.replace("%", ""))

            logger.info(f"Scraped financials data for {symbol}: {len(data)} fields")
            return data

        except Exception as e:
            logger.error(f"Error scraping financials for {symbol}: {e}")
            return None

    async def scrape_all_fundamentals(self, symbols: List[str]) -> List[Dict[str, Any]]:
        """Scrape fundamentals for multiple symbols.

        Args:
            symbols: List of stock symbols to scrape

        Returns:
            List of dictionaries with fundamental data
        """
        results = []
        total = len(symbols)

        for i, symbol in enumerate(symbols):
            logger.info(f"Scraping fundamentals for {symbol} ({i+1}/{total})")
            data = await self.scrape_company_fundamentals(symbol)
            if data:
                results.append(data)

            # Rate limiting - don't hammer the server
            import asyncio
            await asyncio.sleep(0.5)

        logger.info(f"Scraped fundamentals for {len(results)}/{total} symbols")
        return results

    def _parse_decimal(self, value: Any) -> Optional[Decimal]:
        """Parse a value to Decimal."""
        if value is None:
            return None
        try:
            if isinstance(value, str):
                value = value.replace(",", "").replace("%", "").strip()
                if not value or value == "-" or value == "--" or value.lower() == "n/a":
                    return None
            return Decimal(str(value))
        except Exception:
            return None

    def _parse_int(self, value: Any) -> Optional[int]:
        """Parse a value to integer."""
        if value is None:
            return None
        try:
            if isinstance(value, str):
                value = value.replace(",", "").strip()
                if not value or value == "-" or value == "--":
                    return None
            return int(float(value))
        except Exception:
            return None

    def _parse_large_number(self, value: str) -> Optional[Decimal]:
        """Parse large numbers with abbreviations (Cr, L, K, M, B)."""
        if not value:
            return None

        value = value.strip().upper()

        # Remove currency symbols
        for prefix in ["RS.", "RS", "PKR", "$"]:
            value = value.replace(prefix, "")

        value = value.strip()

        if not value or value == "-" or value == "--":
            return None

        try:
            multiplier = 1

            if value.endswith("CR") or value.endswith("CRORE"):
                value = value.replace("CRORE", "").replace("CR", "").strip()
                multiplier = 10000000  # 1 Crore = 10 million
            elif value.endswith("L") or value.endswith("LAKH") or value.endswith("LAC"):
                value = value.replace("LAKH", "").replace("LAC", "").replace("L", "").strip()
                multiplier = 100000  # 1 Lakh = 100,000
            elif value.endswith("K"):
                value = value.replace("K", "").strip()
                multiplier = 1000
            elif value.endswith("M"):
                value = value.replace("M", "").strip()
                multiplier = 1000000
            elif value.endswith("B"):
                value = value.replace("B", "").strip()
                multiplier = 1000000000

            value = value.replace(",", "")
            base_value = float(value)
            return Decimal(str(base_value * multiplier))

        except Exception:
            return None


# Create instance on demand to avoid circular imports
def get_fundamentals_scraper():
    return FundamentalsScraper()
