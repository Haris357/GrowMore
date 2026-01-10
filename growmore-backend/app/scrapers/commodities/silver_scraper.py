"""
Silver price scraper for Pakistan market.
Primary source: gold.pk (reliable, frequently updated)
"""
import logging
import re
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from app.scrapers.base_scraper import BaseScraper

logger = logging.getLogger(__name__)


class SilverScraper(BaseScraper):
    def __init__(self):
        super().__init__(
            source_name="Silver Rate Pakistan",
            base_url="https://gold.pk",
        )

    async def scrape(self) -> List[Dict[str, Any]]:
        """Scrape silver rates from multiple sources with fallbacks."""
        rates = []

        # Try primary source: gold.pk silver page
        rates = await self._scrape_gold_pk()
        if rates:
            logger.info(f"Scraped {len(rates)} silver rates from gold.pk")
            return rates

        # Fallback: goldpricez.com
        rates = await self._scrape_goldpricez()
        if rates:
            logger.info(f"Scraped {len(rates)} silver rates from goldpricez.com")
            return rates

        logger.warning("All silver scraping sources failed")
        return []

    async def _scrape_gold_pk(self) -> List[Dict[str, Any]]:
        """Scrape from gold.pk silver page."""
        rates = []

        html = await self.fetch("https://gold.pk/pakistan-silver-rates-xagp.php")
        if not html:
            return rates

        soup = self.parse_html(html)

        # Extract prices from gold.pk format
        # Pattern: Rs. 8170.00
        price_pattern = re.compile(r"Rs\.\s*([\d,]+\.?\d*)")

        # Find all rate containers
        rate_containers = soup.select(".goldratehome, .single-defination p, .progress-table-wrap")

        prices = []
        for container in rate_containers:
            text = container.get_text()
            match = price_pattern.search(text)
            if match:
                price_str = match.group(1).replace(",", "")
                try:
                    price = Decimal(price_str)
                    if 1000 < price < 50000:  # Silver prices are between 1000-50000 PKR per tola
                        prices.append(price)
                except Exception:
                    pass

        # Also search the raw HTML for prices
        if not prices:
            all_prices = price_pattern.findall(html)
            for price_str in all_prices:
                try:
                    price = Decimal(price_str.replace(",", ""))
                    if 1000 < price < 50000:  # Silver per tola range
                        prices.append(price)
                except Exception:
                    pass

        # Remove duplicates while preserving order
        seen = set()
        unique_prices = []
        for p in prices:
            if p not in seen:
                seen.add(p)
                unique_prices.append(p)

        # First price is per tola
        if len(unique_prices) >= 1:
            rates.append({
                "name": "Silver (Per Tola)",
                "commodity_type": "Silver",
                "current_price": unique_prices[0],
                "price_per_unit": "per tola",
                "change_amount": None,
                "change_percentage": None,
                "last_updated": datetime.utcnow(),
            })

        # Second price is per 10 grams
        if len(unique_prices) >= 2:
            rates.append({
                "name": "Silver (Per 10 Grams)",
                "commodity_type": "Silver",
                "current_price": unique_prices[1],
                "price_per_unit": "per 10 grams",
                "change_amount": None,
                "change_percentage": None,
                "last_updated": datetime.utcnow(),
            })

        return rates

    async def _scrape_goldpricez(self) -> List[Dict[str, Any]]:
        """Fallback: Scrape from goldpricez.com."""
        rates = []

        html = await self.fetch("https://goldpricez.com/pk/silver/gram")
        if not html:
            return rates

        soup = self.parse_html(html)

        # goldpricez.com uses structured data
        price_elements = soup.select(".pn_market-value, .face-price, .display_price")

        prices = []
        for elem in price_elements:
            text = elem.get_text()
            numbers = re.findall(r"[\d,]+\.?\d*", text)
            for num in numbers:
                try:
                    price = Decimal(num.replace(",", ""))
                    if 50 < price < 5000:  # Per gram price for silver
                        prices.append(price)
                except Exception:
                    pass

        if prices:
            # goldpricez shows per gram, convert to per tola (1 tola = 11.6638 grams)
            tola_multiplier = Decimal("11.6638")
            per_tola = prices[0] * tola_multiplier

            rates.append({
                "name": "Silver (Per Tola)",
                "commodity_type": "Silver",
                "current_price": per_tola.quantize(Decimal("0.01")),
                "price_per_unit": "per tola",
                "change_amount": None,
                "change_percentage": None,
                "last_updated": datetime.utcnow(),
            })

        return rates

    def parse_item(self, row: Any) -> Optional[Dict[str, Any]]:
        """Parse a table row for silver rates."""
        try:
            cells = row.select("td")
            if len(cells) < 2:
                return None

            name = self.clean_text(cells[0].get_text())
            price_text = self.clean_text(cells[1].get_text())

            if not name or not price_text:
                return None

            if "silver" not in name.lower():
                return None

            price = self._parse_price(price_text)
            if price is None:
                return None

            change = None
            change_pct = None
            if len(cells) > 2:
                change = self._parse_price(cells[2].get_text())
            if len(cells) > 3:
                change_pct = self._parse_price(cells[3].get_text())

            return {
                "name": name,
                "commodity_type": "Silver",
                "current_price": price,
                "price_per_unit": "per tola",
                "change_amount": change,
                "change_percentage": change_pct,
                "last_updated": datetime.utcnow(),
            }
        except Exception as e:
            logger.error(f"Error parsing silver rate row: {e}")
            return None

    def _parse_price(self, text: str) -> Optional[Decimal]:
        if not text:
            return None
        try:
            text = text.replace("Rs", "").replace("PKR", "").replace(",", "").strip()
            text = "".join(c for c in text if c.isdigit() or c == "." or c == "-")
            if text:
                return Decimal(text)
        except Exception:
            pass
        return None

    async def scrape_history(self, days: int = 30) -> List[Dict[str, Any]]:
        """Scrape historical silver rates."""
        history = []
        url = "https://gold.pk/pakistan-silver-rates-xagp.php"
        html = await self.fetch(url)

        if not html:
            return history

        soup = self.parse_html(html)
        rows = soup.select("table tr")

        for row in rows[1:days+1]:
            cells = row.select("td")
            if len(cells) >= 2:
                date_str = self.clean_text(cells[0].get_text())
                price = self._parse_price(cells[1].get_text())
                date = self.parse_date(date_str)

                if date and price:
                    history.append({
                        "date": date.date(),
                        "price": price,
                    })

        return history
