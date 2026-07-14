"""
Keep-alive background loop for free-tier hosting.

Two problems this addresses on free tiers:
  1. Render spins a web service DOWN after ~15 min with no inbound HTTP request.
     We self-ping our own PUBLIC url (Render injects RENDER_EXTERNAL_URL) so the
     load balancer sees real inbound traffic and keeps us warm.  NOTE: this only
     *maintains* an already-running instance — a sleeping app can't ping itself,
     so an EXTERNAL pinger (GitHub Actions / cron-job.org) is still the primary
     safeguard. This is a second layer.
  2. Supabase PAUSES a free project after ~7 days of inactivity. A tiny periodic
     query keeps the project counted as active.

The loop is started from the FastAPI lifespan and cancelled on shutdown. It only
runs on the host (RENDER_EXTERNAL_URL present) or when KEEP_ALIVE=1 is set, so it
stays quiet during local development.
"""
import asyncio
import logging
import os
import time

import httpx

from app.db.supabase import get_supabase_service_client

logger = logging.getLogger(__name__)

SELF_PING_INTERVAL = 10 * 60        # 10 min — under Render's 15-min sleep window
SUPABASE_INTERVAL = 6 * 60 * 60     # 6 h  — comfortably under Supabase's 7-day idle pause
_KEEPALIVE_TABLE = "companies"      # a table we know exists; 1-row read is enough


def keep_alive_enabled() -> bool:
    return bool(os.getenv("RENDER_EXTERNAL_URL") or os.getenv("KEEP_ALIVE"))


async def _self_ping(client: httpx.AsyncClient) -> None:
    base = os.getenv("RENDER_EXTERNAL_URL")  # e.g. https://growmore-api.onrender.com
    if not base:
        return
    try:
        r = await client.get(f"{base.rstrip('/')}/health", timeout=30)
        logger.debug(f"keep-alive: self-ping /health -> {r.status_code}")
    except Exception as e:
        logger.debug(f"keep-alive: self-ping failed (ok if waking): {e}")


def _supabase_query_sync() -> None:
    db = get_supabase_service_client()
    db.table(_KEEPALIVE_TABLE).select("id").limit(1).execute()


async def _supabase_ping() -> None:
    try:
        # supabase-py is sync — run off the event loop so we never block request handling.
        await asyncio.to_thread(_supabase_query_sync)
        logger.debug("keep-alive: supabase query ok")
    except Exception as e:
        logger.warning(f"keep-alive: supabase query failed: {e}")


async def keep_alive_loop() -> None:
    logger.info("keep-alive loop started (self-ping every 10m, supabase every 6h)")
    last_supabase = 0.0
    async with httpx.AsyncClient() as client:
        # Touch Supabase once shortly after boot, then on its own cadence.
        await _supabase_ping()
        last_supabase = time.monotonic()
        while True:
            try:
                await _self_ping(client)
                if time.monotonic() - last_supabase >= SUPABASE_INTERVAL:
                    await _supabase_ping()
                    last_supabase = time.monotonic()
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.debug(f"keep-alive: loop iteration error: {e}")
            await asyncio.sleep(SELF_PING_INTERVAL)
