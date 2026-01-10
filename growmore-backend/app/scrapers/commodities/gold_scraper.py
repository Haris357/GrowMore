"""
Gold price scraper for Pakistan market.
Primary source: gold.pk (reliable, frequently updated)
Fallback sources: sarafa.pk, goldpricez.com
"""
import logging
import re
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from app.scrapers.base_scraper import BaseScraper

logger = logging.getLogger(__name__)


class GoldScraper(BaseScraper):
    def __init__(self):
        super().__init__(
            source_name="Gold Rate Pakistan",
            base_url="https://gold.pk",
        )

    async def scrape(self) -> List[Dict[str, Any]]:
        """Scrape gold rates from multiple sources with fallbacks."""
        rates = []

        # Try primary source: gold.pk
        rates = await self._scrape_gold_pk()
        if rates:
            logger.info(f"Scraped {len(rates)} gold rates from gold.pk")
            return rates

        # Fallback: goldpricez.com
        rates = await self._scrape_goldpricez()
        if rates:
            logger.info(f"Scraped {len(rates)} gold rates from goldpricez.com")
            return rates

        # Fallback: sarafa.pk API
        rates = await self._scrape_sarafa_api()
        if rates:
            logger.info(f"Scraped {len(rates)} gold rates from sarafa.pk")
            return rates

        logger.warning("All gold scraping sources failed")
        return []

    async def _scrape_gold_pk(self) -> List[Dict[str, Any]]:
        """Scrape from gold.pk - most reliable Pakistani source."""
        rates = []

        html = await self.fetch("https://gold.pk/")
        if not html:
            return rates

        soup = self.parse_html(html)

        # Extract prices from gold.pk format
        # Pattern: Rs. 469000.00 followed by karat info
        price_pattern = re.compile(r"Rs\.\s*([\d,]+\.?\d*)")

        # Find all rate containers
        rate_containers = soup.select(".goldratehome, .single-defination p")

        prices = []
        for container in rate_containers:
            text = container.get_text()
            match = price_pattern.search(text)
            if match:
                price_str = match.group(1).replace(",", "")
                try:
                    prices.append(Decimal(price_str))
                except Exception:
                    pass

        # Also search the raw HTML for prices
        if not prices:
            all_prices = price_pattern.findall(html)
            for price_str in all_prices:
                try:
                    price = Decimal(price_str.replace(",", ""))
                    if price > 100000:  # Gold prices are above 100k PKR
                        prices.append(price)
                except Exception:
                    pass

        # Remove duplicates while preserving order
        seen = set()
        unique_prices = []
        for p in prices:
            if p not in seen and p > 100000:
                seen.add(p)
                unique_prices.append(p)

        # Map prices to karats (gold.pk typically shows: 24K tola, 24K 10g, 24K 1g, then 22K, 21K, 18K)
        if len(unique_prices) >= 1:
            rates.append({
                "name": "Gold 24K (Per Tola)",
                "commodity_type": "Gold 24K",
                "current_price": unique_prices[0],
                "price_per_unit": "per tola",
                "change_amount": None,
                "change_percentage": None,
                "last_updated": datetime.utcnow(),
            })

        if len(unique_prices) >= 4:
            # 22K is typically the 4th unique price
            rates.append({
                "name": "Gold 22K (Per Tola)",
                "commodity_type": "Gold 22K",
                "current_price": unique_prices[3],
                "price_per_unit": "per tola",
                "change_amount": None,
                "change_percentage": None,
                "last_updated": datetime.utcnow(),
            })

        if len(unique_prices) >= 5:
            # 21K
            rates.append({
                "name": "Gold 21K (Per Tola)",
                "commodity_type": "Gold 21K",
                "current_price": unique_prices[4],
                "price_per_unit": "per tola",
                "change_amount": None,
                "change_percentage": None,
                "last_updated": datetime.utcnow(),
            })

        if len(unique_prices) >= 6:
            # 18K
            rates.append({
                "name": "Gold 18K (Per Tola)",
                "commodity_type": "Gold 18K",
                "current_price": unique_prices[5],
                "price_per_unit": "per tola",
                "change_amount": None,
                "change_percentage": None,
                "last_updated": datetime.utcnow(),
            })

        return rates

    async def _scrape_goldpricez(self) -> List[Dict[str, Any]]:
        """Fallback: Scrape from goldpricez.com."""
        rates = []

        html = await self.fetch("https://goldpricez.com/pk/gram")
        if not html:
            return rates

        soup = self.parse_html(html)

        # goldpricez.com uses structured data
        price_elements = soup.select(".pn_market-value, .face-price, .display_price")

        prices = []
        for elem in price_elements:
            text = elem.get_text()
            # Extract numbers
            numbers = re.findall(r"[\d,]+\.?\d*", text)
            for num in numbers:
                try:
                    price = Decimal(num.replace(",", ""))
                    if price > 5000:  # Per gram price
                        prices.append(price)
                except Exception:
                    pass

        if prices:
            # goldpricez shows per gram, convert to per tola (1 tola = 11.6638 grams)
            tola_multiplier = Decimal("11.6638")
            per_tola = prices[0] * tola_multiplier

            rates.append({
                "name": "Gold 24K (Per Tola)",
                "commodity_type": "Gold 24K",
                "current_price": per_tola.quantize(Decimal("0.01")),
                "price_per_unit": "per tola",
                "change_amount": None,
                "change_percentage": None,
                "last_updated": datetime.utcnow(),
            })

        return rates

    async def _scrape_sarafa_api(self) -> List[Dict[str, Any]]:
        """Fallback: Try sarafa.pk API."""
        rates = []

        try:
            # sarafa.pk has an API endpoint
            json_data = await self.fetch("https://api.sarafa.pk/api/gold")
            if json_data:
                import json
                data = json.loads(json_data) if isinstance(json_data, str) else json_data

                if isinstance(data, dict) and data.get("data"):
                    for item in data["data"]:
                        name = item.get("name", "")
                        price = item.get("price") or item.get("rate")

                        if price and "24" in name:
                            rates.append({
                                "name": "Gold 24K (Per Tola)",
                                "commodity_type": "Gold 24K",
                                "current_price": Decimal(str(price)),
                                "price_per_unit": "per tola",
                                "change_amount": None,
                                "change_percentage": None,
                                "last_updated": datetime.utcnow(),
                            })
        except Exception as e:
            logger.error(f"Error fetching sarafa.pk API: {e}")

        return rates

    def parse_item(self, row: Any) -> Optional[Dict[str, Any]]:
        """Parse a table row for gold rates."""
        try:
            cells = row.select("td")
            if len(cells) < 2:
                return None

            name = self.clean_text(cells[0].get_text())
            price_text = self.clean_text(cells[1].get_text())

            if not name or not price_text:
                return None

            if not any(g in name.lower() for g in ["gold", "24k", "22k", "21k", "18k"]):
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

            commodity_type = self._determine_gold_type(name)

            return {
                "name": name,
                "commodity_type": commodity_type,
                "current_price": price,
                "price_per_unit": "per tola",
                "change_amount": change,
                "change_percentage": change_pct,
                "last_updated": datetime.utcnow(),
            }
        except Exception as e:
            logger.error(f"Error parsing gold rate row: {e}")
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

    def _determine_gold_type(self, name: str) -> str:
        name_lower = name.lower()
        if "24k" in name_lower or "24 k" in name_lower or "24 karat" in name_lower:
            return "Gold 24K"
        elif "22k" in name_lower or "22 k" in name_lower or "22 karat" in name_lower:
            return "Gold 22K"
        elif "21k" in name_lower or "21 k" in name_lower or "21 karat" in name_lower:
            return "Gold 21K"
        elif "18k" in name_lower or "18 k" in name_lower or "18 karat" in name_lower:
            return "Gold 18K"
        return "Gold 24K"

    async def scrape_history(self, days: int = 30) -> List[Dict[str, Any]]:
        """Scrape historical gold rates."""
        history = []
        url = "https://gold.pk/gold-rates-daily.php"
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
