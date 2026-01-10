from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from uuid import UUID

from app.core.dependencies import get_db
from app.services.search_service import SearchService

router = APIRouter()


@router.get("")
async def global_search(
    q: str = Query(..., min_length=2),
    market_id: Optional[UUID] = None,
    include_stocks: bool = Query(default=True),
    include_commodities: bool = Query(default=True),
    include_banks: bool = Query(default=True),
    include_news: bool = Query(default=True),
    limit: int = Query(default=10, ge=1, le=50),
    db=Depends(get_db),
):
    search_service = SearchService(db)
    return await search_service.global_search(
        query=q,
        market_id=market_id,
        include_stocks=include_stocks,
        include_commodities=include_commodities,
        include_banks=include_banks,
        include_news=include_news,
        limit=limit,
    )


@router.get("/semantic")
async def semantic_search(
    q: str = Query(..., min_length=3),
    limit: int = Query(default=10, ge=1, le=50),
    threshold: float = Query(default=0.7, ge=0.0, le=1.0),
    db=Depends(get_db),
):
    search_service = SearchService(db)
    return await search_service.semantic_search(
        query=q,
        limit=limit,
        threshold=threshold,
    )
