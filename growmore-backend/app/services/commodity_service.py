from datetime import date, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client

from app.models.commodity import Commodity, CommodityType, CommodityHistory
from app.repositories.commodity_repository import (
    CommodityRepository,
    CommodityTypeRepository,
    CommodityHistoryRepository,
)
from app.core.exceptions import NotFoundError


class CommodityService:
    def __init__(self, db: Client):
        self.commodity_repo = CommodityRepository(db)
        self.type_repo = CommodityTypeRepository(db)
        self.history_repo = CommodityHistoryRepository(db)

    async def get_commodities(
        self,
        market_id: Optional[UUID] = None,
        category: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        return await self.commodity_repo.get_commodities_with_types(
            market_id=market_id,
            category=category,
            page=page,
            page_size=page_size,
        )

    async def get_commodity_by_id(self, commodity_id: UUID) -> Dict[str, Any]:
        commodity = await self.commodity_repo.get_by_id(commodity_id)
        if not commodity:
            raise NotFoundError("Commodity")

        commodity_type = await self.type_repo.get_by_id(commodity["commodity_type_id"])

        history_7d = await self.history_repo.get_history(
            commodity_id=commodity_id,
            from_date=date.today() - timedelta(days=7),
            to_date=date.today(),
            limit=7,
        )

        return {
            **commodity,
            "commodity_type": commodity_type,
            "history_7d": history_7d,
        }

    async def get_commodity_history(
        self,
        commodity_id: UUID,
        period: str = "1M",
    ) -> Dict[str, Any]:
        commodity = await self.commodity_repo.get_by_id(commodity_id)
        if not commodity:
            raise NotFoundError("Commodity")

        to_date = date.today()
        if period == "1W":
            from_date = to_date - timedelta(days=7)
        elif period == "1M":
            from_date = to_date - timedelta(days=30)
        elif period == "3M":
            from_date = to_date - timedelta(days=90)
        elif period == "6M":
            from_date = to_date - timedelta(days=180)
        elif period == "1Y":
            from_date = to_date - timedelta(days=365)
        else:
            from_date = to_date - timedelta(days=30)

        history = await self.history_repo.get_history(
            commodity_id=commodity_id,
            from_date=from_date,
            to_date=to_date,
        )

        return {
            "commodity_id": commodity_id,
            "name": commodity["name"],
            "period": period,
            "history": history,
        }

    async def get_gold_commodities(self, market_id: UUID) -> List[Dict[str, Any]]:
        return await self.commodity_repo.get_gold_commodities(market_id)

    async def get_silver_commodities(self, market_id: UUID) -> List[Dict[str, Any]]:
        return await self.commodity_repo.get_silver_commodities(market_id)

    async def get_commodity_types(self) -> List[CommodityType]:
        result = await self.type_repo.get_all()
        return [CommodityType(**item) for item in result["items"]]

    async def update_commodity_price(
        self, commodity_id: UUID, price_data: Dict[str, Any]
    ) -> Optional[Commodity]:
        return await self.commodity_repo.update_commodity_price(commodity_id, price_data)
