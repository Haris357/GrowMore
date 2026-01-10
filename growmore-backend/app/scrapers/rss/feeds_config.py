"""
RSS Feeds Configuration for GrowMore News Aggregator.
All feeds are free and don't require API keys.
"""

from typing import List, Dict

# RSS Feed Categories
FEED_CATEGORIES = {
    "pakistan_business": "Pakistan Business News",
    "global_business": "Global Business News",
    "global_markets": "Global Markets",
    "global_finance": "Global Finance",
    "crypto": "Cryptocurrency",
    "commodities": "Commodities (Gold, Silver, Oil)",
    "asia_markets": "Asian Markets",
}

# RSS Feeds Configuration
RSS_FEEDS: List[Dict] = [
    # ===== Pakistan Business News =====
    {
        "name": "Business Recorder RSS",
        "url": "https://www.brecorder.com/feeds/latest-news",
        "category": "pakistan_business",
        "priority": 1,
        "language": "en",
    },
    {
        "name": "Dawn Business RSS",
        "url": "https://www.dawn.com/feeds/business",
        "category": "pakistan_business",
        "priority": 1,
        "language": "en",
    },
    {
        "name": "Tribune Business RSS",
        "url": "https://tribune.com.pk/feed/business",
        "category": "pakistan_business",
        "priority": 1,
        "language": "en",
    },
    {
        "name": "Geo Business RSS",
        "url": "https://www.geo.tv/rss/1/53",
        "category": "pakistan_business",
        "priority": 2,
        "language": "en",
    },
    {
        "name": "ARY Business RSS",
        "url": "https://arynews.tv/category/business/feed/",
        "category": "pakistan_business",
        "priority": 2,
        "language": "en",
    },
    {
        "name": "The News Business",
        "url": "https://www.thenews.com.pk/rss/1/8",
        "category": "pakistan_business",
        "priority": 2,
        "language": "en",
    },

    # ===== Global Business News =====
    {
        "name": "Reuters Business",
        "url": "https://feeds.reuters.com/reuters/businessNews",
        "category": "global_business",
        "priority": 1,
        "language": "en",
    },
    {
        "name": "Reuters Company News",
        "url": "https://feeds.reuters.com/reuters/companyNews",
        "category": "global_business",
        "priority": 2,
        "language": "en",
    },
    {
        "name": "BBC Business",
        "url": "https://feeds.bbci.co.uk/news/business/rss.xml",
        "category": "global_business",
        "priority": 1,
        "language": "en",
    },
    {
        "name": "NYT Business",
        "url": "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml",
        "category": "global_business",
        "priority": 2,
        "language": "en",
    },

    # ===== Global Markets =====
    {
        "name": "MarketWatch Top Stories",
        "url": "https://www.marketwatch.com/rss/topstories",
        "category": "global_markets",
        "priority": 1,
        "language": "en",
    },
    {
        "name": "Seeking Alpha Market Currents",
        "url": "https://seekingalpha.com/market_currents.xml",
        "category": "global_markets",
        "priority": 1,
        "language": "en",
    },
    {
        "name": "Investing.com News",
        "url": "https://www.investing.com/rss/news.rss",
        "category": "global_markets",
        "priority": 2,
        "language": "en",
    },

    # ===== Global Finance =====
    {
        "name": "Yahoo Finance",
        "url": "https://finance.yahoo.com/news/rssindex",
        "category": "global_finance",
        "priority": 1,
        "language": "en",
    },
    {
        "name": "Financial Times",
        "url": "https://www.ft.com/rss/home/uk",
        "category": "global_finance",
        "priority": 1,
        "language": "en",
    },

    # ===== Cryptocurrency =====
    {
        "name": "CoinDesk",
        "url": "https://www.coindesk.com/arc/outboundfeeds/rss/",
        "category": "crypto",
        "priority": 1,
        "language": "en",
    },
    {
        "name": "CoinTelegraph",
        "url": "https://cointelegraph.com/rss",
        "category": "crypto",
        "priority": 1,
        "language": "en",
    },
    {
        "name": "Decrypt",
        "url": "https://decrypt.co/feed",
        "category": "crypto",
        "priority": 2,
        "language": "en",
    },

    # ===== Commodities =====
    {
        "name": "Kitco Gold News",
        "url": "https://www.kitco.com/rss/gold.rss",
        "category": "commodities",
        "priority": 1,
        "language": "en",
    },
    {
        "name": "Kitco All Metals",
        "url": "https://www.kitco.com/rss/kitco.rss",
        "category": "commodities",
        "priority": 2,
        "language": "en",
    },

    # ===== Asian Markets =====
    {
        "name": "Economic Times India",
        "url": "https://economictimes.indiatimes.com/rssfeedstopstories.cms",
        "category": "asia_markets",
        "priority": 1,
        "language": "en",
    },
    {
        "name": "Bloomberg Asia",
        "url": "https://www.bloomberg.com/markets/rss/asia.xml",
        "category": "asia_markets",
        "priority": 1,
        "language": "en",
    },
]


def get_feeds_by_category(category: str) -> List[Dict]:
    """Get all feeds for a specific category."""
    return [f for f in RSS_FEEDS if f["category"] == category]


def get_priority_feeds(priority: int = 1) -> List[Dict]:
    """Get feeds by priority level (1 = highest)."""
    return [f for f in RSS_FEEDS if f["priority"] == priority]


def get_all_feed_urls() -> List[str]:
    """Get all feed URLs."""
    return [f["url"] for f in RSS_FEEDS]
