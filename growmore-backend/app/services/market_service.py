from typing import Any, Dict, List
from uuid import UUID

from supabase import Client

from app.models.market import Market, Sector
from app.repositories.market_repository import MarketRepository, SectorRepository
from app.core.exceptions import NotFoundError


class MarketService:
    def __init__(self, db: Client):
        self.market_repo = MarketRepository(db)
        self.sector_repo = SectorRepository(db)

    async def get_all_markets(self) -> List[Market]:
        return await self.market_repo.get_active_markets()

    async def get_market_by_id(self, market_id: UUID) -> Market:
        market = await self.market_repo.get_by_id(market_id)
        if not market:
            raise NotFoundError("Market")
        return Market(**market)

    async def get_market_by_code(self, code: str) -> Market:
        market = await self.market_repo.get_by_code(code)
        if not market:
            raise NotFoundError("Market")
        return market

    async def get_market_with_sectors(self, market_id: UUID) -> Dict[str, Any]:
        result = await self.market_repo.get_market_with_sectors(market_id)
        if not result:
            raise NotFoundError("Market")
        return result

    async def get_sectors_by_market(self, market_id: UUID) -> List[Sector]:
        market = await self.market_repo.get_by_id(market_id)
        if not market:
            raise NotFoundError("Market")
        return await self.sector_repo.get_by_market(market_id)
