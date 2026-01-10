import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


class HackerNewsScraper:
    """
    Scraper for Hacker News using the official Firebase API.
    No authentication required - completely free and open.

    API Documentation: https://github.com/HackerNews/API
    """

    def __init__(self):
        self.source_name = "Hacker News"
        self.base_url = "https://hacker-news.firebaseio.com/v0"
        self.timeout = 30.0
        self.finance_keywords = [
            # Pakistan specific
            "pakistan", "psx", "kse", "sbp", "pkr", "rupee",
            # General finance
            "stock", "investment", "invest", "bank", "banking",
            "gold", "silver", "currency", "forex",
            "interest", "rate", "inflation", "economy", "economic",
            "market", "trading", "mutual fund", "savings",
            "portfolio", "dividend", "share", "bond",
            "crypto", "bitcoin", "ethereum", "fintech",
            # Business
            "startup", "ipo", "acquisition", "merger",
            "revenue", "profit", "earnings", "valuation",
            "venture", "funding", "seed", "series",
        ]

    async def scrape(self) -> List[Dict[str, Any]]:
        """Scrape top and best stories from Hacker News."""
        articles = []

        # Get top stories and best stories
        story_types = ["topstories", "beststories"]

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for story_type in story_types:
                try:
                    # Get story IDs
                    response = await client.get(f"{self.base_url}/{story_type}.json")
                    response.raise_for_status()
                    story_ids = response.json()[:50]  # Get top 50 from each

                    # Fetch each story
                    for story_id in story_ids:
                        try:
                            story = await self._fetch_story(client, story_id)
                            if story and self._is_finance_related(story):
                                parsed = self.parse_item(story)
                                if parsed and not self._is_duplicate(parsed, articles):
                                    articles.append(parsed)
                        except Exception as e:
                            logger.debug(f"Error fetching story {story_id}: {e}")
                            continue

                    logger.info(f"Scraped {story_type} from Hacker News")

                except Exception as e:
                    logger.error(f"Error fetching {story_type}: {e}")

        logger.info(f"Total finance-related articles from HN: {len(articles)}")
        return articles

    async def _fetch_story(self, client: httpx.AsyncClient, story_id: int) -> Optional[Dict]:
        """Fetch a single story by ID."""
        try:
            response = await client.get(f"{self.base_url}/item/{story_id}.json")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.debug(f"Failed to fetch story {story_id}: {e}")
            return None

    def parse_item(self, story: Dict) -> Optional[Dict[str, Any]]:
        """Parse a Hacker News story into our article format."""
        try:
            if not story or story.get("type") != "story":
                return None

            title = story.get("title", "")
            if not title:
                return None

            # HN stories may or may not have a URL (Ask HN, Show HN posts)
            url = story.get("url") or f"https://news.ycombinator.com/item?id={story['id']}"

            # Use the text content if available (for self posts)
            content = story.get("text", "")
            summary = content[:500] if content else title

            # Convert Unix timestamp to datetime
            published_at = datetime.utcfromtimestamp(story.get("time", 0))

            return {
                "title": title,
                "url": url,
                "summary": summary,
                "content": content,
                "image_url": None,
                "author": story.get("by"),
                "published_at": published_at,
                "scraped_at": datetime.utcnow(),
                "source_name": self.source_name,
                "slug": self._generate_slug(title),
                "extra": {
                    "hn_id": story.get("id"),
                    "score": story.get("score", 0),
                    "num_comments": story.get("descendants", 0),
                    "type": story.get("type"),
                },
            }
        except Exception as e:
            logger.error(f"Error parsing HN story: {e}")
            return None

    def _is_finance_related(self, story: Dict) -> bool:
        """Check if a story is related to finance/investing."""
        if not story:
            return False

        title = story.get("title", "").lower()
        text = story.get("text", "").lower()
        url = story.get("url", "").lower()

        combined = f"{title} {text} {url}"

        return any(keyword in combined for keyword in self.finance_keywords)

    def _is_duplicate(self, article: Dict, existing: List[Dict]) -> bool:
        """Check if article URL already exists in list."""
        return any(a["url"] == article["url"] for a in existing)

    def _generate_slug(self, title: str) -> str:
        """Generate URL-friendly slug from title."""
        import re
        slug = title.lower()
        slug = re.sub(r"[^\w\s-]", "", slug)
        slug = re.sub(r"[-\s]+", "-", slug)
        slug = slug.strip("-")
        return slug[:100]
