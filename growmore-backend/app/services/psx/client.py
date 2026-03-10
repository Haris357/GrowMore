"""
PSX Terminal REST API client (psxterminal.com/api).

Primary data source for real-time ticks, fundamentals, company info, klines, dividends.
"""
import asyncio
import logging
import time
from typing import Any, Dict, List, Optional

import httpx

from app.config.settings import settings
from .cache import TTLCache
from .config import (
    CACHE_TTL_COMPANY_INFO,
    CACHE_TTL_DIVIDENDS,
    CACHE_TTL_FUNDAMENTALS,
    CACHE_TTL_KLINES,
    CACHE_TTL_MARKET_STATS,
    CACHE_TTL_SECTORS,
    CACHE_TTL_SYMBOLS,
    CACHE_TTL_TICKS,
    MARKET_TYPE_REG,
    PSX_API_RATE_LIMIT,
)
from .rate_limiter import TokenBucketRateLimiter

logger = logging.getLogger(__name__)


class CircuitBreaker:
    """Simple circuit breaker: opens after N consecutive failures, recovers after timeout."""

    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 300):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.last_failure_time = 0.0
        self.state = "closed"  # closed, open, half-open

    def record_success(self):
        self.failures = 0
        self.state = "closed"

    def record_failure(self):
        self.failures += 1
        self.last_failure_time = time.monotonic()
        if self.failures >= self.failure_threshold:
            self.state = "open"
            logger.warning(f"Circuit breaker OPEN after {self.failures} failures")

    def can_execute(self) -> bool:
        if self.state == "closed":
            return True
        if self.state == "open":
            if time.monotonic() - self.last_failure_time > self.recovery_timeout:
                self.state = "half-open"
                return True
            return False
        return True  # half-open: allow one attempt


class PSXTerminalClient:
    """Async client for PSX Terminal REST API with rate limiting, caching, and retry logic."""

    def __init__(self):
        self._http: Optional[httpx.AsyncClient] = None
        self._rate_limiter = TokenBucketRateLimiter(
            max_tokens=PSX_API_RATE_LIMIT,
            refill_rate=PSX_API_RATE_LIMIT / 60,
        )
        self._cache = TTLCache()
        self._circuit = CircuitBreaker()
        self._base_url = settings.psx_terminal_base_url

    async def _ensure_client(self):
        if self._http is None or self._http.is_closed:
            self._http = httpx.AsyncClient(
                base_url=self._base_url,
                timeout=httpx.Timeout(30.0, connect=10.0),
                follow_redirects=True,
                headers={"User-Agent": "GrowMore/1.0"},
            )

    async def _request(
        self, path: str, cache_key: Optional[str] = None, cache_ttl: int = 0
    ) -> Any:
        # Check cache
        if cache_key:
            cached = await self._cache.get(cache_key)
            if cached is not None:
                return cached

        if not self._circuit.can_execute():
            raise RuntimeError(f"PSX Terminal circuit breaker open, skipping {path}")

        await self._rate_limiter.acquire()
        await self._ensure_client()

        last_error = None
        for attempt in range(3):
            try:
                response = await self._http.get(path)
                response.raise_for_status()
                data = response.json()

                if not data.get("success", True):
                    raise RuntimeError(f"PSX API error: {data.get('error', 'unknown')}")

                result = data.get("data", data)

                if cache_key and cache_ttl > 0:
                    await self._cache.set(cache_key, result, cache_ttl)

                self._circuit.record_success()
                return result

            except httpx.HTTPStatusError as e:
                last_error = e
                if e.response.status_code == 429:
                    await asyncio.sleep(2 ** attempt)
                elif e.response.status_code >= 500:
                    await asyncio.sleep(1 * (attempt + 1))
                else:
                    self._circuit.record_failure()
                    raise
            except httpx.RequestError as e:
                last_error = e
                await asyncio.sleep(1 * (attempt + 1))

        self._circuit.record_failure()
        raise RuntimeError(f"Failed to fetch {path} after 3 retries: {last_error}")

    async def close(self):
        if self._http and not self._http.is_closed:
            await self._http.aclose()

    # ── Public API Methods ──

    async def get_status(self) -> dict:
        return await self._request("/api/status")

    async def get_symbols(self) -> List[str]:
        return await self._request(
            "/api/symbols",
            cache_key="symbols",
            cache_ttl=CACHE_TTL_SYMBOLS,
        )

    async def get_tick(self, symbol: str, market_type: str = MARKET_TYPE_REG) -> dict:
        return await self._request(
            f"/api/ticks/{market_type}/{symbol}",
            cache_key=f"tick:{market_type}:{symbol}",
            cache_ttl=CACHE_TTL_TICKS,
        )

    async def get_market_stats(self, market_type: str = MARKET_TYPE_REG) -> dict:
        return await self._request(
            f"/api/stats/{market_type}",
            cache_key=f"stats:{market_type}",
            cache_ttl=CACHE_TTL_MARKET_STATS,
        )

    async def get_breadth(self) -> dict:
        return await self._request(
            "/api/stats/breadth",
            cache_key="breadth",
            cache_ttl=CACHE_TTL_MARKET_STATS,
        )

    async def get_sector_stats(self) -> dict:
        return await self._request(
            "/api/stats/sectors",
            cache_key="sectors",
            cache_ttl=CACHE_TTL_SECTORS,
        )

    async def get_company(self, symbol: str) -> dict:
        return await self._request(
            f"/api/companies/{symbol}",
            cache_key=f"company:{symbol}",
            cache_ttl=CACHE_TTL_COMPANY_INFO,
        )

    async def get_fundamentals(self, symbol: str) -> dict:
        return await self._request(
            f"/api/fundamentals/{symbol}",
            cache_key=f"fund:{symbol}",
            cache_ttl=CACHE_TTL_FUNDAMENTALS,
        )

    async def get_klines(
        self, symbol: str, timeframe: str = "1d", limit: int = 100
    ) -> list:
        return await self._request(
            f"/api/klines/{symbol}/{timeframe}?limit={limit}",
            cache_key=f"klines:{symbol}:{timeframe}:{limit}",
            cache_ttl=CACHE_TTL_KLINES,
        )

    async def get_dividends(self, symbol: str) -> list:
        return await self._request(
            f"/api/dividends/{symbol}",
            cache_key=f"dividends:{symbol}",
            cache_ttl=CACHE_TTL_DIVIDENDS,
        )

    async def get_ticks_batch(
        self, symbols: List[str], concurrency: int = 10
    ) -> Dict[str, dict]:
        """Fetch ticks for multiple symbols with controlled concurrency."""
        results: Dict[str, dict] = {}
        sem = asyncio.Semaphore(concurrency)

        async def fetch_one(sym: str):
            async with sem:
                try:
                    tick = await self.get_tick(sym)
                    results[sym] = tick
                except Exception as e:
                    logger.debug(f"Failed to fetch tick for {sym}: {e}")

        await asyncio.gather(*[fetch_one(s) for s in symbols])
        return results
