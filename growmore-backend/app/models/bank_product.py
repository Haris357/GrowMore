from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Any
from uuid import UUID

from pydantic import BaseModel


class BankProductType(BaseModel):
    id: UUID
    name: str
    category: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class Bank(BaseModel):
    id: UUID
    market_id: UUID
    name: str
    code: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class BankProduct(BaseModel):
    id: UUID
    bank_id: UUID
    product_type_id: UUID
    name: str
    description: Optional[str] = None
    interest_rate: Optional[Decimal] = None
    min_deposit: Optional[Decimal] = None
    max_deposit: Optional[Decimal] = None
    tenure_min_days: Optional[int] = None
    tenure_max_days: Optional[int] = None
    features: List[Any] = []
    terms_conditions: Optional[str] = None
    is_active: bool = True
    last_updated: datetime
    created_at: datetime

    class Config:
        from_attributes = True
