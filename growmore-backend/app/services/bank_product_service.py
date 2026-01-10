from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client

from app.models.bank_product import Bank, BankProduct, BankProductType
from app.repositories.bank_product_repository import (
    BankRepository,
    BankProductRepository,
    BankProductTypeRepository,
)
from app.core.exceptions import NotFoundError


class BankProductService:
    def __init__(self, db: Client):
        self.bank_repo = BankRepository(db)
        self.product_repo = BankProductRepository(db)
        self.type_repo = BankProductTypeRepository(db)

    async def get_banks(self, market_id: Optional[UUID] = None) -> List[Bank]:
        return await self.bank_repo.get_active_banks(market_id)

    async def get_bank_by_id(self, bank_id: UUID) -> Bank:
        bank = await self.bank_repo.get_by_id(bank_id)
        if not bank:
            raise NotFoundError("Bank")
        return Bank(**bank)

    async def get_bank_with_products(self, bank_id: UUID) -> Dict[str, Any]:
        result = await self.bank_repo.get_bank_with_products(bank_id)
        if not result:
            raise NotFoundError("Bank")
        return result

    async def get_products(
        self,
        market_id: Optional[UUID] = None,
        bank_id: Optional[UUID] = None,
        product_type_id: Optional[UUID] = None,
        min_interest_rate: Optional[Decimal] = None,
        max_interest_rate: Optional[Decimal] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        return await self.product_repo.get_products_with_details(
            market_id=market_id,
            bank_id=bank_id,
            product_type_id=product_type_id,
            min_interest_rate=min_interest_rate,
            max_interest_rate=max_interest_rate,
            page=page,
            page_size=page_size,
        )

    async def get_product_by_id(self, product_id: UUID) -> Dict[str, Any]:
        product = await self.product_repo.get_product_detail(product_id)
        if not product:
            raise NotFoundError("Bank Product")
        return product

    async def get_product_types(self) -> List[BankProductType]:
        result = await self.type_repo.get_all()
        return [BankProductType(**item) for item in result["items"]]

    async def get_products_by_bank(self, bank_id: UUID) -> List[BankProduct]:
        return await self.product_repo.get_by_bank(bank_id)
