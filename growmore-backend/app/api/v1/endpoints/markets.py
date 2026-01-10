from fastapi import APIRouter, Depends
from typing import List
from uuid import UUID

from app.core.dependencies import get_db
from app.services.market_service import MarketService
from app.schemas.market import MarketResponse, SectorResponse, MarketWithSectorsResponse

router = APIRouter()


@router.get("", response_model=List[MarketResponse])
async def list_markets(db=Depends(get_db)):
    market_service = MarketService(db)
    markets = await market_service.get_all_markets()
    return [MarketResponse.model_validate(m.model_dump()) for m in markets]


@router.get("/{market_id}", response_model=MarketResponse)
async def get_market(market_id: UUID, db=Depends(get_db)):
    market_service = MarketService(db)
    market = await market_service.get_market_by_id(market_id)
    return MarketResponse.model_validate(market.model_dump())


@router.get("/{market_id}/sectors", response_model=List[SectorResponse])
async def get_market_sectors(market_id: UUID, db=Depends(get_db)):
    market_service = MarketService(db)
    sectors = await market_service.get_sectors_by_market(market_id)
    return [SectorResponse.model_validate(s.model_dump()) for s in sectors]


@router.get("/{market_id}/details", response_model=MarketWithSectorsResponse)
async def get_market_with_sectors(market_id: UUID, db=Depends(get_db)):
    market_service = MarketService(db)
    result = await market_service.get_market_with_sectors(market_id)
    return MarketWithSectorsResponse(
        **result["market"].model_dump(),
        sectors=[SectorResponse.model_validate(s.model_dump()) for s in result["sectors"]],
    )
