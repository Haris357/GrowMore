from datetime import date
from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client

from app.models.commodity import Commodity, CommodityType, CommodityHistory
from app.repositories.base import BaseRepository


class CommodityTypeRepository(BaseRepository[CommodityType]):
    def __init__(self, client: Client):
        super().__init__(client, "commodity_types")

    async def get_by_name(self, name: str) -> Optional[CommodityType]:
        result = self.client.table(self.table_name).select("*").eq(
            "name", name
        ).execute()

        if result.data:
            return CommodityType(**result.data[0])
        return None

    async def get_by_category(self, category: str) -> List[CommodityType]:
        result = self.client.table(self.table_name).select("*").eq(
            "category", category
        ).order("name").execute()

        return [CommodityType(**item) for item in result.data] if result.data else []


class CommodityRepository(BaseRepository[Commodity]):
    def __init__(self, client: Client):
        super().__init__(client, "commodities")

    async def get_commodities_with_types(
        self,
        market_id: Optional[UUID] = None,
        category: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        # Use left join (remove !inner) to get all commodities even without matching type
        query = self.client.table(self.table_name).select(
            "*, commodity_types(id, name, category, unit, icon)",
            count="exact"
        )

        if market_id:
            query = query.eq("market_id", str(market_id))

        if category:
            query = query.eq("commodity_types.category", category)

        offset = (page - 1) * page_size
        query = query.range(offset, offset + page_size - 1)

        result = query.execute()

        total = result.count or 0
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        return {
            "items": result.data or [],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
        }

    async def get_gold_commodities(self, market_id: UUID) -> List[Dict[str, Any]]:
        result = self.client.table(self.table_name).select(
            "*, commodity_types(id, name, category, unit)"
        ).eq("market_id", str(market_id)).eq(
            "commodity_types.category", "gold"
        ).order("name").execute()

        return result.data or []

    async def get_silver_commodities(self, market_id: UUID) -> List[Dict[str, Any]]:
        result = self.client.table(self.table_name).select(
            "*, commodity_types(id, name, category, unit)"
        ).eq("market_id", str(market_id)).eq(
            "commodity_types.category", "silver"
        ).order("name").execute()

        return result.data or []

    async def update_commodity_price(
        self, commodity_id: UUID, price_data: Dict[str, Any]
    ) -> Optional[Commodity]:
        result = self.client.table(self.table_name).update(price_data).eq(
            "id", str(commodity_id)
        ).execute()

        if result.data:
            return Commodity(**result.data[0])
        return None


class CommodityHistoryRepository(BaseRepository[CommodityHistory]):
    def __init__(self, client: Client):
        super().__init__(client, "commodity_history")

    async def get_history(
        self,
        commodity_id: UUID,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        limit: int = 30,
    ) -> List[CommodityHistory]:
        query = self.client.table(self.table_name).select("*").eq(
            "commodity_id", str(commodity_id)
        )

        if from_date:
            query = query.gte("date", from_date.isoformat())

        if to_date:
            query = query.lte("date", to_date.isoformat())

        query = query.order("date", desc=True).limit(limit)
        result = query.execute()

        return [CommodityHistory(**item) for item in result.data] if result.data else []

    async def upsert_history(
        self, commodity_id: UUID, date_val: date, data: Dict[str, Any]
    ) -> CommodityHistory:
        data["commodity_id"] = str(commodity_id)
        data["date"] = date_val.isoformat()

        result = self.client.table(self.table_name).upsert(
            data, on_conflict="commodity_id,date"
        ).execute()

        return CommodityHistory(**result.data[0]) if result.data else None
