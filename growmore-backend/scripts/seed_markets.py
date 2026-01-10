import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.supabase import get_supabase_service_client


def seed_markets():
    client = get_supabase_service_client()

    markets = [
        {
            "code": "PSX",
            "name": "Pakistan Stock Exchange",
            "country": "Pakistan",
            "country_code": "PK",
            "currency": "PKR",
            "currency_symbol": "Rs",
            "timezone": "Asia/Karachi",
            "trading_hours": {
                "open": "09:30",
                "close": "15:30",
                "pre_market": "09:15",
                "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            },
            "is_active": True,
        },
    ]

    for market in markets:
        existing = client.table("markets").select("id").eq("code", market["code"]).execute()
        if not existing.data:
            result = client.table("markets").insert(market).execute()
            print(f"Created market: {market['name']}")
        else:
            print(f"Market already exists: {market['name']}")

    return client.table("markets").select("id").eq("code", "PSX").execute().data[0]["id"]


def seed_sectors(market_id: str):
    client = get_supabase_service_client()

    sectors = [
        {"code": "AUTO", "name": "Automobile Assembler"},
        {"code": "AUTOPART", "name": "Automobile Parts & Accessories"},
        {"code": "BANK", "name": "Commercial Banks"},
        {"code": "CEMENT", "name": "Cement"},
        {"code": "CHEM", "name": "Chemical"},
        {"code": "ENGG", "name": "Engineering"},
        {"code": "FERT", "name": "Fertilizer"},
        {"code": "FOOD", "name": "Food & Personal Care Products"},
        {"code": "GLASS", "name": "Glass & Ceramics"},
        {"code": "INS", "name": "Insurance"},
        {"code": "INVBANK", "name": "Investment Banks"},
        {"code": "LEATHER", "name": "Leather & Tanneries"},
        {"code": "MISC", "name": "Miscellaneous"},
        {"code": "OIL", "name": "Oil & Gas Exploration Companies"},
        {"code": "OILMKT", "name": "Oil & Gas Marketing Companies"},
        {"code": "PAPER", "name": "Paper & Board"},
        {"code": "PHARMA", "name": "Pharmaceuticals"},
        {"code": "POWER", "name": "Power Generation & Distribution"},
        {"code": "PROP", "name": "Property"},
        {"code": "REF", "name": "Refinery"},
        {"code": "SUGAR", "name": "Sugar Allied Industries"},
        {"code": "SYNTH", "name": "Synthetic & Rayon"},
        {"code": "TECH", "name": "Technology & Communication"},
        {"code": "TEXTILE", "name": "Textile Composite"},
        {"code": "TEXSPIN", "name": "Textile Spinning"},
        {"code": "TEXWEAVE", "name": "Textile Weaving"},
        {"code": "TOBACCO", "name": "Tobacco"},
        {"code": "TRANS", "name": "Transport"},
    ]

    for sector in sectors:
        sector["market_id"] = market_id
        existing = client.table("sectors").select("id").eq("market_id", market_id).eq("code", sector["code"]).execute()
        if not existing.data:
            client.table("sectors").insert(sector).execute()
            print(f"Created sector: {sector['name']}")
        else:
            print(f"Sector already exists: {sector['name']}")


def seed_commodity_types():
    client = get_supabase_service_client()

    commodity_types = [
        {"name": "Gold 24K", "category": "gold", "unit": "tola", "icon": "gold"},
        {"name": "Gold 22K", "category": "gold", "unit": "tola", "icon": "gold"},
        {"name": "Gold 21K", "category": "gold", "unit": "tola", "icon": "gold"},
        {"name": "Gold 18K", "category": "gold", "unit": "tola", "icon": "gold"},
        {"name": "Silver", "category": "silver", "unit": "tola", "icon": "silver"},
        {"name": "Crude Oil", "category": "oil", "unit": "barrel", "icon": "oil"},
    ]

    for ct in commodity_types:
        existing = client.table("commodity_types").select("id").eq("name", ct["name"]).execute()
        if not existing.data:
            client.table("commodity_types").insert(ct).execute()
            print(f"Created commodity type: {ct['name']}")
        else:
            print(f"Commodity type already exists: {ct['name']}")


def seed_bank_product_types():
    client = get_supabase_service_client()

    product_types = [
        {"name": "Savings Account", "category": "savings", "description": "Regular savings account with interest"},
        {"name": "Fixed Deposit", "category": "fixed_deposit", "description": "Term deposit with fixed interest rate"},
        {"name": "Current Account", "category": "current", "description": "Checking account for daily transactions"},
        {"name": "Term Deposit Certificate", "category": "certificate", "description": "Certificate of deposit"},
        {"name": "Premium Savings", "category": "savings", "description": "High-yield savings account"},
        {"name": "Islamic Savings", "category": "savings", "description": "Shariah-compliant savings account"},
        {"name": "Islamic Term Deposit", "category": "fixed_deposit", "description": "Shariah-compliant term deposit"},
    ]

    for pt in product_types:
        existing = client.table("bank_product_types").select("id").eq("name", pt["name"]).execute()
        if not existing.data:
            client.table("bank_product_types").insert(pt).execute()
            print(f"Created bank product type: {pt['name']}")
        else:
            print(f"Bank product type already exists: {pt['name']}")


def seed_news_sources():
    client = get_supabase_service_client()

    sources = [
        # Pakistan News Sources
        {
            "name": "Business Recorder",
            "base_url": "https://www.brecorder.com",
            "source_type": "news",
            "reliability_score": 0.85,
            "is_active": True,
        },
        {
            "name": "Dawn Business",
            "base_url": "https://www.dawn.com",
            "source_type": "news",
            "reliability_score": 0.9,
            "is_active": True,
        },
        {
            "name": "Express Tribune",
            "base_url": "https://tribune.com.pk",
            "source_type": "news",
            "reliability_score": 0.8,
            "is_active": True,
        },
        {
            "name": "Geo News Business",
            "base_url": "https://www.geo.tv",
            "source_type": "news",
            "reliability_score": 0.75,
            "is_active": True,
        },
        # Reddit - commented out, pending API approval
        {
            "name": "Reddit Pakistan Finance",
            "base_url": "https://reddit.com",
            "source_type": "social",
            "reliability_score": 0.5,
            "is_active": False,  # Disabled - pending API approval
        },
        # Hacker News - No API key needed
        {
            "name": "Hacker News",
            "base_url": "https://news.ycombinator.com",
            "source_type": "community",
            "reliability_score": 0.7,
            "is_active": True,
        },
        # RSS Aggregator Sources
        {
            "name": "RSS Aggregator",
            "base_url": "https://rss.feeds",
            "source_type": "rss",
            "reliability_score": 0.75,
            "is_active": True,
        },
        {
            "name": "RSS - Reuters Business",
            "base_url": "https://feeds.reuters.com",
            "source_type": "rss",
            "reliability_score": 0.9,
            "is_active": True,
        },
        {
            "name": "RSS - BBC Business",
            "base_url": "https://feeds.bbci.co.uk",
            "source_type": "rss",
            "reliability_score": 0.9,
            "is_active": True,
        },
        {
            "name": "RSS - Seeking Alpha",
            "base_url": "https://seekingalpha.com",
            "source_type": "rss",
            "reliability_score": 0.7,
            "is_active": True,
        },
        {
            "name": "RSS - MarketWatch",
            "base_url": "https://www.marketwatch.com",
            "source_type": "rss",
            "reliability_score": 0.8,
            "is_active": True,
        },
        {
            "name": "RSS - CoinTelegraph",
            "base_url": "https://cointelegraph.com",
            "source_type": "rss",
            "reliability_score": 0.65,
            "is_active": True,
        },
        {
            "name": "RSS - CoinDesk",
            "base_url": "https://www.coindesk.com",
            "source_type": "rss",
            "reliability_score": 0.7,
            "is_active": True,
        },
        {
            "name": "RSS - Kitco Gold",
            "base_url": "https://www.kitco.com",
            "source_type": "rss",
            "reliability_score": 0.8,
            "is_active": True,
        },
        # Pakistan RSS Sources
        {
            "name": "Pakistan Finance RSS",
            "base_url": "https://pakistan.rss",
            "source_type": "rss",
            "reliability_score": 0.8,
            "is_active": True,
        },
        {
            "name": "RSS - Business Recorder RSS",
            "base_url": "https://www.brecorder.com/feeds",
            "source_type": "rss",
            "reliability_score": 0.85,
            "is_active": True,
        },
        {
            "name": "RSS - Dawn Business RSS",
            "base_url": "https://www.dawn.com/feeds",
            "source_type": "rss",
            "reliability_score": 0.9,
            "is_active": True,
        },
        {
            "name": "RSS - Tribune Business RSS",
            "base_url": "https://tribune.com.pk/feed",
            "source_type": "rss",
            "reliability_score": 0.8,
            "is_active": True,
        },
        {
            "name": "RSS - Economic Times",
            "base_url": "https://economictimes.indiatimes.com",
            "source_type": "rss",
            "reliability_score": 0.75,
            "is_active": True,
        },
    ]

    for source in sources:
        existing = client.table("news_sources").select("id").eq("name", source["name"]).execute()
        if not existing.data:
            client.table("news_sources").insert(source).execute()
            print(f"Created news source: {source['name']}")
        else:
            print(f"News source already exists: {source['name']}")


def main():
    print("Starting market seed...")
    market_id = seed_markets()
    print(f"Market ID: {market_id}")

    print("\nSeeding sectors...")
    seed_sectors(market_id)

    print("\nSeeding commodity types...")
    seed_commodity_types()

    print("\nSeeding bank product types...")
    seed_bank_product_types()

    print("\nSeeding news sources...")
    seed_news_sources()

    print("\nSeed completed!")


if __name__ == "__main__":
    main()
