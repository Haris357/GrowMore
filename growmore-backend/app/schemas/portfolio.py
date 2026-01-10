from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


class PortfolioCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_default: bool = False


class PortfolioUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_default: Optional[bool] = None


class PortfolioResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    is_default: bool
    total_invested: Decimal
    current_value: Decimal
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HoldingCreate(BaseModel):
    holding_type: str = Field(..., pattern="^(stock|commodity|bank_product)$")
    holding_id: UUID
    quantity: Decimal = Field(..., gt=0)
    avg_buy_price: Decimal = Field(..., gt=0)
    notes: Optional[str] = Field(None, max_length=500)


class HoldingUpdate(BaseModel):
    quantity: Optional[Decimal] = Field(None, gt=0)
    avg_buy_price: Optional[Decimal] = Field(None, gt=0)
    notes: Optional[str] = Field(None, max_length=500)


class HoldingResponse(BaseModel):
    id: UUID
    portfolio_id: UUID
    holding_type: str
    holding_id: UUID
    holding_name: Optional[str] = None
    holding_symbol: Optional[str] = None
    quantity: Decimal
    avg_buy_price: Decimal
    total_invested: Decimal
    current_price: Optional[Decimal] = None
    current_value: Optional[Decimal] = None
    profit_loss: Optional[Decimal] = None
    profit_loss_percentage: Optional[Decimal] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TransactionCreate(BaseModel):
    holding_type: str = Field(..., pattern="^(stock|commodity|bank_product)$")
    holding_id: UUID
    transaction_type: str = Field(..., pattern="^(buy|sell)$")
    quantity: Decimal = Field(..., gt=0)
    price: Decimal = Field(..., gt=0)
    fees: Decimal = Field(default=Decimal("0"), ge=0)
    notes: Optional[str] = Field(None, max_length=500)
    transaction_date: datetime


class TransactionResponse(BaseModel):
    id: UUID
    portfolio_id: UUID
    holding_type: str
    holding_id: UUID
    holding_name: Optional[str] = None
    transaction_type: str
    quantity: Decimal
    price: Decimal
    total_amount: Decimal
    fees: Decimal
    notes: Optional[str] = None
    transaction_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class PortfolioDetailResponse(PortfolioResponse):
    holdings: List[HoldingResponse] = []
    profit_loss: Optional[Decimal] = None
    profit_loss_percentage: Optional[Decimal] = None


class PortfolioPerformanceResponse(BaseModel):
    portfolio_id: UUID
    total_invested: Decimal
    current_value: Decimal
    profit_loss: Decimal
    profit_loss_percentage: Decimal
    holdings_count: int
    best_performer: Optional[HoldingResponse] = None
    worst_performer: Optional[HoldingResponse] = None
    asset_allocation: dict
