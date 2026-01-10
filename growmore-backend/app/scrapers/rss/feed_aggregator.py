import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from time import mktime

import httpx
import feedparser

logger = logging.getLogger(__name__)


class RSSFeedAggregator:
    """
    RSS Feed Aggregator for financial news from multiple sources.
    Uses feedparser library - completely free, no API keys needed.

    Aggregates feeds from:
    - International finance sources (Reuters, Bloomberg, etc.)
    - Pakistan-specific sources
    - Crypto/fintech sources
    """

    def __init__(self):
        self.source_name = "RSS Aggregator"
        self.timeout = 30.0

        # RSS feeds configuration
        # Format: (feed_url, source_name, category)
        self.feeds = [
            # ===== Pakistan News Sources =====
            ("https://www.brecorder.com/feeds/latest-news", "Business Recorder", "pakistan"),
            ("https://www.dawn.com/feeds/business", "Dawn Business", "pakistan"),
            ("https://tribune.com.pk/feed/business", "Tribune Business", "pakistan"),
            ("https://www.geo.tv/rss/1/53", "Geo Business", "pakistan"),
            ("https://arynews.tv/category/business/feed/", "ARY Business", "pakistan"),
            ("https://www.thenews.com.pk/rss/1/8", "The News Business", "pakistan"),
            ("https://propakistani.pk/feed/", "ProPakistani", "pakistan"),
            ("https://profit.pakistantoday.com.pk/feed/", "Profit Pakistan", "pakistan"),
            # Note: Samaa, Dunya, Bol feeds removed - not valid RSS/malformed XML
            ("https://www.express.pk/feed/", "Daily Express", "pakistan"),

            # ===== International Finance (Global Context) =====
            ("https://feeds.reuters.com/reuters/businessNews", "Reuters Business", "international"),
            ("https://feeds.bbci.co.uk/news/business/rss.xml", "BBC Business", "international"),
            ("https://www.ft.com/rss/home/uk", "Financial Times", "international"),

            # ===== Market Data & Analysis =====
            ("https://seekingalpha.com/market_currents.xml", "Seeking Alpha", "analysis"),
            ("https://www.marketwatch.com/rss/topstories", "MarketWatch", "markets"),

            # ===== Crypto & Fintech =====
            ("https://cointelegraph.com/rss", "CoinTelegraph", "crypto"),
            ("https://www.coindesk.com/arc/outboundfeeds/rss/", "CoinDesk", "crypto"),

            # Note: Bloomberg Asia and Kitco removed - blocked/require subscription
        ]

        # Pakistan-specific keywords for filtering
        self.pakistan_keywords = [
            "pakistan", "psx", "kse", "sbp", "pkr", "rupee",
            "karachi", "lahore", "islamabad", "imf pakistan",
        ]

        # General finance keywords
        self.finance_keywords = [
            "stock", "market", "investment", "bank", "gold", "silver",
            "oil", "currency", "forex", "interest rate", "inflation",
            "economy", "gdp", "trade", "export", "import",
            "crypto", "bitcoin", "ethereum", "fintech",
            "ipo", "merger", "acquisition", "earnings",
            "emerging market", "asia", "south asia",
        ]

    async def scrape(self) -> List[Dict[str, Any]]:
        """Scrape all configured RSS feeds."""
        all_articles = []

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for feed_url, source_name, category in self.feeds:
                try:
                    articles = await self._scrape_feed(client, feed_url, source_name, category)
                    all_articles.extend(articles)
                    logger.info(f"Scraped {len(articles)} articles from {source_name}")
                except Exception as e:
                    logger.error(f"Error scraping feed {source_name}: {e}")

        # Remove duplicates based on URL
        unique_articles = self._deduplicate(all_articles)

        logger.info(f"Total RSS articles scraped: {len(unique_articles)}")
        return unique_articles

    async def _scrape_feed(
        self,
        client: httpx.AsyncClient,
        feed_url: str,
        source_name: str,
        category: str
    ) -> List[Dict[str, Any]]:
        """Scrape a single RSS feed."""
        articles = []

        try:
            # Fetch feed content
            response = await client.get(feed_url, follow_redirects=True)
            response.raise_for_status()

            # Parse with feedparser
            feed = feedparser.parse(response.content)

            if feed.bozo and not feed.entries:
                logger.warning(f"Feed parsing error for {source_name}: {feed.bozo_exception}")
                return []

            # Process entries (limit to 25 per feed)
            for entry in feed.entries[:25]:
                try:
                    # Filter for relevant content
                    if not self._is_relevant(entry, category):
                        continue

                    parsed = self._parse_entry(entry, source_name, category)
                    if parsed:
                        articles.append(parsed)

                except Exception as e:
                    logger.debug(f"Error parsing entry from {source_name}: {e}")
                    continue

        except httpx.HTTPStatusError as e:
            logger.warning(f"HTTP error fetching {source_name}: {e.response.status_code}")
        except Exception as e:
            logger.error(f"Error fetching {source_name}: {e}")

        return articles

    def _parse_entry(self, entry: Dict, source_name: str, category: str) -> Optional[Dict[str, Any]]:
        """Parse an RSS entry into our article format."""
        try:
            title = entry.get("title", "").strip()
            if not title:
                return None

            link = entry.get("link", "")
            if not link:
                return None

            # Get summary/description
            summary = ""
            if entry.get("summary"):
                summary = self._clean_html(entry["summary"])[:500]
            elif entry.get("description"):
                summary = self._clean_html(entry["description"])[:500]

            # Get full content if available
            content = ""
            if entry.get("content"):
                content = self._clean_html(entry["content"][0].get("value", ""))
            elif entry.get("summary"):
                content = self._clean_html(entry["summary"])

            # Parse published date
            published_at = self._parse_date(entry)

            # Get image URL if available
            image_url = self._extract_image(entry)

            # Get author
            author = entry.get("author") or entry.get("dc_creator")

            return {
                "title": title,
                "url": link,
                "summary": summary or title,
                "content": content,
                "image_url": image_url,
                "author": author,
                "published_at": published_at,
                "scraped_at": datetime.utcnow(),
                "source_name": f"RSS - {source_name}",
                "slug": self._generate_slug(title),
                "extra": {
                    "category": category,
                    "feed_source": source_name,
                    "tags": entry.get("tags", []),
                },
            }
        except Exception as e:
            logger.error(f"Error parsing RSS entry: {e}")
            return None

    def _is_relevant(self, entry: Dict, category: str) -> bool:
        """Check if entry is relevant to finance/Pakistan."""
        # Crypto and commodities feeds are always relevant
        if category in ["crypto", "commodities"]:
            return True

        title = entry.get("title", "").lower()
        summary = entry.get("summary", "").lower()
        combined = f"{title} {summary}"

        # Check for Pakistan-specific content (higher priority)
        if any(kw in combined for kw in self.pakistan_keywords):
            return True

        # Check for general finance content
        return any(kw in combined for kw in self.finance_keywords)

    def _parse_date(self, entry: Dict) -> datetime:
        """Parse publication date from RSS entry."""
        try:
            if entry.get("published_parsed"):
                return datetime.fromtimestamp(mktime(entry["published_parsed"]))
            elif entry.get("updated_parsed"):
                return datetime.fromtimestamp(mktime(entry["updated_parsed"]))
        except Exception:
            pass
        return datetime.utcnow()

    def _extract_image(self, entry: Dict) -> Optional[str]:
        """Extract image URL from RSS entry."""
        # Check media:thumbnail
        if entry.get("media_thumbnail"):
            return entry["media_thumbnail"][0].get("url")

        # Check media:content
        if entry.get("media_content"):
            for media in entry["media_content"]:
                if media.get("medium") == "image" or "image" in media.get("type", ""):
                    return media.get("url")

        # Check enclosures
        if entry.get("enclosures"):
            for enc in entry["enclosures"]:
                if "image" in enc.get("type", ""):
                    return enc.get("href")

        return None

    def _clean_html(self, text: str) -> str:
        """Remove HTML tags from text."""
        import re
        if not text:
            return ""
        # Remove HTML tags
        clean = re.sub(r"<[^>]+>", "", text)
        # Remove extra whitespace
        clean = " ".join(clean.split())
        return clean.strip()

    def _deduplicate(self, articles: List[Dict]) -> List[Dict]:
        """Remove duplicate articles based on URL."""
        seen_urls = set()
        unique = []
        for article in articles:
            url = article.get("url")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique.append(article)
        return unique

    def _generate_slug(self, title: str) -> str:
        """Generate URL-friendly slug from title."""
        import re
        slug = title.lower()
        slug = re.sub(r"[^\w\s-]", "", slug)
        slug = re.sub(r"[-\s]+", "-", slug)
        slug = slug.strip("-")
        return slug[:100]


