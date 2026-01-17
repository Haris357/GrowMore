import asyncio
import logging
from datetime import datetime
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.config.settings import settings
from app.db.supabase import get_supabase_service_client
from app.scrapers.news.business_recorder import BusinessRecorderScraper
from app.scrapers.news.dawn_business import DawnBusinessScraper
from app.scrapers.news.tribune_business import TribuneBusinessScraper
from app.scrapers.news.geo_business import GeoBusinessScraper
from app.scrapers.news.express_tribune import ExpressTribuneScraper
from app.scrapers.news.the_news import TheNewsScraper
from app.scrapers.news.ary_news import ARYNewsScraper
from app.scrapers.news.profit_pakistan import ProfitPakistanScraper
from app.scrapers.news.propakistani import ProPakistaniScraper
# Reddit scraper commented out - pending API approval
# from app.scrapers.reddit.pakistan_finance import PakistanFinanceRedditScraper
from app.scrapers.hackernews.hn_scraper import HackerNewsScraper
from app.scrapers.rss.feed_aggregator import RSSFeedAggregator, PakistanFinanceRSSAggregator
from app.scrapers.stocks.psx_scraper import PSXScraper
from app.scrapers.stocks.tickeranalysts_scraper import TickerAnalystsScraper
from app.scrapers.commodities.gold_scraper import GoldScraper
from app.scrapers.commodities.silver_scraper import SilverScraper
from app.ai.sentiment_analyzer import SentimentAnalyzer
from app.ai.news_summarizer import NewsSummarizer
from app.ai.impact_predictor import ImpactPredictor
from app.ai.embeddings import EmbeddingService

logger = logging.getLogger(__name__)


class ScraperScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.db = get_supabase_service_client()
        self.news_scrapers = [
            BusinessRecorderScraper(),
            DawnBusinessScraper(),
            TribuneBusinessScraper(),
            GeoBusinessScraper(),
            ExpressTribuneScraper(),
            TheNewsScraper(),
            ARYNewsScraper(),
            ProfitPakistanScraper(),
            ProPakistaniScraper(),
        ]
        # Reddit scraper commented out - pending API approval
        # self.reddit_scraper = PakistanFinanceRedditScraper()
        # Alternative community scrapers (no API key needed)
        self.hn_scraper = HackerNewsScraper()
        self.rss_scraper = RSSFeedAggregator()
        self.pakistan_rss_scraper = PakistanFinanceRSSAggregator()
        self.stock_scraper = PSXScraper()
        self.fundamentals_scraper = TickerAnalystsScraper()
        self.gold_scraper = GoldScraper()
        self.silver_scraper = SilverScraper()
        self.sentiment_analyzer = SentimentAnalyzer()
        self.summarizer = NewsSummarizer()
        self.impact_predictor = ImpactPredictor()
        self.embedding_service = EmbeddingService()
        self._is_running = False

    def start(self):
        if self._is_running:
            return

        # News scraping - 3 times a day (9 AM, 1 PM, 6 PM PKT)
        # PKT is UTC+5, so 9 AM PKT = 4 AM UTC, 1 PM PKT = 8 AM UTC, 6 PM PKT = 1 PM UTC
        self.scheduler.add_job(
            self.scrape_news,
            CronTrigger(hour="4,8,13", minute=0, timezone="UTC"),
            id="scrape_news",
            name="Scrape News Articles (3x daily)",
            replace_existing=True,
        )

        # Stock prices - Once daily at market close (3:30 PM PKT = 10:30 AM UTC)
        # PSX trading hours: 9:30 AM - 3:30 PM PKT
        self.scheduler.add_job(
            self.scrape_stocks,
            CronTrigger(hour=10, minute=45, timezone="UTC"),
            id="scrape_stocks",
            name="Scrape Stock Prices (daily at market close)",
            replace_existing=True,
        )

        # Commodities - Once daily at 6 PM PKT = 1 PM UTC (after gold market updates)
        self.scheduler.add_job(
            self.scrape_commodities,
            CronTrigger(hour=13, minute=0, timezone="UTC"),
            id="scrape_commodities",
            name="Scrape Commodity Prices (daily)",
            replace_existing=True,
        )

        # Process news with AI - twice daily (after news scrapes)
        self.scheduler.add_job(
            self.process_news,
            CronTrigger(hour="5,14", minute=0, timezone="UTC"),
            id="process_news",
            name="Process News with AI (2x daily)",
            replace_existing=True,
        )

        self.scheduler.start()
        self._is_running = True
        logger.info("Scraper scheduler started with daily schedules")
        logger.info("  - News: 9 AM, 1 PM, 6 PM PKT")
        logger.info("  - Stocks: 3:45 PM PKT (after market close)")
        logger.info("  - Commodities: 6 PM PKT")
        logger.info("  - AI Processing: 10 AM, 7 PM PKT")

    def stop(self):
        if self._is_running:
            self.scheduler.shutdown()
            self._is_running = False
            logger.info("Scraper scheduler stopped")

    async def scrape_news(self):
        logger.info("Starting news scrape")
        all_articles = []

        # Scrape traditional news sources
        for scraper in self.news_scrapers:
            try:
                articles = await scraper.scrape()
                all_articles.extend(articles)
                logger.info(f"Scraped {len(articles)} articles from {scraper.source_name}")
            except Exception as e:
                logger.error(f"Error scraping {scraper.source_name}: {e}")

        # Reddit scraper commented out - pending API approval
        # try:
        #     reddit_posts = await self.reddit_scraper.scrape()
        #     all_articles.extend(reddit_posts)
        #     logger.info(f"Scraped {len(reddit_posts)} posts from Reddit")
        # except Exception as e:
        #     logger.error(f"Error scraping Reddit: {e}")

        # Scrape Hacker News (no API key needed)
        try:
            hn_posts = await self.hn_scraper.scrape()
            all_articles.extend(hn_posts)
            logger.info(f"Scraped {len(hn_posts)} posts from Hacker News")
        except Exception as e:
            logger.error(f"Error scraping Hacker News: {e}")

        # Scrape RSS feeds (no API key needed)
        try:
            rss_articles = await self.rss_scraper.scrape()
            all_articles.extend(rss_articles)
            logger.info(f"Scraped {len(rss_articles)} articles from RSS feeds")
        except Exception as e:
            logger.error(f"Error scraping RSS feeds: {e}")

        # Scrape Pakistan-specific RSS feeds
        try:
            pk_rss_articles = await self.pakistan_rss_scraper.scrape()
            all_articles.extend(pk_rss_articles)
            logger.info(f"Scraped {len(pk_rss_articles)} articles from Pakistan RSS feeds")
        except Exception as e:
            logger.error(f"Error scraping Pakistan RSS feeds: {e}")

        await self._save_news_articles(all_articles)
        logger.info(f"News scrape completed. Total articles: {len(all_articles)}")

    async def _save_news_articles(self, articles: list):
        for article in articles:
            try:
                source_result = self.db.table("news_sources").select("id").eq(
                    "name", article.get("source_name", "Unknown")
                ).execute()

                if not source_result.data:
                    continue

                source_id = source_result.data[0]["id"]

                existing = self.db.table("news_articles").select("id").eq(
                    "url", article["url"]
                ).execute()

                if existing.data:
                    continue

                self.db.table("news_articles").insert({
                    "source_id": source_id,
                    "title": article["title"],
                    "slug": article.get("slug"),
                    "summary": article.get("summary"),
                    "url": article["url"],
                    "image_url": article.get("image_url"),
                    "author": article.get("author"),
                    "published_at": article.get("published_at", datetime.utcnow()).isoformat(),
                    "scraped_at": datetime.utcnow().isoformat(),
                    "is_processed": False,
                }).execute()

            except Exception as e:
                logger.error(f"Error saving article: {e}")

    async def scrape_stocks(self):
        logger.info("Starting stock scrape")
        try:
            # First, get basic price data from PSX
            stocks = await self.stock_scraper.scrape()
            await self._update_stock_prices(stocks)
            logger.info(f"Stock scrape completed. Updated {len(stocks)} stocks")

            # Then, try to get fundamental data from Ticker Analysts
            try:
                fundamentals = await self.fundamentals_scraper.scrape()
                if fundamentals:
                    await self._update_stock_fundamentals(fundamentals)
                    logger.info(f"Fundamentals scrape completed. Updated {len(fundamentals)} stocks")
            except Exception as e:
                logger.warning(f"Fundamentals scrape failed (non-critical): {e}")

        except Exception as e:
            logger.error(f"Error scraping stocks: {e}")

    async def _update_stock_prices(self, stocks: list):
        updated_count = 0
        for stock_data in stocks:
            try:
                company_result = self.db.table("companies").select("id").eq(
                    "symbol", stock_data["symbol"]
                ).execute()

                if not company_result.data:
                    # Company doesn't exist - skip (use seed_all_psx_stocks.py to add new companies)
                    continue

                company_id = company_result.data[0]["id"]

                stock_result = self.db.table("stocks").select("id").eq(
                    "company_id", company_id
                ).execute()

                update_data = {
                    "current_price": float(stock_data["current_price"]) if stock_data.get("current_price") else None,
                    "change_amount": float(stock_data["change_amount"]) if stock_data.get("change_amount") else None,
                    "change_percentage": float(stock_data["change_percentage"]) if stock_data.get("change_percentage") else None,
                    "volume": stock_data.get("volume"),
                    "last_updated": datetime.utcnow().isoformat(),
                }

                # Also update high/low/open if available
                if stock_data.get("open_price"):
                    update_data["open_price"] = float(stock_data["open_price"])
                if stock_data.get("high_price"):
                    update_data["high_price"] = float(stock_data["high_price"])
                if stock_data.get("low_price"):
                    update_data["low_price"] = float(stock_data["low_price"])
                if stock_data.get("previous_close"):
                    update_data["previous_close"] = float(stock_data["previous_close"])

                if stock_result.data:
                    self.db.table("stocks").update(update_data).eq(
                        "id", stock_result.data[0]["id"]
                    ).execute()
                    updated_count += 1

            except Exception as e:
                logger.error(f"Error updating stock {stock_data.get('symbol')}: {e}")

        logger.info(f"Updated {updated_count} stock prices")

    async def _update_stock_fundamentals(self, stocks: list):
        """Update stocks with fundamental data from Ticker Analysts."""
        updated_count = 0
        for stock_data in stocks:
            try:
                symbol = stock_data.get("symbol")
                if not symbol:
                    continue

                company_result = self.db.table("companies").select("id, name").eq(
                    "symbol", symbol
                ).execute()

                if not company_result.data:
                    continue

                company_id = company_result.data[0]["id"]
                company_name = company_result.data[0].get("name")

                # Update company name if we got a better one
                if stock_data.get("name") and stock_data["name"] != symbol:
                    if not company_name or company_name == symbol:
                        self.db.table("companies").update({
                            "name": stock_data["name"]
                        }).eq("id", company_id).execute()

                stock_result = self.db.table("stocks").select("id").eq(
                    "company_id", company_id
                ).execute()

                if not stock_result.data:
                    continue

                # Build update data with all available fundamental fields
                update_data = {"last_updated": datetime.utcnow().isoformat()}

                # Valuation metrics
                fundamental_fields = [
                    "market_cap", "pe_ratio", "pb_ratio", "ps_ratio", "peg_ratio", "ev_ebitda",
                    "eps", "book_value", "dps", "dividend_yield",
                    "roe", "roa", "roce", "gross_margin", "operating_margin", "net_margin", "profit_margin",
                    "debt_to_equity", "debt_to_assets", "current_ratio", "quick_ratio", "interest_coverage",
                    "revenue_growth", "earnings_growth", "profit_growth", "asset_growth",
                    "free_cash_flow", "operating_cash_flow", "fcf_yield",
                    "beta", "shares_outstanding", "float_shares", "payout_ratio",
                    "week_52_high", "week_52_low", "avg_volume"
                ]

                for field in fundamental_fields:
                    value = stock_data.get(field)
                    if value is not None:
                        try:
                            update_data[field] = float(value) if not isinstance(value, int) else value
                        except (ValueError, TypeError):
                            pass

                self.db.table("stocks").update(update_data).eq(
                    "id", stock_result.data[0]["id"]
                ).execute()
                updated_count += 1

            except Exception as e:
                logger.error(f"Error updating fundamentals for {stock_data.get('symbol')}: {e}")

        logger.info(f"Updated {updated_count} stocks with fundamental data")

    async def scrape_commodities(self):
        logger.info("Starting commodity scrape")
        try:
            gold_rates = await self.gold_scraper.scrape()
            silver_rates = await self.silver_scraper.scrape()

            all_rates = gold_rates + silver_rates
            await self._update_commodity_prices(all_rates)

            logger.info(f"Commodity scrape completed. Updated {len(all_rates)} commodities")
        except Exception as e:
            logger.error(f"Error scraping commodities: {e}")

    async def _update_commodity_prices(self, rates: list):
        for rate in rates:
            try:
                type_result = self.db.table("commodity_types").select("id").eq(
                    "name", rate.get("commodity_type", "")
                ).execute()

                if not type_result.data:
                    continue

                type_id = type_result.data[0]["id"]

                commodity_result = self.db.table("commodities").select("id").eq(
                    "commodity_type_id", type_id
                ).ilike("name", f"%{rate['name']}%").execute()

                if commodity_result.data:
                    update_data = {
                        "last_updated": datetime.utcnow().isoformat(),
                    }
                    if rate.get("current_price"):
                        update_data["current_price"] = float(rate["current_price"])
                    if rate.get("change_amount"):
                        update_data["change_amount"] = float(rate["change_amount"])
                    if rate.get("change_percentage"):
                        update_data["change_percentage"] = float(rate["change_percentage"])

                    self.db.table("commodities").update(update_data).eq(
                        "id", commodity_result.data[0]["id"]
                    ).execute()

            except Exception as e:
                logger.error(f"Error updating commodity {rate.get('name')}: {e}")

    async def process_news(self):
        logger.info("Starting news processing")
        try:
            result = self.db.table("news_articles").select("*").eq(
                "is_processed", False
            ).limit(20).execute()

            articles = result.data or []

            for article in articles:
                try:
                    content = article.get("content") or article.get("summary") or article["title"]

                    sentiment = await self.sentiment_analyzer.analyze(
                        article["title"], content
                    )
                    summary_data = await self.summarizer.summarize(
                        article["title"], content
                    )
                    impact = await self.impact_predictor.predict(
                        article["title"], content
                    )

                    self.db.table("news_articles").update({
                        "sentiment_score": float(sentiment["sentiment_score"]),
                        "sentiment_label": sentiment["sentiment_label"],
                        "summary": summary_data["summary"],
                        "categories": summary_data["categories"],
                        "tags": summary_data["tags"],
                        "impact_score": float(impact["impact_score"]),
                        "is_processed": True,
                    }).eq("id", article["id"]).execute()

                    embedding = await self.embedding_service.generate_embedding(
                        f"{article['title']} {summary_data['summary']}"
                    )
                    self.db.table("news_embeddings").insert({
                        "news_id": article["id"],
                        "embedding": embedding,
                    }).execute()

                except Exception as e:
                    logger.error(f"Error processing article {article['id']}: {e}")

            logger.info(f"News processing completed. Processed {len(articles)} articles")
        except Exception as e:
            logger.error(f"Error in news processing: {e}")

    async def run_manual_scrape(self, scraper_type: str):
        if scraper_type == "news":
            await self.scrape_news()
        elif scraper_type == "stocks":
            await self.scrape_stocks()
        elif scraper_type == "fundamentals":
            # Scrape only fundamentals (useful for one-time data enrichment)
            try:
                fundamentals = await self.fundamentals_scraper.scrape()
                if fundamentals:
                    await self._update_stock_fundamentals(fundamentals)
                    logger.info(f"Manual fundamentals scrape completed. Updated {len(fundamentals)} stocks")
            except Exception as e:
                logger.error(f"Error in manual fundamentals scrape: {e}")
        elif scraper_type == "commodities":
            await self.scrape_commodities()
        elif scraper_type == "process":
            await self.process_news()
        elif scraper_type == "all":
            await self.scrape_news()
            await self.scrape_stocks()
            await self.scrape_commodities()
            await self.process_news()


scheduler_instance: Optional[ScraperScheduler] = None


def get_scheduler() -> ScraperScheduler:
    global scheduler_instance
    if scheduler_instance is None:
        scheduler_instance = ScraperScheduler()
    return scheduler_instance
