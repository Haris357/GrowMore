"""
Market Activity — live PSX announcements + payouts feed (scraped from DPS),
classified into categories (earnings / insider / announcement / payout).
"""
from fastapi import APIRouter, Query

from app.services.psx.dps_client import DPSPortalClient

router = APIRouter()


@router.get("/activity")
async def get_market_activity(
    query: str = Query(default=""),
    count: int = Query(default=120, ge=1, le=400),
    offset: int = Query(default=0, ge=0),
):
    """
    Returns a unified, categorized feed of PSX market activity.
    Announcements are classified by title; payouts are merged on the first page.
    """
    client = DPSPortalClient()

    activities = await client.fetch_market_activity(query=query, count=count, offset=offset)

    payout_items = []
    if offset == 0 and not query.strip():
        for p in await client.fetch_payouts(count=60):
            company = p.get("company") or p.get("symbol") or ""
            extra = f" · Book closure {p['book_closure']}" if p.get("book_closure") else ""
            payout_items.append({
                "date": p.get("date", ""),
                "time": "",
                "title": f"{company} announced a payout of {p.get('payout', '')}{extra}",
                "category": "payout",
                "symbol": p.get("symbol"),
                "document_url": None,
            })

    items = activities + payout_items

    counts = {"all": len(items), "earnings": 0, "insider": 0, "announcement": 0, "payout": 0}
    for it in items:
        c = it.get("category", "announcement")
        counts[c] = counts.get(c, 0) + 1

    return {"items": items, "counts": counts}