class PakistanFinanceRSSAggregator(RSSFeedAggregator):
    """
    Specialized RSS aggregator focused on Pakistan finance news.
    Includes local Pakistani news sources.
    """

    def __init__(self):
        super().__init__()
        self.source_name = "Pakistan Finance RSS"

        # Override with Pakistan-focused feeds
        self.feeds = [
            # ===== Pakistan News Sources =====
            ("https://www.brecorder.com/feeds/latest-news", "Business Recorder RSS", "pakistan"),
            ("https://www.dawn.com/feeds/business", "Dawn Business RSS", "pakistan"),
            ("https://tribune.com.pk/feed/business", "Tribune Business RSS", "pakistan"),
            ("https://www.geo.tv/rss/1/53", "Geo Business RSS", "pakistan"),
            ("https://arynews.tv/category/business/feed/", "ARY Business RSS", "pakistan"),
            ("https://www.thenews.com.pk/rss/1/8", "The News Business RSS", "pakistan"),
            ("https://propakistani.pk/feed/", "ProPakistani RSS", "pakistan"),
            ("https://profit.pakistantoday.com.pk/feed/", "Profit Pakistan RSS", "pakistan"),
            # Note: Samaa, Dunya, Bol feeds removed - not valid RSS/malformed XML
            ("https://www.express.pk/feed/", "Daily Express RSS", "pakistan"),
            ("https://www.nation.com.pk/rss/business", "The Nation Business RSS", "pakistan"),
            ("https://pakobserver.net/feed/", "Pakistan Observer RSS", "pakistan"),

            # Note: Bloomberg Asia and Kitco blocked - require subscription

            # ===== International Context =====
            ("https://feeds.reuters.com/reuters/businessNews", "Reuters Business", "international"),
        ]

    def _is_relevant(self, entry: Dict, category: str) -> bool:
        """All Pakistan feeds are relevant; filter others."""
        if category == "pakistan":
            return True
        return super()._is_relevant(entry, category)
