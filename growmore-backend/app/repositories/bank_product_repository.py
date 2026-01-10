from typing import Any, Dict, List, Optional
from uuid import UUID
from decimal import Decimal

from supabase import Client

from app.models.bank_product import Bank, BankProduct, BankProductType
from app.repositories.base import BaseRepository


class BankProductTypeRepository(BaseRepository[BankProductType]):
    def __init__(self, client: Client):
        super().__init__(client, "bank_product_types")

    async def get_by_name(self, name: str) -> Optional[BankProductType]:
        result = self.client.table(self.table_name).select("*").eq(
            "name", name
        ).execute()

        if result.data:
            return BankProductType(**result.data[0])
        return None

    async def get_by_category(self, category: str) -> List[BankProductType]:
        result = self.client.table(self.table_name).select("*").eq(
            "category", category
        ).order("name").execute()

        return [BankProductType(**item) for item in result.data] if result.data else []


class BankRepository(BaseRepository[Bank]):
    def __init__(self, client: Client):
        super().__init__(client, "banks")

    async def get_by_code(self, market_id: UUID, code: str) -> Optional[Bank]:
        result = self.client.table(self.table_name).select("*").eq(
            "market_id", str(market_id)
        ).eq("code", code).execute()

        if result.data:
            return Bank(**result.data[0])
        return None

    async def get_active_banks(self, market_id: Optional[UUID] = None) -> List[Bank]:
        query = self.client.table(self.table_name).select("*").eq("is_active", True)

        if market_id:
            query = query.eq("market_id", str(market_id))

        result = query.order("name").execute()

        return [Bank(**item) for item in result.data] if result.data else []

    async def get_bank_with_products(self, bank_id: UUID) -> Optional[Dict[str, Any]]:
        bank_result = self.client.table(self.table_name).select("*").eq(
            "id", str(bank_id)
        ).execute()

        if not bank_result.data:
            return None

        products_result = self.client.table("bank_products").select(
            "*, bank_product_types(id, name, category)"
        ).eq("bank_id", str(bank_id)).eq("is_active", True).execute()

        return {
            "bank": Bank(**bank_result.data[0]),
            "products": products_result.data or [],
        }


class BankProductRepository(BaseRepository[BankProduct]):
    def __init__(self, client: Client):
        super().__init__(client, "bank_products")

    async def get_products_with_details(
        self,
        market_id: Optional[UUID] = None,
        bank_id: Optional[UUID] = None,
        product_type_id: Optional[UUID] = None,
        min_interest_rate: Optional[Decimal] = None,
        max_interest_rate: Optional[Decimal] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        # Use left join (remove !inner) for banks to allow products without bank data
        query = self.client.table(self.table_name).select(
            "*, banks(id, market_id, name, code, logo_url, website, is_active, created_at), bank_product_types(id, name, category, description, created_at)",
            count="exact"
        ).eq("is_active", True)

        if market_id:
            query = query.eq("banks.market_id", str(market_id))

        if bank_id:
            query = query.eq("bank_id", str(bank_id))

        if product_type_id:
            query = query.eq("product_type_id", str(product_type_id))

        if min_interest_rate is not None:
            query = query.gte("interest_rate", float(min_interest_rate))

        if max_interest_rate is not None:
            query = query.lte("interest_rate", float(max_interest_rate))

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

    async def get_by_bank(self, bank_id: UUID) -> List[BankProduct]:
        result = self.client.table(self.table_name).select("*").eq(
            "bank_id", str(bank_id)
        ).eq("is_active", True).order("name").execute()

        return [BankProduct(**item) for item in result.data] if result.data else []

    async def get_product_detail(self, product_id: UUID) -> Optional[Dict[str, Any]]:
        result = self.client.table(self.table_name).select(
            "*, banks(id, name, code, logo_url, website), bank_product_types(id, name, category, description)"
        ).eq("id", str(product_id)).execute()

        return result.data[0] if result.data else None
