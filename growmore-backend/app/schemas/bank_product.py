from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Any
from uuid import UUID

from pydantic import BaseModel


class BankProductListParams(BaseModel):
    market_id: Optional[UUID] = None
    bank_id: Optional[UUID] = None
    product_type_id: Optional[UUID] = None
    min_interest_rate: Optional[Decimal] = None
    max_interest_rate: Optional[Decimal] = None
    min_deposit: Optional[Decimal] = None
    max_deposit: Optional[Decimal] = None


class BankProductTypeResponse(BaseModel):
    id: UUID
    name: str
    category: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BankResponse(BaseModel):
    id: UUID
    market_id: UUID
    name: str
    code: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class BankProductResponse(BaseModel):
    id: UUID
    bank_id: UUID
    bank: Optional[BankResponse] = None
    product_type_id: UUID
    product_type: Optional[BankProductTypeResponse] = None
    name: str
    description: Optional[str] = None
    interest_rate: Optional[Decimal] = None
    min_deposit: Optional[Decimal] = None
    max_deposit: Optional[Decimal] = None
    tenure_min_days: Optional[int] = None
    tenure_max_days: Optional[int] = None
    is_active: bool
    last_updated: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class BankProductDetailResponse(BankProductResponse):
    features: List[Any] = []
    terms_conditions: Optional[str] = None


class BankWithProductsResponse(BankResponse):
    products: List[BankProductResponse] = []
