from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client

from app.models.portfolio import Portfolio, PortfolioHolding, PortfolioTransaction
from app.repositories.portfolio_repository import (
    PortfolioRepository,
    PortfolioHoldingRepository,
    PortfolioTransactionRepository,
)
from app.core.exceptions import NotFoundError, ValidationError, AuthorizationError


class PortfolioService:
    def __init__(self, db: Client):
        self.portfolio_repo = PortfolioRepository(db)
        self.holding_repo = PortfolioHoldingRepository(db)
        self.transaction_repo = PortfolioTransactionRepository(db)

    async def get_user_portfolios(self, user_id: UUID) -> List[Portfolio]:
        return await self.portfolio_repo.get_user_portfolios(user_id)

    async def get_portfolio_by_id(self, portfolio_id: UUID, user_id: UUID) -> Dict[str, Any]:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id)
        if not portfolio:
            raise NotFoundError("Portfolio")

        if str(portfolio["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to access this portfolio")

        holdings = await self.holding_repo.get_portfolio_holdings(portfolio_id)

        total_invested = sum(h.total_invested for h in holdings)
        current_value = sum(h.current_value or h.total_invested for h in holdings)
        profit_loss = current_value - total_invested
        profit_loss_percentage = (profit_loss / total_invested * 100) if total_invested > 0 else Decimal("0")

        return {
            **portfolio,
            "holdings": holdings,
            "profit_loss": profit_loss,
            "profit_loss_percentage": profit_loss_percentage,
        }

    async def create_portfolio(self, user_id: UUID, data: Dict[str, Any]) -> Portfolio:
        portfolios = await self.portfolio_repo.get_user_portfolios(user_id)

        if data.get("is_default", False) and portfolios:
            await self.portfolio_repo.set_default(user_id, None)
        elif not portfolios:
            data["is_default"] = True

        data["user_id"] = str(user_id)
        result = await self.portfolio_repo.create(data)
        return Portfolio(**result)

    async def update_portfolio(
        self, portfolio_id: UUID, user_id: UUID, data: Dict[str, Any]
    ) -> Portfolio:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id)
        if not portfolio:
            raise NotFoundError("Portfolio")

        if str(portfolio["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to update this portfolio")

        if data.get("is_default", False):
            await self.portfolio_repo.set_default(user_id, portfolio_id)
            data.pop("is_default", None)

        data["updated_at"] = datetime.utcnow().isoformat()
        result = await self.portfolio_repo.update(portfolio_id, data)
        return Portfolio(**result)

    async def delete_portfolio(self, portfolio_id: UUID, user_id: UUID) -> bool:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id)
        if not portfolio:
            raise NotFoundError("Portfolio")

        if str(portfolio["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to delete this portfolio")

        return await self.portfolio_repo.delete(portfolio_id)

    async def add_holding(
        self, portfolio_id: UUID, user_id: UUID, data: Dict[str, Any]
    ) -> PortfolioHolding:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id)
        if not portfolio:
            raise NotFoundError("Portfolio")

        if str(portfolio["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to modify this portfolio")

        existing = await self.holding_repo.get_holding_by_asset(
            portfolio_id, data["holding_type"], data["holding_id"]
        )

        if existing:
            new_quantity = existing.quantity + data["quantity"]
            new_total_invested = existing.total_invested + (data["quantity"] * data["avg_buy_price"])
            new_avg_price = new_total_invested / new_quantity

            updated = await self.holding_repo.update_holding(existing.id, {
                "quantity": float(new_quantity),
                "avg_buy_price": float(new_avg_price),
                "total_invested": float(new_total_invested),
            })
            return updated

        data["portfolio_id"] = str(portfolio_id)
        data["total_invested"] = float(data["quantity"] * data["avg_buy_price"])
        data["quantity"] = float(data["quantity"])
        data["avg_buy_price"] = float(data["avg_buy_price"])
        data["holding_id"] = str(data["holding_id"])

        result = await self.holding_repo.create(data)
        return PortfolioHolding(**result)

    async def update_holding(
        self, portfolio_id: UUID, holding_id: UUID, user_id: UUID, data: Dict[str, Any]
    ) -> PortfolioHolding:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id)
        if not portfolio:
            raise NotFoundError("Portfolio")

        if str(portfolio["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to modify this portfolio")

        holding = await self.holding_repo.get_by_id(holding_id)
        if not holding or str(holding["portfolio_id"]) != str(portfolio_id):
            raise NotFoundError("Holding")

        if "quantity" in data and "avg_buy_price" in data:
            data["total_invested"] = float(data["quantity"] * data["avg_buy_price"])

        result = await self.holding_repo.update_holding(holding_id, data)
        return result

    async def remove_holding(
        self, portfolio_id: UUID, holding_id: UUID, user_id: UUID
    ) -> bool:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id)
        if not portfolio:
            raise NotFoundError("Portfolio")

        if str(portfolio["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to modify this portfolio")

        return await self.holding_repo.delete(holding_id)

    async def record_transaction(
        self, portfolio_id: UUID, user_id: UUID, data: Dict[str, Any]
    ) -> PortfolioTransaction:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id)
        if not portfolio:
            raise NotFoundError("Portfolio")

        if str(portfolio["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to modify this portfolio")

        data["portfolio_id"] = str(portfolio_id)
        data["total_amount"] = float(data["quantity"] * data["price"] + data.get("fees", 0))
        data["holding_id"] = str(data["holding_id"])
        data["quantity"] = float(data["quantity"])
        data["price"] = float(data["price"])
        data["fees"] = float(data.get("fees", 0))

        result = await self.transaction_repo.create(data)
        return PortfolioTransaction(**result)

    async def get_transactions(
        self, portfolio_id: UUID, user_id: UUID, page: int = 1, page_size: int = 20
    ) -> Dict[str, Any]:
        portfolio = await self.portfolio_repo.get_by_id(portfolio_id)
        if not portfolio:
            raise NotFoundError("Portfolio")

        if str(portfolio["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to access this portfolio")

        return await self.transaction_repo.get_portfolio_transactions(portfolio_id, page, page_size)

    async def get_performance(self, portfolio_id: UUID, user_id: UUID) -> Dict[str, Any]:
        portfolio_data = await self.get_portfolio_by_id(portfolio_id, user_id)
        holdings = portfolio_data.get("holdings", [])

        asset_allocation = {"stock": Decimal("0"), "commodity": Decimal("0"), "bank_product": Decimal("0")}
        best_performer = None
        worst_performer = None
        best_pct = Decimal("-9999999")
        worst_pct = Decimal("9999999")

        for holding in holdings:
            asset_allocation[holding.holding_type] += holding.current_value or holding.total_invested

            pct = holding.profit_loss_percentage or Decimal("0")
            if pct > best_pct:
                best_pct = pct
                best_performer = holding
            if pct < worst_pct:
                worst_pct = pct
                worst_performer = holding

        return {
            "portfolio_id": portfolio_id,
            "total_invested": portfolio_data["total_invested"],
            "current_value": portfolio_data["current_value"],
            "profit_loss": portfolio_data["profit_loss"],
            "profit_loss_percentage": portfolio_data["profit_loss_percentage"],
            "holdings_count": len(holdings),
            "best_performer": best_performer,
            "worst_performer": worst_performer,
            "asset_allocation": {k: float(v) for k, v in asset_allocation.items()},
        }
