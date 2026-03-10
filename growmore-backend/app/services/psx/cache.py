"""
In-memory TTL cache with per-key expiration.
"""
import asyncio
import time
from typing import Any, Optional


class TTLCache:
    def __init__(self):
        self._store: dict[str, tuple[Any, float]] = {}  # key -> (value, expiry)
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expiry = entry
            if time.monotonic() > expiry:
                del self._store[key]
                return None
            return value

    async def set(self, key: str, value: Any, ttl_seconds: int):
        async with self._lock:
            self._store[key] = (value, time.monotonic() + ttl_seconds)

    async def invalidate(self, key: str):
        async with self._lock:
            self._store.pop(key, None)

    async def invalidate_prefix(self, prefix: str):
        async with self._lock:
            keys_to_remove = [k for k in self._store if k.startswith(prefix)]
            for k in keys_to_remove:
                del self._store[k]

    async def clear(self):
        async with self._lock:
            self._store.clear()
