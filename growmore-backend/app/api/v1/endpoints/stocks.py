from datetime import datetime
from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from uuid import UUID

from app.core.dependencies import get_db
from app.services.stock_service import StockService
from app.schemas.stock import (
    StockResponse,
    StockDetailResponse,
    StockHistoryListResponse,
    TopStockResponse,
    CompanyResponse,
)
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[StockResponse])
async def list_stocks(
    market_id: Optional[UUID] = None,
    sector_id: Optional[UUID] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=500),
    sort_by: str = Query(default="symbol"),
    sort_order: str = Query(default="asc", pattern="^(asc|desc)$"),
    db=Depends(get_db),
):
    stock_service = StockService(db)
    result = await stock_service.get_stocks(
        market_id=market_id,
        sector_id=sector_id,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    items = []
    for item in result["items"]:
        company = item.get("companies", {})
        sector = company.get("sectors", {}) or {}
        items.append(StockResponse(
            id=item["id"],
            company_id=item["company_id"],
            symbol=company.get("symbol", ""),
            name=company.get("name", ""),
            logo_url=company.get("logo_url"),
            sector_name=sector.get("name") if sector else None,
            current_price=item.get("current_price"),
            change_amount=item.get("change_amount"),
            change_percentage=item.get("change_percentage"),
            volume=item.get("volume"),
            market_cap=item.get("market_cap"),
            last_updated=item.get("last_updated"),
        ))

    return PaginatedResponse(
        items=items,
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        total_pages=result["total_pages"],
        has_next=result["has_next"],
        has_previous=result["has_previous"],
    )


@router.get("/top-gainers", response_model=TopStockResponse)
async def get_top_gainers(
    market_id: UUID,
    limit: int = Query(default=10, ge=1, le=50),
    db=Depends(get_db),
):
    stock_service = StockService(db)
    stocks = await stock_service.get_top_gainers(market_id, limit)

    items = []
    for item in stocks:
        company = item.get("companies", {})
        items.append(StockResponse(
            id=item["id"],
            company_id=item["company_id"],
            symbol=company.get("symbol", ""),
            name=company.get("name", ""),
            current_price=item.get("current_price"),
            change_amount=item.get("change_amount"),
            change_percentage=item.get("change_percentage"),
            volume=item.get("volume"),
            market_cap=item.get("market_cap"),
            last_updated=item.get("last_updated"),
        ))

    return TopStockResponse(stocks=items, as_of=datetime.utcnow())


@router.get("/top-losers", response_model=TopStockResponse)
async def get_top_losers(
    market_id: UUID,
    limit: int = Query(default=10, ge=1, le=50),
    db=Depends(get_db),
):
    stock_service = StockService(db)
    stocks = await stock_service.get_top_losers(market_id, limit)

    items = []
    for item in stocks:
        company = item.get("companies", {})
        items.append(StockResponse(
            id=item["id"],
            company_id=item["company_id"],
            symbol=company.get("symbol", ""),
            name=company.get("name", ""),
            current_price=item.get("current_price"),
            change_amount=item.get("change_amount"),
            change_percentage=item.get("change_percentage"),
            volume=item.get("volume"),
            market_cap=item.get("market_cap"),
            last_updated=item.get("last_updated"),
        ))

    return TopStockResponse(stocks=items, as_of=datetime.utcnow())


@router.get("/most-active", response_model=TopStockResponse)
async def get_most_active(
    market_id: UUID,
    limit: int = Query(default=10, ge=1, le=50),
    db=Depends(get_db),
):
    stock_service = StockService(db)
    stocks = await stock_service.get_most_active(market_id, limit)

    items = []
    for item in stocks:
        company = item.get("companies", {})
        items.append(StockResponse(
            id=item["id"],
            company_id=item["company_id"],
            symbol=company.get("symbol", ""),
            name=company.get("name", ""),
            current_price=item.get("current_price"),
            change_amount=item.get("change_amount"),
            change_percentage=item.get("change_percentage"),
            volume=item.get("volume"),
            market_cap=item.get("market_cap"),
            last_updated=item.get("last_updated"),
        ))

    return TopStockResponse(stocks=items, as_of=datetime.utcnow())


@router.get("/{stock_id}", response_model=StockDetailResponse)
async def get_stock(stock_id: UUID, db=Depends(get_db)):
    stock_service = StockService(db)
    result = await stock_service.get_stock_by_id(stock_id)

    return StockDetailResponse(
        id=result["id"],
        company=CompanyResponse.model_validate(result["company"]),
        current_price=result.get("current_price"),
        open_price=result.get("open_price"),
        high_price=result.get("high_price"),
        low_price=result.get("low_price"),
        close_price=result.get("close_price"),
        previous_close=result.get("previous_close"),
        change_amount=result.get("change_amount"),
        change_percentage=result.get("change_percentage"),
        volume=result.get("volume"),
        avg_volume=result.get("avg_volume"),
        market_cap=result.get("market_cap"),
        pe_ratio=result.get("pe_ratio"),
        eps=result.get("eps"),
        dividend_yield=result.get("dividend_yield"),
        week_52_high=result.get("week_52_high"),
        week_52_low=result.get("week_52_low"),
        last_updated=result.get("last_updated"),
        created_at=result.get("created_at"),
    )


@router.get("/{stock_id}/history", response_model=StockHistoryListResponse)
async def get_stock_history(
    stock_id: UUID,
    period: str = Query(default="1M", pattern="^(1W|1M|3M|6M|1Y)$"),
    db=Depends(get_db),
):
    stock_service = StockService(db)
    result = await stock_service.get_stock_history(stock_id, period)

    return StockHistoryListResponse(
        stock_id=result["stock_id"],
        symbol="",
        history=result["history"],
        period=result["period"],
    )
