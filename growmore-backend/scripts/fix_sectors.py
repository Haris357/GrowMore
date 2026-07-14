"""
One-time backfill: fix company sectors.

The PSX sync originally resolved sectors by the DPS *numeric* code (e.g. "0807")
against the sectors table, which uses short codes ("BANK") — so the lookup failed
and most companies fell back to "Miscellaneous" or no sector.

This script pulls the authoritative sector for every stock from the DPS
market-watch, inserts any missing sectors, and reassigns each company's sector_id.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.psx.dps_client import DPSPortalClient
from app.db.supabase import get_supabase_service_client


async def main():
    db = get_supabase_service_client()
    rows = await DPSPortalClient().fetch_market_watch()
    print(f"Fetched {len(rows)} market-watch rows")

    # Authoritative sector name -> DPS numeric code (for creating missing sectors)
    name_to_code = {}
    for r in rows:
        if r.sector_name and r.sector_code:
            name_to_code.setdefault(r.sector_name, r.sector_code)

    # Existing sectors
    sectors = db.table("sectors").select("id, name").execute().data or []
    name_to_id = {s["name"]: s["id"] for s in sectors}

    # market_id is required (NOT NULL) on the sectors table
    market_row = db.table("markets").select("id").limit(1).execute().data
    market_id = market_row[0]["id"] if market_row else None

    # Insert missing sectors
    inserted = 0
    for name, code in name_to_code.items():
        if name not in name_to_id:
            payload = {"name": name, "code": code}
            if market_id:
                payload["market_id"] = market_id
            res = db.table("sectors").insert(payload).execute()
            if res.data:
                name_to_id[name] = res.data[0]["id"]
                inserted += 1
                print(f"  + created sector: {name} ({code})")

    # Reassign companies
    updated = 0
    skipped = 0
    for r in rows:
        if not r.sector_name:
            skipped += 1
            continue
        sid = name_to_id.get(r.sector_name)
        if not sid:
            skipped += 1
            continue
        try:
            db.table("companies").update({"sector_id": sid}).eq("symbol", r.symbol).execute()
            updated += 1
        except Exception as e:
            print(f"  ! failed {r.symbol}: {e}")
            skipped += 1

    print(f"\nDone. sectors inserted: {inserted}, companies updated: {updated}, skipped: {skipped}")


if __name__ == "__main__":
    asyncio.run(main())
