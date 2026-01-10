import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.scrapers.base_scraper import BaseScraper

logger = logging.getLogger(__name__)


class BusinessRecorderScraper(BaseScraper):
    def __init__(self):
        super().__init__(
            source_name="Business Recorder",
            base_url="https://www.brecorder.com",
        )
        self.sections = [
            "/markets/stocks",
            "/markets/commodities",
            "/business-finance/banking",
            "/business-finance/economy",
        ]

    async def scrape(self) -> List[Dict[str, Any]]:
        articles = []

        for section in self.sections:
            url = f"{self.base_url}{section}"
            html = await self.fetch(url)

            if not html:
                continue

            soup = self.parse_html(html)
            article_elements = soup.select("article.story, .story-card, .news-item")

            for element in article_elements[:10]:
                article = self.parse_item(element)
                if article:
                    articles.append(article)

        return articles

    def parse_item(self, item: Any) -> Optional[Dict[str, Any]]:
        try:
            title_elem = item.select_one("h2 a, h3 a, .story-title a")
            if not title_elem:
                return None

            title = self.clean_text(title_elem.get_text())
            url = title_elem.get("href", "")

            if not url.startswith("http"):
                url = f"{self.base_url}{url}"

            summary_elem = item.select_one(".story-excerpt, .story-summary, p")
            summary = self.clean_text(summary_elem.get_text()) if summary_elem else ""

            date_elem = item.select_one(".story-date, .date, time")
            published_at = None
            if date_elem:
                date_str = date_elem.get("datetime") or date_elem.get_text()
                published_at = self.parse_date(date_str)

            image_elem = item.select_one("img")
            image_url = image_elem.get("src") if image_elem else None

            author_elem = item.select_one(".author, .story-author")
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
            logger.error(f"Error parsing Business Recorder article: {e}")
            return None

    async def scrape_article_content(self, url: str) -> Optional[str]:
        html = await self.fetch(url)
        if not html:
            return None

        soup = self.parse_html(html)
        content_elem = soup.select_one(".story-content, .article-body, article")

        if content_elem:
            paragraphs = content_elem.select("p")
            content = " ".join(self.clean_text(p.get_text()) for p in paragraphs)
            return content[:10000]

        return None
