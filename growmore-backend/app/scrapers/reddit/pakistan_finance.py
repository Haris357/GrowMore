import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.config.settings import settings

logger = logging.getLogger(__name__)


class PakistanFinanceRedditScraper:
    def __init__(self):
        self.source_name = "Reddit Pakistan Finance"
        self.subreddits = ["PakistanFinance", "pakistan"]
        self.reddit = None

    def _init_reddit(self):
        if self.reddit is None and settings.reddit_client_id:
            try:
                import praw
                self.reddit = praw.Reddit(
                    client_id=settings.reddit_client_id,
                    client_secret=settings.reddit_client_secret,
                    user_agent=settings.reddit_user_agent,
                )
            except Exception as e:
                logger.error(f"Failed to initialize Reddit client: {e}")
                self.reddit = None

    async def scrape(self) -> List[Dict[str, Any]]:
        self._init_reddit()

        if not self.reddit:
            logger.warning("Reddit client not initialized, skipping scrape")
            return []

        posts = []

        for subreddit_name in self.subreddits:
            try:
                subreddit = self.reddit.subreddit(subreddit_name)

                for post in subreddit.hot(limit=20):
                    if not self._is_finance_related(post):
                        continue

                    parsed = self.parse_item(post)
                    if parsed:
                        posts.append(parsed)

            except Exception as e:
                logger.error(f"Error scraping r/{subreddit_name}: {e}")

        return posts

    def parse_item(self, post: Any) -> Optional[Dict[str, Any]]:
        try:
            title = post.title
            url = f"https://reddit.com{post.permalink}"
            content = post.selftext[:5000] if post.selftext else ""

            summary = content[:500] if content else title

            published_at = datetime.utcfromtimestamp(post.created_utc)

            return {
                "title": title,
                "url": url,
                "summary": summary,
                "content": content,
                "image_url": None,
                "author": str(post.author) if post.author else None,
                "published_at": published_at,
                "scraped_at": datetime.utcnow(),
                "source_name": self.source_name,
                "slug": self._generate_slug(title),
                "extra": {
                    "subreddit": post.subreddit.display_name,
                    "score": post.score,
                    "num_comments": post.num_comments,
                    "upvote_ratio": post.upvote_ratio,
                },
            }
        except Exception as e:
            logger.error(f"Error parsing Reddit post: {e}")
            return None

    def _is_finance_related(self, post: Any) -> bool:
        finance_keywords = [
            "stock", "psx", "kse", "investment", "invest", "bank", "banking",
            "gold", "silver", "rupee", "pkr", "usd", "dollar", "currency",
            "sbp", "interest", "rate", "inflation", "economy", "economic",
            "market", "trading", "mutual fund", "savings", "deposit",
            "portfolio", "dividend", "share", "bond", "crypto", "bitcoin",
        ]

        text = f"{post.title} {post.selftext}".lower()
        return any(keyword in text for keyword in finance_keywords)

    def _generate_slug(self, title: str) -> str:
        import re
        slug = title.lower()
        slug = re.sub(r"[^\w\s-]", "", slug)
        slug = re.sub(r"[-\s]+", "-", slug)
        slug = slug.strip("-")
        return slug[:100]
