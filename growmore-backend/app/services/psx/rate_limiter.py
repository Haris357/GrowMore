"""
Token-bucket rate limiter for PSX Terminal API (100 requests/minute).
"""
import asyncio
import time


class TokenBucketRateLimiter:
    def __init__(self, max_tokens: int = 100, refill_rate: float = 100 / 60):
        self.max_tokens = max_tokens
        self.refill_rate = refill_rate  # tokens per second
        self.tokens = float(max_tokens)
        self.last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self.last_refill
            self.tokens = min(self.max_tokens, self.tokens + elapsed * self.refill_rate)
            self.last_refill = now

            if self.tokens < 1:
                wait_time = (1 - self.tokens) / self.refill_rate
                await asyncio.sleep(wait_time)
                self.tokens = 0
                self.last_refill = time.monotonic()
            else:
                self.tokens -= 1
