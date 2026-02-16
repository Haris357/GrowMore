import logging
import time
from datetime import datetime
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

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
from app.scrapers.stocks.unified_psx_scraper import UnifiedPSXScraper
from app.scrapers.commodities.gold_scraper import GoldScraper
from app.scrapers.commodities.silver_scraper import SilverScraper
from app.ai.sentiment_analyzer import SentimentAnalyzer
from app.ai.news_summarizer import NewsSummarizer
from app.ai.impact_predictor import ImpactPredictor
from app.ai.embeddings import EmbeddingService
from app.logging.service import logging_service

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
        self.psx_scraper = UnifiedPSXScraper()
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

        # Full stock scrape - weekly on Saturday at 2 AM PKT = 9 PM Friday UTC
        self.scheduler.add_job(
            self.scrape_stocks_full,
            CronTrigger(day_of_week="fri", hour=21, minute=0, timezone="UTC"),
            id="scrape_stocks_full",
            name="Full Stock Scrape (weekly - prices, fundamentals, financials)",
            replace_existing=True,
        )

        # Commodities - Once daily at 6 PM PKT = 1 PM UTC
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
        logger.info("  - Stocks (daily prices): 3:45 PM PKT (after market close)")
        logger.info("  - Stocks (full scrape): Saturday 2 AM PKT (weekly)")
        logger.info("  - Commodities: 6 PM PKT")
        logger.info("  - AI Processing: 10 AM, 7 PM PKT")

    def stop(self):
        if self._is_running:
            self.scheduler.shutdown()
            self._is_running = False
            logger.info("Scraper scheduler stopped")

    async def scrape_news(self):
        logger.info("Starting news scrape")
        start = time.time()
        scraper_log = await logging_service.log_scraper_start("news")
        log_id = scraper_log.get("id")
        all_articles = []

        for scraper in self.news_scrapers:
            try:
                articles = await scraper.scrape()
                all_articles.extend(articles)
                logger.info(f"Scraped {len(articles)} articles from {scraper.source_name}")
            except Exception as e:
                logger.error(f"Error scraping {scraper.source_name}: {e}")

        try:
            hn_posts = await self.hn_scraper.scrape()
            all_articles.extend(hn_posts)
            logger.info(f"Scraped {len(hn_posts)} posts from Hacker News")
        except Exception as e:
            logger.error(f"Error scraping Hacker News: {e}")

        try:
            rss_articles = await self.rss_scraper.scrape()
            all_articles.extend(rss_articles)
            logger.info(f"Scraped {len(rss_articles)} articles from RSS feeds")
        except Exception as e:
            logger.error(f"Error scraping RSS feeds: {e}")

        try:
            pk_rss_articles = await self.pakistan_rss_scraper.scrape()
            all_articles.extend(pk_rss_articles)
            logger.info(f"Scraped {len(pk_rss_articles)} articles from Pakistan RSS feeds")
        except Exception as e:
            logger.error(f"Error scraping Pakistan RSS feeds: {e}")

        saved = await self._save_news_articles(all_articles)
        duration = int((time.time() - start) * 1000)
        logger.info(f"News scrape completed. Total: {len(all_articles)}, Saved: {saved}")

        if log_id:
            await logging_service.log_scraper_complete(
                log_id,
                records_processed=len(all_articles),
                records_created=saved,
                duration_ms=duration,
            )

    async def _save_news_articles(self, articles: list) -> int:
        saved = 0
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
                saved += 1

            except Exception as e:
                logger.error(f"Error saving article: {e}")
        return saved

    async def scrape_stocks(self):
        """Daily stock scrape — prices only from PSX market-watch."""
        logger.info("Starting daily stock price scrape")
        start = time.time()
        scraper_log = await logging_service.log_scraper_start("stocks")
        log_id = scraper_log.get("id")
        try:
            result = await self.psx_scraper.scrape_market_prices()
            duration = int((time.time() - start) * 1000)
            logger.info(
                f"Daily stock scrape completed: {result.stocks_updated} prices updated, "
                f"{result.history_inserted} history rows, {result.errors_count} errors"
            )
            if log_id:
                await logging_service.log_scraper_complete(
                    log_id,
                    records_processed=result.stocks_updated + result.errors_count,
                    records_updated=result.stocks_updated,
                    records_created=result.history_inserted,
                    records_failed=result.errors_count,
                    duration_ms=duration,
                )
        except Exception as e:
            duration = int((time.time() - start) * 1000)
            logger.error(f"Error in daily stock scrape: {e}")
            if log_id:
                await logging_service.log_scraper_failure(log_id, str(e), duration)

    async def scrape_stocks_full(self):
        """Weekly full scrape — prices + fundamentals + financials + logos."""
        logger.info("Starting full stock scrape (weekly)")
        start = time.time()
        scraper_log = await logging_service.log_scraper_start("stocks_full")
        log_id = scraper_log.get("id")
        try:
            result = await self.psx_scraper.scrape_full()
            duration = int((time.time() - start) * 1000)
            logger.info(
                f"Full stock scrape completed: {result.stocks_updated} prices, "
                f"{result.companies_updated} companies, "
                f"{result.financials_saved} financial records, "
                f"{result.history_inserted} history rows, "
                f"{result.errors_count} errors"
            )
            if log_id:
                total = result.stocks_updated + result.companies_updated + result.financials_saved
                await logging_service.log_scraper_complete(
                    log_id,
                    records_processed=total + result.errors_count,
                    records_updated=result.stocks_updated + result.companies_updated,
                    records_created=result.financials_saved + result.history_inserted,
                    records_failed=result.errors_count,
                    duration_ms=duration,
                )
        except Exception as e:
            duration = int((time.time() - start) * 1000)
            logger.error(f"Error in full stock scrape: {e}")
            if log_id:
                await logging_service.log_scraper_failure(log_id, str(e), duration)

    async def scrape_commodities(self):
        logger.info("Starting commodity scrape")
        start = time.time()
        scraper_log = await logging_service.log_scraper_start("commodities")
        log_id = scraper_log.get("id")
        try:
            gold_rates = await self.gold_scraper.scrape()
            silver_rates = await self.silver_scraper.scrape()

            all_rates = gold_rates + silver_rates
            await self._update_commodity_prices(all_rates)

            duration = int((time.time() - start) * 1000)
            logger.info(f"Commodity scrape completed. Updated {len(all_rates)} commodities")
            if log_id:
                await logging_service.log_scraper_complete(
                    log_id,
                    records_processed=len(all_rates),
                    records_updated=len(all_rates),
                    duration_ms=duration,
                )
        except Exception as e:
            duration = int((time.time() - start) * 1000)
            logger.error(f"Error scraping commodities: {e}")
            if log_id:
                await logging_service.log_scraper_failure(log_id, str(e), duration)

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
        start = time.time()
        scraper_log = await logging_service.log_scraper_start("process_news")
        log_id = scraper_log.get("id")
        processed = 0
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

                    processed += 1
                except Exception as e:
                    logger.error(f"Error processing article {article['id']}: {e}")

            duration = int((time.time() - start) * 1000)
            logger.info(f"News processing completed. Processed {processed}/{len(articles)} articles")
            if log_id:
                await logging_service.log_scraper_complete(
                    log_id,
                    records_processed=len(articles),
                    records_updated=processed,
                    records_failed=len(articles) - processed,
                    duration_ms=duration,
                )
        except Exception as e:
            duration = int((time.time() - start) * 1000)
            logger.error(f"Error in news processing: {e}")
            if log_id:
                await logging_service.log_scraper_failure(log_id, str(e), duration)

    async def run_manual_scrape(self, scraper_type: str):
        if scraper_type == "news":
            await self.scrape_news()
        elif scraper_type == "stocks":
            await self.scrape_stocks()
        elif scraper_type == "stocks_full":
            await self.scrape_stocks_full()
        elif scraper_type in ("fundamentals", "financial_statements"):
            # Backwards-compatible aliases — both now run the full scrape
            await self.scrape_stocks_full()
        elif scraper_type == "commodities":
            await self.scrape_commodities()
        elif scraper_type == "process":
            await self.process_news()
        elif scraper_type == "all":
            await self.scrape_news()
            await self.scrape_stocks_full()
            await self.scrape_commodities()
            await self.process_news()


scheduler_instance: Optional[ScraperScheduler] = None


def get_scheduler() -> ScraperScheduler:
    global scheduler_instance
    if scheduler_instance is None:
        scheduler_instance = ScraperScheduler()
    return scheduler_instance
