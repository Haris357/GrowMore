from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client

from app.models.portfolio import Portfolio, PortfolioHolding, PortfolioTransaction
from app.repositories.base import BaseRepository


class PortfolioRepository(BaseRepository[Portfolio]):
    def __init__(self, client: Client):
        super().__init__(client, "portfolios")

    async def get_user_portfolios(self, user_id: UUID) -> List[Portfolio]:
        result = self.client.table(self.table_name).select("*").eq(
            "user_id", str(user_id)
        ).order("is_default", desc=True).order("created_at").execute()

        return [Portfolio(**item) for item in result.data] if result.data else []

    async def get_default_portfolio(self, user_id: UUID) -> Optional[Portfolio]:
        result = self.client.table(self.table_name).select("*").eq(
            "user_id", str(user_id)
        ).eq("is_default", True).execute()

        if result.data:
            return Portfolio(**result.data[0])
        return None

    async def set_default(self, user_id: UUID, portfolio_id: UUID) -> Optional[Portfolio]:
        self.client.table(self.table_name).update({"is_default": False}).eq(
            "user_id", str(user_id)
        ).execute()

        result = self.client.table(self.table_name).update({
            "is_default": True,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", str(portfolio_id)).execute()

        if result.data:
            return Portfolio(**result.data[0])
        return None

    async def update_portfolio_values(
        self, portfolio_id: UUID, total_invested: float, current_value: float
    ) -> Optional[Portfolio]:
        result = self.client.table(self.table_name).update({
            "total_invested": total_invested,
            "current_value": current_value,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", str(portfolio_id)).execute()

        if result.data:
            return Portfolio(**result.data[0])
        return None


class PortfolioHoldingRepository(BaseRepository[PortfolioHolding]):
    def __init__(self, client: Client):
        super().__init__(client, "portfolio_holdings")

    async def get_portfolio_holdings(self, portfolio_id: UUID) -> List[PortfolioHolding]:
        result = self.client.table(self.table_name).select("*").eq(
            "portfolio_id", str(portfolio_id)
        ).order("created_at").execute()

        return [PortfolioHolding(**item) for item in result.data] if result.data else []

    async def get_holding_by_asset(
        self, portfolio_id: UUID, holding_type: str, holding_id: UUID
    ) -> Optional[PortfolioHolding]:
        result = self.client.table(self.table_name).select("*").eq(
            "portfolio_id", str(portfolio_id)
        ).eq("holding_type", holding_type).eq("holding_id", str(holding_id)).execute()

        if result.data:
            return PortfolioHolding(**result.data[0])
        return None

    async def update_holding(
        self, holding_id: UUID, data: Dict[str, Any]
    ) -> Optional[PortfolioHolding]:
        data["updated_at"] = datetime.utcnow().isoformat()
        result = self.client.table(self.table_name).update(data).eq(
            "id", str(holding_id)
        ).execute()

        if result.data:
            return PortfolioHolding(**result.data[0])
        return None


class PortfolioTransactionRepository(BaseRepository[PortfolioTransaction]):
    def __init__(self, client: Client):
        super().__init__(client, "portfolio_transactions")

    async def get_portfolio_transactions(
        self,
        portfolio_id: UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        query = self.client.table(self.table_name).select(
            "*", count="exact"
        ).eq("portfolio_id", str(portfolio_id)).order("transaction_date", desc=True)

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

    async def get_holding_transactions(
        self, portfolio_id: UUID, holding_type: str, holding_id: UUID
    ) -> List[PortfolioTransaction]:
        result = self.client.table(self.table_name).select("*").eq(
            "portfolio_id", str(portfolio_id)
        ).eq("holding_type", holding_type).eq(
            "holding_id", str(holding_id)
        ).order("transaction_date", desc=True).execute()

        return [PortfolioTransaction(**item) for item in result.data] if result.data else []
