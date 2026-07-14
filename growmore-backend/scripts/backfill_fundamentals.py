"""
Backfill fundamentals + financial statements for ALL cached symbols from DPS.
Populates financial_statements + market cap / P/E / margins / 52w / shares.
Run this before compute_ratios.py.
"""
import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
for n in ("httpcore", "httpx", "hpack"):
    logging.getLogger(n).setLevel(logging.WARNING)

from app.services.psx.sync_service import PSXSyncService


async def main():
    svc = PSXSyncService()
    res = await svc.sync_fundamentals()
    print("RESULT:", res)
    await svc.close()


if __name__ == "__main__":
    asyncio.run(main())
