from datetime import date, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client

from app.models.stock import Company, Stock, StockHistory
from app.repositories.stock_repository import CompanyRepository, StockRepository, StockHistoryRepository
from app.core.exceptions import NotFoundError


class StockService:
    def __init__(self, db: Client):
        self.company_repo = CompanyRepository(db)
        self.stock_repo = StockRepository(db)
        self.history_repo = StockHistoryRepository(db)

    async def get_stocks(
        self,
        market_id: Optional[UUID] = None,
        sector_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "symbol",
        sort_order: str = "asc",
    ) -> Dict[str, Any]:
        return await self.stock_repo.get_stocks_with_companies(
            market_id=market_id,
            sector_id=sector_id,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    async def get_stock_by_id(self, stock_id: UUID) -> Dict[str, Any]:
        stock = await self.stock_repo.get_by_id(stock_id)
        if not stock:
            raise NotFoundError("Stock")

        company = await self.company_repo.get_by_id(stock["company_id"])
        if not company:
            raise NotFoundError("Company")

        return {
            **stock,
            "company": company,
        }

    async def get_stock_by_symbol(self, market_id: UUID, symbol: str) -> Dict[str, Any]:
        company = await self.company_repo.get_by_symbol(market_id, symbol)
        if not company:
            raise NotFoundError("Company")

        stock = await self.stock_repo.get_by_company(company.id)
        if not stock:
            raise NotFoundError("Stock")

        return {
            "stock": stock,
            "company": company,
        }

    async def get_stock_history(
        self,
        stock_id: UUID,
        period: str = "1M",
    ) -> Dict[str, Any]:
        stock = await self.stock_repo.get_by_id(stock_id)
        if not stock:
            raise NotFoundError("Stock")

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
            stock_id=stock_id,
            from_date=from_date,
            to_date=to_date,
        )

        return {
            "stock_id": stock_id,
            "period": period,
            "history": history,
        }

    async def get_top_gainers(self, market_id: UUID, limit: int = 10) -> List[Dict[str, Any]]:
        return await self.stock_repo.get_top_gainers(market_id, limit)

    async def get_top_losers(self, market_id: UUID, limit: int = 10) -> List[Dict[str, Any]]:
        return await self.stock_repo.get_top_losers(market_id, limit)

    async def get_most_active(self, market_id: UUID, limit: int = 10) -> List[Dict[str, Any]]:
        return await self.stock_repo.get_most_active(market_id, limit)

    async def search_stocks(
        self, market_id: UUID, search_term: str, limit: int = 20
    ) -> List[Company]:
        return await self.company_repo.search_companies(market_id, search_term, limit)

    async def update_stock_price(
        self, stock_id: UUID, price_data: Dict[str, Any]
    ) -> Optional[Stock]:
        return await self.stock_repo.update_stock_price(stock_id, price_data)
