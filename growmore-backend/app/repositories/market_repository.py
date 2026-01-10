from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client

from app.models.market import Market, Sector
from app.repositories.base import BaseRepository


class MarketRepository(BaseRepository[Market]):
    def __init__(self, client: Client):
        super().__init__(client, "markets")

    async def get_by_code(self, code: str) -> Optional[Market]:
        result = self.client.table(self.table_name).select("*").eq(
            "code", code
        ).execute()

        if result.data:
            return Market(**result.data[0])
        return None

    async def get_active_markets(self) -> List[Market]:
        result = self.client.table(self.table_name).select("*").eq(
            "is_active", True
        ).order("name").execute()

        return [Market(**item) for item in result.data] if result.data else []

    async def get_market_with_sectors(self, market_id: UUID) -> Optional[Dict[str, Any]]:
        market_result = self.client.table(self.table_name).select("*").eq(
            "id", str(market_id)
        ).execute()

        if not market_result.data:
            return None

        sectors_result = self.client.table("sectors").select("*").eq(
            "market_id", str(market_id)
        ).order("name").execute()

        return {
            "market": Market(**market_result.data[0]),
            "sectors": [Sector(**s) for s in sectors_result.data] if sectors_result.data else [],
        }


class SectorRepository(BaseRepository[Sector]):
    def __init__(self, client: Client):
        super().__init__(client, "sectors")

    async def get_by_market(self, market_id: UUID) -> List[Sector]:
        result = self.client.table(self.table_name).select("*").eq(
            "market_id", str(market_id)
        ).order("name").execute()

        return [Sector(**item) for item in result.data] if result.data else []

    async def get_by_code(self, market_id: UUID, code: str) -> Optional[Sector]:
        result = self.client.table(self.table_name).select("*").eq(
            "market_id", str(market_id)
        ).eq("code", code).execute()

        if result.data:
            return Sector(**result.data[0])
        return None
