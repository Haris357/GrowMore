from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class Portfolio(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    is_default: bool = False
    total_invested: Decimal = Decimal("0")
    current_value: Decimal = Decimal("0")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PortfolioHolding(BaseModel):
    id: UUID
    portfolio_id: UUID
    holding_type: str
    holding_id: UUID
    quantity: Decimal
    avg_buy_price: Decimal
    total_invested: Decimal
    current_value: Optional[Decimal] = None
    profit_loss: Optional[Decimal] = None
    profit_loss_percentage: Optional[Decimal] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PortfolioTransaction(BaseModel):
    id: UUID
    portfolio_id: UUID
    holding_type: str
    holding_id: UUID
    transaction_type: str
    quantity: Decimal
    price: Decimal
    total_amount: Decimal
    fees: Decimal = Decimal("0")
    notes: Optional[str] = None
    transaction_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True
