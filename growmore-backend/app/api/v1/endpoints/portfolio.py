from fastapi import APIRouter, Depends, Query
from typing import List
from uuid import UUID

from app.core.dependencies import get_db, get_current_user
from app.services.portfolio_service import PortfolioService
from app.models.user import User
from app.schemas.portfolio import (
    PortfolioCreate,
    PortfolioUpdate,
    PortfolioResponse,
    PortfolioDetailResponse,
    HoldingCreate,
    HoldingUpdate,
    HoldingResponse,
    TransactionCreate,
    TransactionResponse,
    PortfolioPerformanceResponse,
)
from app.schemas.common import PaginatedResponse, MessageResponse

router = APIRouter()


@router.get("", response_model=List[PortfolioResponse])
async def list_portfolios(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    portfolio_service = PortfolioService(db)
    portfolios = await portfolio_service.get_user_portfolios(current_user.id)
    return [PortfolioResponse.model_validate(p.model_dump()) for p in portfolios]


@router.post("", response_model=PortfolioResponse)
async def create_portfolio(
    data: PortfolioCreate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    portfolio_service = PortfolioService(db)
    portfolio = await portfolio_service.create_portfolio(
        current_user.id,
        data.model_dump(),
    )
    return PortfolioResponse.model_validate(portfolio.model_dump())


@router.get("/{portfolio_id}", response_model=PortfolioDetailResponse)
async def get_portfolio(
    portfolio_id: UUID,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    portfolio_service = PortfolioService(db)
    result = await portfolio_service.get_portfolio_by_id(portfolio_id, current_user.id)

    return PortfolioDetailResponse(
        id=result["id"],
        user_id=result["user_id"],
        name=result["name"],
        description=result.get("description"),
        is_default=result.get("is_default", False),
        total_invested=result.get("total_invested", 0),
        current_value=result.get("current_value", 0),
        created_at=result["created_at"],
        updated_at=result["updated_at"],
        holdings=[HoldingResponse.model_validate(h.model_dump()) for h in result.get("holdings", [])],
        profit_loss=result.get("profit_loss"),
        profit_loss_percentage=result.get("profit_loss_percentage"),
    )


@router.put("/{portfolio_id}", response_model=PortfolioResponse)
async def update_portfolio(
    portfolio_id: UUID,
    data: PortfolioUpdate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    portfolio_service = PortfolioService(db)
    portfolio = await portfolio_service.update_portfolio(
        portfolio_id,
        current_user.id,
        data.model_dump(exclude_unset=True),
    )
    return PortfolioResponse.model_validate(portfolio.model_dump())


@router.delete("/{portfolio_id}", response_model=MessageResponse)
async def delete_portfolio(
    portfolio_id: UUID,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    portfolio_service = PortfolioService(db)
    await portfolio_service.delete_portfolio(portfolio_id, current_user.id)
    return MessageResponse(message="Portfolio deleted successfully")


@router.post("/{portfolio_id}/holdings", response_model=HoldingResponse)
async def add_holding(
    portfolio_id: UUID,
    data: HoldingCreate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    portfolio_service = PortfolioService(db)
    holding = await portfolio_service.add_holding(
        portfolio_id,
        current_user.id,
        data.model_dump(),
    )
    return HoldingResponse.model_validate(holding.model_dump())


@router.put("/{portfolio_id}/holdings/{holding_id}", response_model=HoldingResponse)
async def update_holding(
    portfolio_id: UUID,
    holding_id: UUID,
    data: HoldingUpdate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    portfolio_service = PortfolioService(db)
    holding = await portfolio_service.update_holding(
        portfolio_id,
        holding_id,
        current_user.id,
        data.model_dump(exclude_unset=True),
    )
    return HoldingResponse.model_validate(holding.model_dump())


@router.delete("/{portfolio_id}/holdings/{holding_id}", response_model=MessageResponse)
async def remove_holding(
    portfolio_id: UUID,
    holding_id: UUID,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    portfolio_service = PortfolioService(db)
    await portfolio_service.remove_holding(portfolio_id, holding_id, current_user.id)
    return MessageResponse(message="Holding removed successfully")


@router.post("/{portfolio_id}/transactions", response_model=TransactionResponse)
async def record_transaction(
    portfolio_id: UUID,
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    portfolio_service = PortfolioService(db)
    transaction = await portfolio_service.record_transaction(
        portfolio_id,
        current_user.id,
        data.model_dump(),
    )
    return TransactionResponse.model_validate(transaction.model_dump())


@router.get("/{portfolio_id}/transactions", response_model=PaginatedResponse[TransactionResponse])
async def get_transactions(
    portfolio_id: UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    portfolio_service = PortfolioService(db)
    result = await portfolio_service.get_transactions(
        portfolio_id,
        current_user.id,
        page,
        page_size,
    )

    return PaginatedResponse(
        items=[TransactionResponse(**t) for t in result["items"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        total_pages=result["total_pages"],
        has_next=result["has_next"],
        has_previous=result["has_previous"],
    )


@router.get("/{portfolio_id}/performance", response_model=PortfolioPerformanceResponse)
async def get_portfolio_performance(
    portfolio_id: UUID,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    portfolio_service = PortfolioService(db)
    result = await portfolio_service.get_performance(portfolio_id, current_user.id)
    return PortfolioPerformanceResponse(**result)
