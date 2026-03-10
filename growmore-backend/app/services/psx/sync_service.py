"""
PSX Sync Service — orchestrates data fetching from PSX Terminal API + DPS Portal
and writes everything to Supabase.

Replaces: UnifiedPSXScraper.scrape_market_prices() and UnifiedPSXScraper.scrape_full()
"""
import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import date
from typing import List, Optional

from .client import PSXTerminalClient
from .config import (
    DPS_COMPANY_BATCH_DELAY,
    DPS_COMPANY_BATCH_SIZE,
    FUNDAMENTALS_BATCH_SIZE,
    HISTORY_BACKFILL_MONTHS,
    HISTORY_BATCH_DELAY,
    HISTORY_BATCH_SIZE,
)
from .data_writer import PSXDataWriter
from .dps_client import DPSPortalClient
from .mappers import (
    map_company_full_to_updates,
    map_company_to_updates,
    map_dividends_to_stock_update,
    map_fundamentals_to_stock_update,
    map_kline_to_history,
    map_market_watch_to_stock_update,
    map_tick_to_stock_update,
)

logger = logging.getLogger(__name__)


@dataclass
class SyncResult:
    """Result of a sync operation. Field names match what scheduler.py expects."""
    mode: str
    symbols_found: int = 0
    stocks_updated: int = 0
    history_inserted: int = 0
    companies_updated: int = 0
    fundamentals_updated: int = 0
    financials_saved: int = 0
    errors: List[str] = field(default_factory=list)
    duration_seconds: float = 0.0

    @property
    def errors_count(self) -> int:
        return len(self.errors)


