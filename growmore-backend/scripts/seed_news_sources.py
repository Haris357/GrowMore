"""
Seed all Pakistani financial news sources.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.supabase import get_supabase_service_client


def seed_news_sources():
    client = get_supabase_service_client()

    # News sources with proper schema: name, base_url, source_type, is_active
    news_sources = [
        # ===== Direct Scrapers (Website Type) =====
        {"name": "Business Recorder", "base_url": "https://www.brecorder.com", "source_type": "website", "is_active": True},
        {"name": "Dawn Business", "base_url": "https://www.dawn.com", "source_type": "website", "is_active": True},
        {"name": "Tribune Business", "base_url": "https://tribune.com.pk", "source_type": "website", "is_active": True},
        {"name": "Geo Business", "base_url": "https://www.geo.tv", "source_type": "website", "is_active": True},
        {"name": "Express Tribune", "base_url": "https://tribune.com.pk", "source_type": "website", "is_active": True},
        {"name": "The News", "base_url": "https://www.thenews.com.pk", "source_type": "website", "is_active": True},
        {"name": "ARY News", "base_url": "https://arynews.tv", "source_type": "website", "is_active": True},
        {"name": "Profit Pakistan", "base_url": "https://profit.pakistantoday.com.pk", "source_type": "website", "is_active": True},
        {"name": "ProPakistani", "base_url": "https://propakistani.pk", "source_type": "website", "is_active": True},
        {"name": "Samaa TV", "base_url": "https://www.samaa.tv", "source_type": "website", "is_active": True},
        {"name": "Dunya News", "base_url": "https://dunyanews.tv", "source_type": "website", "is_active": True},
        {"name": "Bol News", "base_url": "https://www.bolnews.com", "source_type": "website", "is_active": True},
        {"name": "Daily Express", "base_url": "https://www.express.pk", "source_type": "website", "is_active": True},
        {"name": "The Nation", "base_url": "https://www.nation.com.pk", "source_type": "website", "is_active": True},
        {"name": "Pakistan Observer", "base_url": "https://pakobserver.net", "source_type": "website", "is_active": True},

        # ===== Pakistan RSS Sources =====
        {"name": "RSS - Business Recorder", "base_url": "https://www.brecorder.com/feeds/latest-news", "source_type": "rss", "is_active": True},
        {"name": "RSS - Dawn Business", "base_url": "https://www.dawn.com/feeds/business", "source_type": "rss", "is_active": True},
        {"name": "RSS - Tribune Business", "base_url": "https://tribune.com.pk/feed/business", "source_type": "rss", "is_active": True},
        {"name": "RSS - Geo Business", "base_url": "https://www.geo.tv/rss/1/53", "source_type": "rss", "is_active": True},
        {"name": "RSS - ARY Business", "base_url": "https://arynews.tv/category/business/feed/", "source_type": "rss", "is_active": True},
        {"name": "RSS - The News Business", "base_url": "https://www.thenews.com.pk/rss/1/8", "source_type": "rss", "is_active": True},
        {"name": "RSS - ProPakistani", "base_url": "https://propakistani.pk/feed/", "source_type": "rss", "is_active": True},
        {"name": "RSS - Profit Pakistan", "base_url": "https://profit.pakistantoday.com.pk/feed/", "source_type": "rss", "is_active": True},
        {"name": "RSS - Samaa Money", "base_url": "https://www.samaa.tv/money/feed/", "source_type": "rss", "is_active": True},
        {"name": "RSS - Dunya News Business", "base_url": "https://dunyanews.tv/en/Business/rss", "source_type": "rss", "is_active": True},
        {"name": "RSS - Bol News Business", "base_url": "https://www.bolnews.com/business/feed/", "source_type": "rss", "is_active": True},
        {"name": "RSS - Daily Express", "base_url": "https://www.express.pk/feed/", "source_type": "rss", "is_active": True},
        {"name": "RSS - The Nation Business", "base_url": "https://www.nation.com.pk/rss/business", "source_type": "rss", "is_active": True},
        {"name": "RSS - Pakistan Observer", "base_url": "https://pakobserver.net/feed/", "source_type": "rss", "is_active": True},

        # ===== International Sources (For Global Context) =====
        {"name": "RSS - Reuters Business", "base_url": "https://feeds.reuters.com/reuters/businessNews", "source_type": "rss", "is_active": True},
        {"name": "RSS - BBC Business", "base_url": "https://feeds.bbci.co.uk/news/business/rss.xml", "source_type": "rss", "is_active": True},
        {"name": "RSS - Bloomberg Asia", "base_url": "https://www.bloomberg.com/markets/rss/asia.xml", "source_type": "rss", "is_active": True},

        # ===== Commodities (Gold/Silver - Important for Pakistan) =====
        {"name": "RSS - Kitco Gold", "base_url": "https://www.kitco.com/rss/kitco.rss", "source_type": "rss", "is_active": True},

        # ===== Crypto Sources =====
        {"name": "RSS - CoinTelegraph", "base_url": "https://cointelegraph.com/rss", "source_type": "rss", "is_active": True},
        {"name": "RSS - CoinDesk", "base_url": "https://www.coindesk.com/arc/outboundfeeds/rss/", "source_type": "rss", "is_active": True},

        # ===== Aggregator Sources =====
        {"name": "RSS Aggregator", "base_url": "https://feeds.reuters.com", "source_type": "aggregator", "is_active": True},
        {"name": "Pakistan Finance RSS", "base_url": "https://www.brecorder.com", "source_type": "aggregator", "is_active": True},
        {"name": "Hacker News", "base_url": "https://news.ycombinator.com", "source_type": "api", "is_active": True},
    ]

    created = 0
    existing = 0

    for source in news_sources:
        check = client.table("news_sources").select("id").eq("name", source["name"]).execute()
        if not check.data:
            client.table("news_sources").insert(source).execute()
            print(f"Created news source: {source['name']}")
            created += 1
        else:
            print(f"News source already exists: {source['name']}")
            existing += 1

    print(f"\nSummary: {created} created, {existing} already existed")


if __name__ == "__main__":
    seed_news_sources()
