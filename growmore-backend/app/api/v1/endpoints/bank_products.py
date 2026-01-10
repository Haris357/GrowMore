from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from uuid import UUID

from app.core.dependencies import get_db
from app.services.bank_product_service import BankProductService
from app.schemas.bank_product import (
    BankResponse,
    BankProductResponse,
    BankProductDetailResponse,
    BankProductTypeResponse,
    BankWithProductsResponse,
)
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[BankProductResponse])
async def list_bank_products(
    market_id: Optional[UUID] = None,
    bank_id: Optional[UUID] = None,
    product_type_id: Optional[UUID] = None,
    min_interest_rate: Optional[Decimal] = None,
    max_interest_rate: Optional[Decimal] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db=Depends(get_db),
):
    product_service = BankProductService(db)
    result = await product_service.get_products(
        market_id=market_id,
        bank_id=bank_id,
        product_type_id=product_type_id,
        min_interest_rate=min_interest_rate,
        max_interest_rate=max_interest_rate,
        page=page,
        page_size=page_size,
    )

    items = []
    for item in result["items"]:
        bank = item.get("banks")
        product_type = item.get("bank_product_types")
        items.append(BankProductResponse(
            id=item["id"],
            bank_id=item["bank_id"],
            bank=BankResponse(**bank) if bank else None,
            product_type_id=item["product_type_id"],
            product_type=BankProductTypeResponse(**product_type) if product_type else None,
            name=item["name"],
            description=item.get("description"),
            interest_rate=item.get("interest_rate"),
            min_deposit=item.get("min_deposit"),
            max_deposit=item.get("max_deposit"),
            tenure_min_days=item.get("tenure_min_days"),
            tenure_max_days=item.get("tenure_max_days"),
            is_active=item.get("is_active", True),
            last_updated=item.get("last_updated"),
            created_at=item.get("created_at"),
        ))

    return PaginatedResponse(
        items=items,
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        total_pages=result["total_pages"],
        has_next=result["has_next"],
        has_previous=result["has_previous"],
    )


@router.get("/types", response_model=List[BankProductTypeResponse])
async def list_product_types(db=Depends(get_db)):
    product_service = BankProductService(db)
    types = await product_service.get_product_types()
    return [BankProductTypeResponse.model_validate(t.model_dump()) for t in types]


# Note: /banks routes must come BEFORE /{product_id} to avoid path parameter conflict
@router.get("/banks", response_model=List[BankResponse])
async def list_banks(market_id: Optional[UUID] = None, db=Depends(get_db)):
    product_service = BankProductService(db)
    banks = await product_service.get_banks(market_id)
    return [BankResponse.model_validate(b.model_dump()) for b in banks]


@router.get("/banks/{bank_id}", response_model=BankWithProductsResponse)
async def get_bank_with_products(bank_id: UUID, db=Depends(get_db)):
    product_service = BankProductService(db)
    result = await product_service.get_bank_with_products(bank_id)

    return BankWithProductsResponse(
        **result["bank"].model_dump(),
        products=[BankProductResponse(**p) for p in result["products"]],
    )


@router.get("/{product_id}", response_model=BankProductDetailResponse)
async def get_bank_product(product_id: UUID, db=Depends(get_db)):
    product_service = BankProductService(db)
    result = await product_service.get_product_by_id(product_id)

    bank = result.get("banks")
    product_type = result.get("bank_product_types")

    return BankProductDetailResponse(
        id=result["id"],
        bank_id=result["bank_id"],
        bank=BankResponse(**bank) if bank else None,
        product_type_id=result["product_type_id"],
        product_type=BankProductTypeResponse(**product_type) if product_type else None,
        name=result["name"],
        description=result.get("description"),
        interest_rate=result.get("interest_rate"),
        min_deposit=result.get("min_deposit"),
        max_deposit=result.get("max_deposit"),
        tenure_min_days=result.get("tenure_min_days"),
        tenure_max_days=result.get("tenure_max_days"),
        features=result.get("features", []),
        terms_conditions=result.get("terms_conditions"),
        is_active=result.get("is_active", True),
        last_updated=result.get("last_updated"),
        created_at=result.get("created_at"),
    )
