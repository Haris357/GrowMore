from fastapi import APIRouter, Depends
from typing import List
from uuid import UUID

from app.core.dependencies import get_db, get_current_user
from app.services.watchlist_service import WatchlistService
from app.models.user import User
from app.schemas.watchlist import (
    WatchlistCreate,
    WatchlistUpdate,
    WatchlistResponse,
    WatchlistDetailResponse,
    WatchlistItemCreate,
    WatchlistItemResponse,
    PriceAlertUpdate,
)
from app.schemas.common import MessageResponse

router = APIRouter()


@router.get("", response_model=List[WatchlistResponse])
async def list_watchlists(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    watchlist_service = WatchlistService(db)
    watchlists = await watchlist_service.get_user_watchlists(current_user.id)
    return [WatchlistResponse(**w) for w in watchlists]


@router.post("", response_model=WatchlistResponse)
async def create_watchlist(
    data: WatchlistCreate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    watchlist_service = WatchlistService(db)
    watchlist = await watchlist_service.create_watchlist(
        current_user.id,
        data.model_dump(),
    )
    return WatchlistResponse.model_validate(watchlist.model_dump())


@router.get("/{watchlist_id}", response_model=WatchlistDetailResponse)
async def get_watchlist(
    watchlist_id: UUID,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    watchlist_service = WatchlistService(db)
    result = await watchlist_service.get_watchlist_by_id(watchlist_id, current_user.id)

    return WatchlistDetailResponse(
        id=result["id"],
        user_id=result["user_id"],
        name=result["name"],
        description=result.get("description"),
        is_default=result.get("is_default", False),
        items_count=result.get("items_count", 0),
        created_at=result["created_at"],
        updated_at=result["updated_at"],
        items=[WatchlistItemResponse.model_validate(i.model_dump()) for i in result.get("items", [])],
    )


@router.put("/{watchlist_id}", response_model=WatchlistResponse)
async def update_watchlist(
    watchlist_id: UUID,
    data: WatchlistUpdate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    watchlist_service = WatchlistService(db)
    watchlist = await watchlist_service.update_watchlist(
        watchlist_id,
        current_user.id,
        data.model_dump(exclude_unset=True),
    )
    return WatchlistResponse.model_validate(watchlist.model_dump())


@router.delete("/{watchlist_id}", response_model=MessageResponse)
async def delete_watchlist(
    watchlist_id: UUID,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    watchlist_service = WatchlistService(db)
    await watchlist_service.delete_watchlist(watchlist_id, current_user.id)
    return MessageResponse(message="Watchlist deleted successfully")


@router.post("/{watchlist_id}/items", response_model=WatchlistItemResponse)
async def add_watchlist_item(
    watchlist_id: UUID,
    data: WatchlistItemCreate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    watchlist_service = WatchlistService(db)
    item = await watchlist_service.add_item(
        watchlist_id,
        current_user.id,
        data.model_dump(),
    )
    return WatchlistItemResponse.model_validate(item.model_dump())


@router.delete("/{watchlist_id}/items/{item_id}", response_model=MessageResponse)
async def remove_watchlist_item(
    watchlist_id: UUID,
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    watchlist_service = WatchlistService(db)
    await watchlist_service.remove_item(watchlist_id, item_id, current_user.id)
    return MessageResponse(message="Item removed from watchlist")


@router.put("/{watchlist_id}/items/{item_id}/alerts", response_model=WatchlistItemResponse)
async def update_price_alerts(
    watchlist_id: UUID,
    item_id: UUID,
    data: PriceAlertUpdate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    watchlist_service = WatchlistService(db)
    item = await watchlist_service.update_price_alerts(
        watchlist_id,
        item_id,
        current_user.id,
        data.price_alert_above,
        data.price_alert_below,
    )
    return WatchlistItemResponse.model_validate(item.model_dump())
