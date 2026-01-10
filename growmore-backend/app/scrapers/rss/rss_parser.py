"""
Generic RSS/Atom Feed Parser.
Handles multiple feed formats and extracts standardized article data.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from time import mktime
import re

import httpx
import feedparser

from app.scrapers.rss.feeds_config import RSS_FEEDS, get_feeds_by_category

logger = logging.getLogger(__name__)


class RSSParser:
    """
    Generic RSS/Atom feed parser using feedparser library.
    Extracts and normalizes article data from various feed formats.
    """

    def __init__(self, timeout: float = 30.0):
        self.timeout = timeout
        self.headers = {
            "User-Agent": "GrowMore/1.0 (News Aggregator)",
            "Accept": "application/rss+xml, application/xml, text/xml, */*",
        }

    async def parse_feed(self, feed_config: Dict) -> List[Dict[str, Any]]:
        """Parse a single RSS feed and return normalized articles."""
        articles = []
        feed_url = feed_config["url"]
        feed_name = feed_config["name"]

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    feed_url,
                    headers=self.headers,
                    follow_redirects=True
                )
                response.raise_for_status()

                # Parse with feedparser
                feed = feedparser.parse(response.content)

                if feed.bozo and not feed.entries:
                    logger.warning(f"Feed parsing error for {feed_name}: {feed.bozo_exception}")
                    return []

                # Process entries
                for entry in feed.entries[:30]:  # Limit to 30 per feed
                    try:
                        article = self._parse_entry(entry, feed_config)
                        if article:
                            articles.append(article)
                    except Exception as e:
                        logger.debug(f"Error parsing entry from {feed_name}: {e}")
                        continue

                logger.info(f"Parsed {len(articles)} articles from {feed_name}")

        except httpx.HTTPStatusError as e:
            logger.warning(f"HTTP error fetching {feed_name}: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.warning(f"Request error for {feed_name}: {e}")
        except Exception as e:
            logger.error(f"Error parsing feed {feed_name}: {e}")

        return articles

    def _parse_entry(self, entry: Dict, feed_config: Dict) -> Optional[Dict[str, Any]]:
        """Parse a single feed entry into normalized article format."""
        title = entry.get("title", "").strip()
        link = entry.get("link", "")

        if not title or not link:
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

        # Get image URL
        image_url = self._extract_image(entry)

        # Get author
        author = entry.get("author") or entry.get("dc_creator")

        # Extract tags
        tags = []
        if entry.get("tags"):
            tags = [t.get("term", "") for t in entry["tags"] if t.get("term")]

        return {
            "title": title,
            "url": link,
            "summary": summary or title[:200],
            "content": content,
            "image_url": image_url,
            "author": author,
            "published_at": published_at,
            "scraped_at": datetime.utcnow(),
            "source_name": f"RSS - {feed_config['name']}",
            "slug": self._generate_slug(title),
            "categories": [feed_config["category"]],
            "tags": tags[:10],  # Limit tags
            "extra": {
                "feed_name": feed_config["name"],
                "feed_category": feed_config["category"],
                "priority": feed_config.get("priority", 2),
            },
        }

    def _parse_date(self, entry: Dict) -> datetime:
        """Parse publication date from feed entry."""
        try:
            if entry.get("published_parsed"):
                return datetime.fromtimestamp(mktime(entry["published_parsed"]))
            elif entry.get("updated_parsed"):
                return datetime.fromtimestamp(mktime(entry["updated_parsed"]))
        except Exception:
            pass
        return datetime.utcnow()

    def _extract_image(self, entry: Dict) -> Optional[str]:
        """Extract image URL from feed entry."""
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

        # Try to extract from content
        content = entry.get("summary", "") or entry.get("description", "")
        img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', content)
        if img_match:
            return img_match.group(1)

        return None

    def _clean_html(self, text: str) -> str:
        """Remove HTML tags and clean text."""
        if not text:
            return ""
        # Remove HTML tags
        clean = re.sub(r"<[^>]+>", "", text)
        # Remove extra whitespace
        clean = " ".join(clean.split())
        # Decode HTML entities
        clean = clean.replace("&amp;", "&")
        clean = clean.replace("&lt;", "<")
        clean = clean.replace("&gt;", ">")
        clean = clean.replace("&quot;", '"')
        clean = clean.replace("&#39;", "'")
        clean = clean.replace("&nbsp;", " ")
        return clean.strip()

    def _generate_slug(self, title: str) -> str:
        """Generate URL-friendly slug from title."""
        slug = title.lower()
        slug = re.sub(r"[^\w\s-]", "", slug)
        slug = re.sub(r"[-\s]+", "-", slug)
        slug = slug.strip("-")
        return slug[:100]

    async def parse_all_feeds(self) -> List[Dict[str, Any]]:
        """Parse all configured RSS feeds."""
        all_articles = []

        for feed_config in RSS_FEEDS:
            try:
                articles = await self.parse_feed(feed_config)
                all_articles.extend(articles)
            except Exception as e:
                logger.error(f"Error with feed {feed_config['name']}: {e}")

        # Deduplicate by URL
        seen_urls = set()
        unique_articles = []
        for article in all_articles:
            if article["url"] not in seen_urls:
                seen_urls.add(article["url"])
                unique_articles.append(article)

        logger.info(f"Total unique articles from RSS: {len(unique_articles)}")
        return unique_articles

    async def parse_category_feeds(self, category: str) -> List[Dict[str, Any]]:
        """Parse all feeds for a specific category."""
        feeds = get_feeds_by_category(category)
        all_articles = []

        for feed_config in feeds:
            try:
                articles = await self.parse_feed(feed_config)
                all_articles.extend(articles)
            except Exception as e:
                logger.error(f"Error with feed {feed_config['name']}: {e}")

        return all_articles
