from datetime import date
from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client

from app.models.stock import Company, Stock, StockHistory
from app.repositories.base import BaseRepository


class CompanyRepository(BaseRepository[Company]):
    def __init__(self, client: Client):
        super().__init__(client, "companies")

    async def get_by_symbol(self, market_id: UUID, symbol: str) -> Optional[Company]:
        result = self.client.table(self.table_name).select("*").eq(
            "market_id", str(market_id)
        ).eq("symbol", symbol).execute()

        if result.data:
            return Company(**result.data[0])
        return None

    async def get_by_sector(self, sector_id: UUID) -> List[Company]:
        result = self.client.table(self.table_name).select("*").eq(
            "sector_id", str(sector_id)
        ).eq("is_active", True).order("name").execute()

        return [Company(**item) for item in result.data] if result.data else []

    async def search_companies(
        self, market_id: UUID, search_term: str, limit: int = 20
    ) -> List[Company]:
        result = self.client.table(self.table_name).select("*").eq(
            "market_id", str(market_id)
        ).eq("is_active", True).or_(
            f"name.ilike.%{search_term}%,symbol.ilike.%{search_term}%"
        ).limit(limit).execute()

        return [Company(**item) for item in result.data] if result.data else []


class StockRepository(BaseRepository[Stock]):
    def __init__(self, client: Client):
        super().__init__(client, "stocks")

    async def get_by_company(self, company_id: UUID) -> Optional[Stock]:
        result = self.client.table(self.table_name).select("*").eq(
            "company_id", str(company_id)
        ).execute()

        if result.data:
            return Stock(**result.data[0])
        return None

    async def get_stocks_with_companies(
        self,
        market_id: Optional[UUID] = None,
        sector_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "symbol",
        sort_order: str = "asc",
    ) -> Dict[str, Any]:
        query = self.client.table(self.table_name).select(
            "*, companies!inner(id, market_id, sector_id, symbol, name, logo_url, sectors(id, name))",
            count="exact"
        )

        if market_id:
            query = query.eq("companies.market_id", str(market_id))

        if sector_id:
            query = query.eq("companies.sector_id", str(sector_id))

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

    async def get_top_gainers(self, market_id: UUID, limit: int = 10) -> List[Dict[str, Any]]:
        result = self.client.table(self.table_name).select(
            "*, companies!inner(id, market_id, symbol, name)"
        ).eq("companies.market_id", str(market_id)).gt(
            "change_percentage", 0
        ).order("change_percentage", desc=True).limit(limit).execute()

        return result.data or []

    async def get_top_losers(self, market_id: UUID, limit: int = 10) -> List[Dict[str, Any]]:
        result = self.client.table(self.table_name).select(
            "*, companies!inner(id, market_id, symbol, name)"
        ).eq("companies.market_id", str(market_id)).lt(
            "change_percentage", 0
        ).order("change_percentage", desc=False).limit(limit).execute()

        return result.data or []

    async def get_most_active(self, market_id: UUID, limit: int = 10) -> List[Dict[str, Any]]:
        result = self.client.table(self.table_name).select(
            "*, companies!inner(id, market_id, symbol, name)"
        ).eq("companies.market_id", str(market_id)).order(
            "volume", desc=True
        ).limit(limit).execute()

        return result.data or []

    async def update_stock_price(
        self, stock_id: UUID, price_data: Dict[str, Any]
    ) -> Optional[Stock]:
        result = self.client.table(self.table_name).update(price_data).eq(
            "id", str(stock_id)
        ).execute()

        if result.data:
            return Stock(**result.data[0])
        return None


class StockHistoryRepository(BaseRepository[StockHistory]):
    def __init__(self, client: Client):
        super().__init__(client, "stock_history")

    async def get_history(
        self,
        stock_id: UUID,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        limit: int = 30,
    ) -> List[StockHistory]:
        query = self.client.table(self.table_name).select("*").eq(
            "stock_id", str(stock_id)
        )

        if from_date:
            query = query.gte("date", from_date.isoformat())

        if to_date:
            query = query.lte("date", to_date.isoformat())

        query = query.order("date", desc=True).limit(limit)
        result = query.execute()

        return [StockHistory(**item) for item in result.data] if result.data else []

    async def upsert_history(self, stock_id: UUID, date_val: date, data: Dict[str, Any]) -> StockHistory:
        data["stock_id"] = str(stock_id)
        data["date"] = date_val.isoformat()

        result = self.client.table(self.table_name).upsert(
            data, on_conflict="stock_id,date"
        ).execute()

        return StockHistory(**result.data[0]) if result.data else None