class PSXSyncService:
    """Main orchestrator for PSX data synchronization."""

    def __init__(self):
        self.psx_client = PSXTerminalClient()
        self.dps_client = DPSPortalClient()
        self.data_writer = PSXDataWriter()
        self._initialized = False

    def initialize(self):
        """One-time init: warm symbol cache."""
        if self._initialized:
            return
        self.data_writer.warm_symbol_cache()
        self._initialized = True
        logger.info("PSXSyncService initialized")

    async def close(self):
        """Cleanup resources."""
        await self.psx_client.close()

    # ─── Daily Price Sync (replaces scrape_market_prices) ───

    async def sync_daily_prices(self) -> SyncResult:
        """
        Daily at market close (3:45 PM PKT).
        Strategy: DPS market-watch for bulk prices (1 request, ~650 stocks).
        Fallback: PSX Terminal individual ticks if DPS fails.
        """
        result = SyncResult(mode="daily_prices")
        start = time.time()
        self.initialize()

        try:
            market_rows = await self.dps_client.fetch_market_watch()
            result.symbols_found = len(market_rows)
            logger.info(f"Daily sync: parsed {len(market_rows)} stocks from DPS market-watch")

            for row in market_rows:
                try:
                    # Ensure company exists in DB
                    if not self.data_writer.get_ids(row.symbol):
                        self.data_writer.ensure_company_exists(
                            row.symbol, row.name, row.sector_code
                        )

                    # Update stock price
                    price_data = map_market_watch_to_stock_update(row)
                    if self.data_writer.update_stock_price(row.symbol, price_data):
                        result.stocks_updated += 1

                        # Update company name
                        self.data_writer.update_company_name(row.symbol, row.name)

                        # Upsert stock_history
                        history_data = {
                            "open_price": row.open_price,
                            "high_price": row.high_price,
                            "low_price": row.low_price,
                            "close_price": row.current_price,
                            "volume": row.volume,
                        }
                        if self.data_writer.upsert_stock_history(row.symbol, date.today(), history_data):
                            result.history_inserted += 1
                except Exception as e:
                    result.errors.append(f"{row.symbol}: {e}")

        except Exception as e:
            logger.warning(f"DPS market-watch failed: {e}. Falling back to PSX Terminal ticks.")
            result = await self._fallback_tick_sync(result)

        result.duration_seconds = time.time() - start
        logger.info(
            f"Daily sync done: {result.stocks_updated} prices, "
            f"{result.history_inserted} history, {result.errors_count} errors "
            f"in {result.duration_seconds:.1f}s"
        )
        return result

    async def _fallback_tick_sync(self, result: SyncResult) -> SyncResult:
        """Fallback: fetch individual ticks from PSX Terminal if DPS is down."""
        try:
            symbols = await self.psx_client.get_symbols()
            result.symbols_found = len(symbols)
            logger.info(f"Fallback tick sync: fetching {len(symbols)} symbols from PSX Terminal")

            ticks = await self.psx_client.get_ticks_batch(symbols)

            for symbol, tick in ticks.items():
                try:
                    price_data = map_tick_to_stock_update(tick)
                    if self.data_writer.update_stock_price(symbol, price_data):
                        result.stocks_updated += 1
                except Exception as e:
                    result.errors.append(f"{symbol}: {e}")

        except Exception as e:
            result.errors.append(f"Fallback tick sync failed: {e}")
            logger.error(f"Fallback tick sync failed: {e}")

        return result

    # ─── Weekly Full Sync (replaces scrape_full) ───

    async def sync_full(self) -> SyncResult:
        """
        Weekly Saturday 2 AM PKT.
        Phase 1: DPS market-watch for bulk prices
        Phase 2: PSX Terminal fundamentals (batched, rate-limited)
        Phase 3: PSX Terminal company info (batched)
        Phase 4: PSX Terminal dividends (batched)
        Phase 5: DPS company pages for financial statements (batched)
        Phase 6: PSX Terminal klines for history gap-fill
        """
        result = SyncResult(mode="full")
        start = time.time()
        self.initialize()

        # Phase 1: Prices via DPS market-watch
        logger.info("Full sync Phase 1: DPS market-watch prices")
        market_rows = []
        try:
            market_rows = await self.dps_client.fetch_market_watch()
            result.symbols_found = len(market_rows)
            logger.info(f"Phase 1: parsed {len(market_rows)} stocks")

            for row in market_rows:
                try:
                    if not self.data_writer.get_ids(row.symbol):
                        self.data_writer.ensure_company_exists(
                            row.symbol, row.name, row.sector_code
                        )

                    price_data = map_market_watch_to_stock_update(row)
                    if self.data_writer.update_stock_price(row.symbol, price_data):
                        result.stocks_updated += 1
                        self.data_writer.update_company_name(row.symbol, row.name)

                        history_data = {
                            "open_price": row.open_price,
                            "high_price": row.high_price,
                            "low_price": row.low_price,
                            "close_price": row.current_price,
                            "volume": row.volume,
                        }
                        if self.data_writer.upsert_stock_history(row.symbol, date.today(), history_data):
                            result.history_inserted += 1
                except Exception as e:
                    result.errors.append(f"{row.symbol} price: {e}")
        except Exception as e:
            result.errors.append(f"CRITICAL: DPS market-watch failed: {e}")
            logger.error(f"Phase 1 failed: {e}")
            # Can't continue without symbols
            result.duration_seconds = time.time() - start
            return result

        # Get all symbols for remaining phases
        all_symbols = [row.symbol for row in market_rows]

        # Phase 2: PSX Terminal fundamentals
        logger.info(f"Full sync Phase 2: PSX Terminal fundamentals for {len(all_symbols)} symbols")
        await self._sync_fundamentals_batch(all_symbols, result)

        # Phase 3: PSX Terminal company info
        logger.info(f"Full sync Phase 3: PSX Terminal company info for {len(all_symbols)} symbols")
        await self._sync_company_info_batch(all_symbols, result)

        # Phase 4: PSX Terminal dividends
        logger.info(f"Full sync Phase 4: PSX Terminal dividends for {len(all_symbols)} symbols")
        await self._sync_dividends_batch(all_symbols, result)

        # Phase 5: DPS financial statements
        logger.info(f"Full sync Phase 5: DPS financial statements for {len(all_symbols)} symbols")
        await self._sync_financial_statements_batch(all_symbols, result)

        # Phase 6: PSX Terminal klines for recent history
        logger.info(f"Full sync Phase 6: PSX Terminal klines history gap-fill")
        await self._sync_klines_batch(all_symbols, result)

        result.duration_seconds = time.time() - start
        logger.info(
            f"Full sync done: {result.stocks_updated} prices, "
            f"{result.companies_updated} companies, {result.fundamentals_updated} fundamentals, "
            f"{result.financials_saved} financials, {result.history_inserted} history, "
            f"{result.errors_count} errors in {result.duration_seconds:.1f}s"
        )
        return result

    async def _sync_fundamentals_batch(self, symbols: List[str], result: SyncResult):
        """Fetch fundamentals from PSX Terminal for all symbols (rate-limited)."""
        sem = asyncio.Semaphore(FUNDAMENTALS_BATCH_SIZE)
        processed = 0

        async def fetch_one(symbol: str):
            nonlocal processed
            async with sem:
                try:
                    fund = await self.psx_client.get_fundamentals(symbol)
                    fund_data = map_fundamentals_to_stock_update(fund)
                    if fund_data and self.data_writer.update_stock_fundamentals(symbol, fund_data):
                        result.fundamentals_updated += 1
                except Exception as e:
                    result.errors.append(f"{symbol} fundamentals: {e}")
                finally:
                    processed += 1
                    if processed % 100 == 0:
                        logger.info(f"  Fundamentals: {processed}/{len(symbols)}")

        await asyncio.gather(*[fetch_one(s) for s in symbols])

    async def _sync_company_info_batch(self, symbols: List[str], result: SyncResult):
        """Fetch company info from PSX Terminal for all symbols (rate-limited)."""
        sem = asyncio.Semaphore(FUNDAMENTALS_BATCH_SIZE)
        processed = 0

        async def fetch_one(symbol: str):
            nonlocal processed
            async with sem:
                try:
                    company = await self.psx_client.get_company(symbol)
                    company_update, stock_update = map_company_to_updates(company)
                    if company_update:
                        if self.data_writer.update_company(symbol, company_update):
                            result.companies_updated += 1
                    if stock_update:
                        self.data_writer.update_stock_fundamentals(symbol, stock_update)
                except Exception as e:
                    result.errors.append(f"{symbol} company: {e}")
                finally:
                    processed += 1
                    if processed % 100 == 0:
                        logger.info(f"  Company info: {processed}/{len(symbols)}")

        await asyncio.gather(*[fetch_one(s) for s in symbols])

    async def _sync_dividends_batch(self, symbols: List[str], result: SyncResult):
        """Fetch dividends from PSX Terminal for all symbols (rate-limited)."""
        sem = asyncio.Semaphore(FUNDAMENTALS_BATCH_SIZE)

        async def fetch_one(symbol: str):
            async with sem:
                try:
                    dividends = await self.psx_client.get_dividends(symbol)
                    div_update = map_dividends_to_stock_update(dividends)
                    if div_update:
                        self.data_writer.update_stock_fundamentals(symbol, div_update)
                except Exception:
                    pass  # Dividends are optional, don't log errors

        await asyncio.gather(*[fetch_one(s) for s in symbols])

    async def _sync_financial_statements_batch(self, symbols: List[str], result: SyncResult):
        """Fetch financial statements from DPS company pages (batched, slower)."""
        for i in range(0, len(symbols), DPS_COMPANY_BATCH_SIZE):
            batch = symbols[i:i + DPS_COMPANY_BATCH_SIZE]

            tasks = [self.dps_client.fetch_company_data(s) for s in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            for sym, res in zip(batch, batch_results):
                if isinstance(res, Exception):
                    result.errors.append(f"{sym} financials: {res}")
                    continue
                if res is None:
                    continue

                ids = self.data_writer.get_ids(sym)
                if not ids:
                    continue

                company_id, _ = ids

                # Save financial statements
                if res.financials:
                    count = self.data_writer.save_financial_statements(company_id, res.financials)
                    result.financials_saved += count

                # Also save DPS fundamentals/ratios (more detailed than PSX Terminal)
                company_update, stock_update = map_company_full_to_updates(res)
                if company_update:
                    logo_url = res.info.logo_url if res.info else None
                    self.data_writer.update_company(sym, company_update, logo_url=logo_url)
                if stock_update and len(stock_update) > 1:  # more than just last_updated
                    self.data_writer.update_stock_fundamentals(sym, stock_update)

            done = min(i + DPS_COMPANY_BATCH_SIZE, len(symbols))
            if done % 50 == 0 or done == len(symbols):
                logger.info(f"  Financial statements: {done}/{len(symbols)}")

            if i + DPS_COMPANY_BATCH_SIZE < len(symbols):
                await asyncio.sleep(DPS_COMPANY_BATCH_DELAY)

    async def _sync_klines_batch(self, symbols: List[str], result: SyncResult):
        """Fetch recent daily klines from PSX Terminal to gap-fill stock_history."""
        sem = asyncio.Semaphore(FUNDAMENTALS_BATCH_SIZE)
        total_history = 0

        async def fetch_one(symbol: str):
            nonlocal total_history
            async with sem:
                try:
                    ids = self.data_writer.get_ids(symbol)
                    if not ids:
                        return
                    _, stock_id = ids

                    klines = await self.psx_client.get_klines(symbol, "1d", limit=30)
                    if not isinstance(klines, list):
                        return

                    for kline in klines:
                        history = map_kline_to_history(kline, stock_id)
                        date_val = date.fromisoformat(history.pop("date"))
                        history.pop("stock_id", None)
                        if self.data_writer.upsert_stock_history(symbol, date_val, history):
                            total_history += 1
                except Exception:
                    pass  # Kline history is best-effort

        await asyncio.gather(*[fetch_one(s) for s in symbols])
        result.history_inserted += total_history

    # ─── History Backfill (DPS /historical) ───

    async def sync_history_backfill(self, months: int = 0) -> SyncResult:
        """
        Backfill stock_history from DPS /historical endpoint.
        Fetches month-by-month OHLCV for all symbols and upserts into stock_history.
        Default: HISTORY_BACKFILL_MONTHS (24 months / 2 years).
        """
        if months <= 0:
            months = HISTORY_BACKFILL_MONTHS

        result = SyncResult(mode="history_backfill")
        start = time.time()
        self.initialize()

        # Get all symbols from cache
        all_symbols = list(self.data_writer._symbol_cache.keys())
        if not all_symbols:
            # Warm cache if empty, try fetching from market-watch
            try:
                market_rows = await self.dps_client.fetch_market_watch()
                for row in market_rows:
                    if not self.data_writer.get_ids(row.symbol):
                        self.data_writer.ensure_company_exists(
                            row.symbol, row.name, row.sector_code
                        )
                all_symbols = list(self.data_writer._symbol_cache.keys())
            except Exception as e:
                result.errors.append(f"Failed to get symbols: {e}")
                result.duration_seconds = time.time() - start
                return result

        result.symbols_found = len(all_symbols)
        logger.info(
            f"History backfill: {len(all_symbols)} symbols, {months} months each"
        )

        # Process in batches to be gentle on DPS
        for i in range(0, len(all_symbols), HISTORY_BATCH_SIZE):
            batch = all_symbols[i:i + HISTORY_BATCH_SIZE]

            tasks = [
                self._backfill_one_symbol(sym, months, result)
                for sym in batch
            ]
            await asyncio.gather(*tasks)

            done = min(i + HISTORY_BATCH_SIZE, len(all_symbols))
            if done % 25 == 0 or done == len(all_symbols):
                logger.info(
                    f"  History backfill: {done}/{len(all_symbols)} symbols, "
                    f"{result.history_inserted} rows inserted"
                )

            if i + HISTORY_BATCH_SIZE < len(all_symbols):
                await asyncio.sleep(HISTORY_BATCH_DELAY)

        result.duration_seconds = time.time() - start
        logger.info(
            f"History backfill done: {result.history_inserted} rows for "
            f"{result.symbols_found} symbols, {result.errors_count} errors "
            f"in {result.duration_seconds:.1f}s"
        )
        return result

    async def _backfill_one_symbol(
        self, symbol: str, months: int, result: SyncResult
    ):
        """Fetch and upsert historical data for a single symbol."""
        try:
            rows = await self.dps_client.fetch_historical(symbol, months=months)
            for row in rows:
                try:
                    date_val = date.fromisoformat(row["date"])
                    history_data = {
                        "open_price": row.get("open"),
                        "high_price": row.get("high"),
                        "low_price": row.get("low"),
                        "close_price": row.get("close"),
                        "volume": row.get("volume"),
                    }
                    if self.data_writer.upsert_stock_history(symbol, date_val, history_data):
                        result.history_inserted += 1
                except Exception:
                    pass  # Skip individual row errors
        except Exception as e:
            result.errors.append(f"{symbol} history: {e}")

    # ─── Intraday Sync (new, optional) ───

    async def sync_intraday(self) -> SyncResult:
        """
        Every 5 min during market hours (9:30 AM - 3:30 PM PKT).
        Fetches market stats to update top movers.
        """
        result = SyncResult(mode="intraday")
        start = time.time()
        self.initialize()

        try:
            stats = await self.psx_client.get_market_stats()
            movers = []
            for key in ("topGainers", "topLosers"):
                movers.extend(stats.get(key, []))

            result.symbols_found = len(movers)

            for mover in movers:
                symbol = mover.get("symbol")
                if not symbol:
                    continue
                try:
                    tick_data = map_tick_to_stock_update(mover)
                    if self.data_writer.update_stock_price(symbol, tick_data):
                        result.stocks_updated += 1
                except Exception as e:
                    result.errors.append(f"{symbol}: {e}")

        except Exception as e:
            result.errors.append(f"Market stats: {e}")
            logger.error(f"Intraday sync failed: {e}")

        result.duration_seconds = time.time() - start
        return result
