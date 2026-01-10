"""
ProPakistani - Technology, telecom, and business news scraper.
Source: propakistani.pk
"""
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.scrapers.base_scraper import BaseScraper

logger = logging.getLogger(__name__)


class ProPakistaniScraper(BaseScraper):
    def __init__(self):
        super().__init__(
            source_name="ProPakistani",
            base_url="https://propakistani.pk",
        )
        self.sections = [
            "/category/business",
            "/category/startups",
            "/category/telecom",
            "/category/economy",
        ]

    async def scrape(self) -> List[Dict[str, Any]]:
        articles = []

        for section in self.sections:
            url = f"{self.base_url}{section}"
            html = await self.fetch(url)

            if not html:
                continue

            soup = self.parse_html(html)
            article_elements = soup.select("article, .post, .entry, .td-module-container")

            for element in article_elements[:10]:
                article = self.parse_item(element)
                if article:
                    articles.append(article)

        return articles

    def parse_item(self, item: Any) -> Optional[Dict[str, Any]]:
        try:
            title_elem = item.select_one("h3 a, h2 a, .entry-title a, .td-module-title a")
            if not title_elem:
                return None

            title = self.clean_text(title_elem.get_text())
            url = title_elem.get("href", "")

            if not url.startswith("http"):
                url = f"{self.base_url}{url}"

            summary_elem = item.select_one(".td-excerpt, .entry-summary, .excerpt, p")
            summary = self.clean_text(summary_elem.get_text()) if summary_elem else ""

            date_elem = item.select_one(".entry-date, .td-post-date, time, .date")
            published_at = None
            if date_elem:
                date_str = date_elem.get("datetime") or date_elem.get_text()
                published_at = self.parse_date(date_str)

            image_elem = item.select_one("img")
            image_url = image_elem.get("data-src") or image_elem.get("src") if image_elem else None

            author_elem = item.select_one(".author, .td-post-author-name a, .byline")
            author = self.clean_text(author_elem.get_text()) if author_elem else None

            return {
                "title": title,
                "url": url,
                "summary": summary[:500] if summary else None,
                "image_url": image_url,
                "author": author,
                "published_at": published_at or datetime.utcnow(),
                "scraped_at": datetime.utcnow(),
                "source_name": self.source_name,
                "slug": self.generate_slug(title),
            }
        except Exception as e:
            logger.error(f"Error parsing ProPakistani article: {e}")
            return None

    async def scrape_article_content(self, url: str) -> Optional[str]:
        html = await self.fetch(url)
        if not html:
            return None

        soup = self.parse_html(html)
        content_elem = soup.select_one(".td-post-content, .entry-content, .post-content")

        if content_elem:
            paragraphs = content_elem.select("p")
            content = " ".join(self.clean_text(p.get_text()) for p in paragraphs)
            return content[:10000]

        return None
