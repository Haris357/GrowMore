from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from uuid import UUID

from app.core.dependencies import get_db
from app.services.commodity_service import CommodityService
from app.schemas.commodity import (
    CommodityResponse,
    CommodityDetailResponse,
    CommodityHistoryListResponse,
    CommodityTypeResponse,
)
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[CommodityResponse])
async def list_commodities(
    market_id: Optional[UUID] = None,
    category: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db=Depends(get_db),
):
    commodity_service = CommodityService(db)
    result = await commodity_service.get_commodities(
        market_id=market_id,
        category=category,
        page=page,
        page_size=page_size,
    )

    items = []
    for item in result["items"]:
        commodity_type = item.get("commodity_types")
        items.append(CommodityResponse(
            id=item["id"],
            market_id=item["market_id"],
            commodity_type_id=item["commodity_type_id"],
            commodity_type=CommodityTypeResponse(**commodity_type) if commodity_type else None,
            name=item["name"],
            current_price=item.get("current_price"),
            price_per_unit=item.get("price_per_unit"),
            change_amount=item.get("change_amount"),
            change_percentage=item.get("change_percentage"),
            high_24h=item.get("high_24h"),
            low_24h=item.get("low_24h"),
            last_updated=item.get("last_updated"),
            created_at=item.get("created_at"),
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


@router.get("/types", response_model=List[CommodityTypeResponse])
async def list_commodity_types(db=Depends(get_db)):
    commodity_service = CommodityService(db)
    types = await commodity_service.get_commodity_types()
    return [CommodityTypeResponse.model_validate(t.model_dump()) for t in types]


@router.get("/gold", response_model=List[CommodityResponse])
async def get_gold_commodities(market_id: UUID, db=Depends(get_db)):
    commodity_service = CommodityService(db)
    commodities = await commodity_service.get_gold_commodities(market_id)

    items = []
    for item in commodities:
        commodity_type = item.get("commodity_types")
        items.append(CommodityResponse(
            id=item["id"],
            market_id=item["market_id"],
            commodity_type_id=item["commodity_type_id"],
            commodity_type=CommodityTypeResponse(**commodity_type) if commodity_type else None,
            name=item["name"],
            current_price=item.get("current_price"),
            price_per_unit=item.get("price_per_unit"),
            change_amount=item.get("change_amount"),
            change_percentage=item.get("change_percentage"),
            high_24h=item.get("high_24h"),
            low_24h=item.get("low_24h"),
            last_updated=item.get("last_updated"),
            created_at=item.get("created_at"),
        ))

    return items


@router.get("/silver", response_model=List[CommodityResponse])
async def get_silver_commodities(market_id: UUID, db=Depends(get_db)):
    commodity_service = CommodityService(db)
    commodities = await commodity_service.get_silver_commodities(market_id)

    items = []
    for item in commodities:
        commodity_type = item.get("commodity_types")
        items.append(CommodityResponse(
            id=item["id"],
            market_id=item["market_id"],
            commodity_type_id=item["commodity_type_id"],
            commodity_type=CommodityTypeResponse(**commodity_type) if commodity_type else None,
            name=item["name"],
            current_price=item.get("current_price"),
            price_per_unit=item.get("price_per_unit"),
            change_amount=item.get("change_amount"),
            change_percentage=item.get("change_percentage"),
            high_24h=item.get("high_24h"),
            low_24h=item.get("low_24h"),
            last_updated=item.get("last_updated"),
            created_at=item.get("created_at"),
        ))

    return items


@router.get("/{commodity_id}", response_model=CommodityDetailResponse)
async def get_commodity(commodity_id: UUID, db=Depends(get_db)):
    commodity_service = CommodityService(db)
    result = await commodity_service.get_commodity_by_id(commodity_id)

    commodity_type = result.get("commodity_type")

    return CommodityDetailResponse(
        id=result["id"],
        market_id=result["market_id"],
        commodity_type_id=result["commodity_type_id"],
        commodity_type=CommodityTypeResponse(**commodity_type) if commodity_type else None,
        name=result["name"],
        current_price=result.get("current_price"),
        price_per_unit=result.get("price_per_unit"),
        change_amount=result.get("change_amount"),
        change_percentage=result.get("change_percentage"),
        high_24h=result.get("high_24h"),
        low_24h=result.get("low_24h"),
        last_updated=result.get("last_updated"),
        created_at=result.get("created_at"),
        history_7d=result.get("history_7d"),
    )


@router.get("/{commodity_id}/history", response_model=CommodityHistoryListResponse)
async def get_commodity_history(
    commodity_id: UUID,
    period: str = Query(default="1M", pattern="^(1W|1M|3M|6M|1Y)$"),
    db=Depends(get_db),
):
    commodity_service = CommodityService(db)
    result = await commodity_service.get_commodity_history(commodity_id, period)

    return CommodityHistoryListResponse(
        commodity_id=result["commodity_id"],
        name=result["name"],
        history=result["history"],
        period=result["period"],
    )
