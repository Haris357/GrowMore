"""
Run scrapers manually to fetch live data.
Usage: python scripts/run_scrapers.py [all|stocks|commodities|news]
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.scrapers.scheduler import get_scheduler


async def main():
    scraper_type = sys.argv[1] if len(sys.argv) > 1 else "all"

    print(f"Running {scraper_type} scraper(s)...")

    scheduler = get_scheduler()

    if scraper_type == "stocks":
        await scheduler.scrape_stocks()
    elif scraper_type == "commodities":
        await scheduler.scrape_commodities()
    elif scraper_type == "news":
        await scheduler.scrape_news()
    elif scraper_type == "process":
        await scheduler.process_news()
    elif scraper_type == "all":
        print("Scraping stocks...")
        await scheduler.scrape_stocks()
        print("Scraping commodities...")
        await scheduler.scrape_commodities()
        print("Scraping news...")
        await scheduler.scrape_news()
    else:
        print(f"Unknown scraper type: {scraper_type}")
        print("Usage: python scripts/run_scrapers.py [all|stocks|commodities|news|process]")
        return

    print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
