"""
Seed sample prices for demonstration purposes.
These are placeholder values - in production you need real data from APIs.
"""

import sys
from pathlib import Path
from datetime import datetime
from decimal import Decimal

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.supabase import get_supabase_service_client


def update_stock_prices():
    """Update stocks with realistic sample prices."""
    client = get_supabase_service_client()

    # Sample prices (these are approximate real prices as of 2024)
    stock_prices = {
        "HBL": {"price": 145.50, "change": 2.30, "change_pct": 1.61, "volume": 2500000},
        "UBL": {"price": 195.00, "change": -1.50, "change_pct": -0.76, "volume": 1800000},
        "MCB": {"price": 220.75, "change": 4.25, "change_pct": 1.96, "volume": 950000},
        "ABL": {"price": 92.50, "change": 0.75, "change_pct": 0.82, "volume": 780000},
        "MEBL": {"price": 275.00, "change": -2.00, "change_pct": -0.72, "volume": 1200000},
        "LUCK": {"price": 980.00, "change": 15.00, "change_pct": 1.55, "volume": 450000},
        "DGKC": {"price": 125.50, "change": -0.50, "change_pct": -0.40, "volume": 650000},
        "MLCF": {"price": 52.00, "change": 1.25, "change_pct": 2.46, "volume": 1100000},
        "OGDC": {"price": 135.25, "change": 3.75, "change_pct": 2.85, "volume": 2800000},
        "PPL": {"price": 178.00, "change": -1.25, "change_pct": -0.70, "volume": 890000},
        "POL": {"price": 520.00, "change": 8.50, "change_pct": 1.66, "volume": 320000},
        "SYS": {"price": 485.00, "change": 12.00, "change_pct": 2.54, "volume": 550000},
        "TRG": {"price": 145.75, "change": -3.25, "change_pct": -2.18, "volume": 1500000},
    }

    for symbol, data in stock_prices.items():
        # Find company
        company_result = client.table("companies").select("id").eq("symbol", symbol).execute()
        if not company_result.data:
            print(f"Company {symbol} not found")
            continue

        company_id = company_result.data[0]["id"]

        # Update stock
        stock_result = client.table("stocks").select("id").eq("company_id", company_id).execute()
        if stock_result.data:
            client.table("stocks").update({
                "current_price": data["price"],
                "change_amount": data["change"],
                "change_percentage": data["change_pct"],
                "volume": data["volume"],
                "last_updated": datetime.utcnow().isoformat(),
            }).eq("id", stock_result.data[0]["id"]).execute()
            print(f"Updated {symbol}: Rs. {data['price']}")


def update_commodity_prices():
    """Update commodities with realistic sample prices."""
    client = get_supabase_service_client()

    # Sample gold/silver prices in PKR per tola (approximate)
    commodity_prices = {
        "Gold 24K (Per Tola)": {"price": 248500, "change": 1500, "change_pct": 0.61},
        "Gold 24K (Per 10 Grams)": {"price": 213000, "change": 1285, "change_pct": 0.61},
        "Gold 22K (Per Tola)": {"price": 227800, "change": 1375, "change_pct": 0.61},
        "Gold 22K (Per 10 Grams)": {"price": 195250, "change": 1178, "change_pct": 0.61},
        "Silver (Per Tola)": {"price": 2950, "change": 25, "change_pct": 0.86},
        "Silver (Per 10 Grams)": {"price": 2530, "change": 21, "change_pct": 0.84},
    }

    for name, data in commodity_prices.items():
        result = client.table("commodities").select("id").eq("name", name).execute()
        if result.data:
            client.table("commodities").update({
                "current_price": data["price"],
                "change_amount": data["change"],
                "change_percentage": data["change_pct"],
                "last_updated": datetime.utcnow().isoformat(),
            }).eq("id", result.data[0]["id"]).execute()
            print(f"Updated {name}: Rs. {data['price']}")


def seed_sample_news():
    """Add sample news articles."""
    client = get_supabase_service_client()

    # Get a news source
    source_result = client.table("news_sources").select("id").eq("name", "Business Recorder").execute()
    if not source_result.data:
        print("No news source found")
        return

    source_id = source_result.data[0]["id"]

    articles = [
        {
            "title": "PSX gains 500 points as market optimism returns",
            "summary": "The Pakistan Stock Exchange witnessed a bullish trend as investors showed renewed confidence following positive economic indicators.",
            "url": "https://example.com/news/psx-gains-500-points",
            "sentiment_score": 0.8,
            "sentiment_label": "positive",
            "categories": ["stocks", "market"],
        },
        {
            "title": "Gold prices surge on global uncertainty",
            "summary": "Gold prices in Pakistan reached new highs as investors seek safe haven assets amid global economic concerns.",
            "url": "https://example.com/news/gold-prices-surge",
            "sentiment_score": 0.6,
            "sentiment_label": "neutral",
            "categories": ["commodities", "gold"],
        },
        {
            "title": "Banks report strong Q4 earnings",
            "summary": "Major Pakistani banks including HBL and UBL reported better-than-expected quarterly results, boosting banking sector stocks.",
            "url": "https://example.com/news/banks-q4-earnings",
            "sentiment_score": 0.75,
            "sentiment_label": "positive",
            "categories": ["banking", "stocks"],
        },
        {
            "title": "SBP maintains policy rate amid inflation concerns",
            "summary": "The State Bank of Pakistan decided to maintain the policy rate, citing ongoing inflationary pressures in the economy.",
            "url": "https://example.com/news/sbp-policy-rate",
            "sentiment_score": 0.4,
            "sentiment_label": "neutral",
            "categories": ["economy", "banking"],
        },
        {
            "title": "Tech stocks lead market rally",
            "summary": "Technology sector stocks, led by Systems Limited and TRG Pakistan, outperformed the broader market with significant gains.",
            "url": "https://example.com/news/tech-stocks-rally",
            "sentiment_score": 0.85,
            "sentiment_label": "positive",
            "categories": ["technology", "stocks"],
        },
    ]

    for article in articles:
        # Check if article exists
        existing = client.table("news_articles").select("id").eq("url", article["url"]).execute()
        if existing.data:
            print(f"Article already exists: {article['title'][:30]}...")
            continue

        client.table("news_articles").insert({
            "source_id": source_id,
            "title": article["title"],
            "summary": article["summary"],
            "url": article["url"],
            "sentiment_score": article["sentiment_score"],
            "sentiment_label": article["sentiment_label"],
            "categories": article["categories"],
            "is_processed": True,
            "published_at": datetime.utcnow().isoformat(),
            "scraped_at": datetime.utcnow().isoformat(),
        }).execute()
        print(f"Added article: {article['title'][:40]}...")


def main():
    print("Seeding sample prices...")

    print("\nUpdating stock prices...")
    update_stock_prices()

    print("\nUpdating commodity prices...")
    update_commodity_prices()

    print("\nAdding sample news...")
    seed_sample_news()

    print("\nSample data seeding completed!")


if __name__ == "__main__":
    main()
