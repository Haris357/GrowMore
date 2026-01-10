from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client

from app.models.watchlist import Watchlist, WatchlistItem
from app.repositories.watchlist_repository import (
    WatchlistRepository,
    WatchlistItemRepository,
    UserAlertRepository,
)
from app.core.exceptions import NotFoundError, AuthorizationError, ConflictError


class WatchlistService:
    def __init__(self, db: Client):
        self.watchlist_repo = WatchlistRepository(db)
        self.item_repo = WatchlistItemRepository(db)
        self.alert_repo = UserAlertRepository(db)

    async def get_user_watchlists(self, user_id: UUID) -> List[Dict[str, Any]]:
        return await self.watchlist_repo.get_user_watchlists(user_id)

    async def get_watchlist_by_id(self, watchlist_id: UUID, user_id: UUID) -> Dict[str, Any]:
        watchlist = await self.watchlist_repo.get_by_id(watchlist_id)
        if not watchlist:
            raise NotFoundError("Watchlist")

        if str(watchlist["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to access this watchlist")

        items = await self.item_repo.get_watchlist_items(watchlist_id)

        return {
            **watchlist,
            "items": items,
            "items_count": len(items),
        }

    async def create_watchlist(self, user_id: UUID, data: Dict[str, Any]) -> Watchlist:
        watchlists = await self.watchlist_repo.get_user_watchlists(user_id)

        if data.get("is_default", False) and watchlists:
            await self.watchlist_repo.set_default(user_id, None)
        elif not watchlists:
            data["is_default"] = True

        data["user_id"] = str(user_id)
        result = await self.watchlist_repo.create(data)
        return Watchlist(**result)

    async def update_watchlist(
        self, watchlist_id: UUID, user_id: UUID, data: Dict[str, Any]
    ) -> Watchlist:
        watchlist = await self.watchlist_repo.get_by_id(watchlist_id)
        if not watchlist:
            raise NotFoundError("Watchlist")

        if str(watchlist["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to update this watchlist")

        if data.get("is_default", False):
            await self.watchlist_repo.set_default(user_id, watchlist_id)
            data.pop("is_default", None)

        data["updated_at"] = datetime.utcnow().isoformat()
        result = await self.watchlist_repo.update(watchlist_id, data)
        return Watchlist(**result)

    async def delete_watchlist(self, watchlist_id: UUID, user_id: UUID) -> bool:
        watchlist = await self.watchlist_repo.get_by_id(watchlist_id)
        if not watchlist:
            raise NotFoundError("Watchlist")

        if str(watchlist["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to delete this watchlist")

        return await self.watchlist_repo.delete(watchlist_id)

    async def add_item(
        self, watchlist_id: UUID, user_id: UUID, data: Dict[str, Any]
    ) -> WatchlistItem:
        watchlist = await self.watchlist_repo.get_by_id(watchlist_id)
        if not watchlist:
            raise NotFoundError("Watchlist")

        if str(watchlist["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to modify this watchlist")

        existing = await self.item_repo.get_item_by_asset(
            watchlist_id, data["item_type"], data["item_id"]
        )

        if existing:
            raise ConflictError("Item already exists in watchlist")

        data["watchlist_id"] = str(watchlist_id)
        data["item_id"] = str(data["item_id"])
        if data.get("price_alert_above"):
            data["price_alert_above"] = float(data["price_alert_above"])
        if data.get("price_alert_below"):
            data["price_alert_below"] = float(data["price_alert_below"])

        result = await self.item_repo.create(data)
        return WatchlistItem(**result)

    async def remove_item(
        self, watchlist_id: UUID, item_id: UUID, user_id: UUID
    ) -> bool:
        watchlist = await self.watchlist_repo.get_by_id(watchlist_id)
        if not watchlist:
            raise NotFoundError("Watchlist")

        if str(watchlist["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to modify this watchlist")

        item = await self.item_repo.get_by_id(item_id)
        if not item or str(item["watchlist_id"]) != str(watchlist_id):
            raise NotFoundError("Watchlist Item")

        return await self.item_repo.delete(item_id)

    async def update_price_alerts(
        self,
        watchlist_id: UUID,
        item_id: UUID,
        user_id: UUID,
        price_alert_above: Optional[Decimal] = None,
        price_alert_below: Optional[Decimal] = None,
    ) -> WatchlistItem:
        watchlist = await self.watchlist_repo.get_by_id(watchlist_id)
        if not watchlist:
            raise NotFoundError("Watchlist")

        if str(watchlist["user_id"]) != str(user_id):
            raise AuthorizationError("Not authorized to modify this watchlist")

        item = await self.item_repo.get_by_id(item_id)
        if not item or str(item["watchlist_id"]) != str(watchlist_id):
            raise NotFoundError("Watchlist Item")

        result = await self.item_repo.update_price_alerts(
            item_id,
            float(price_alert_above) if price_alert_above else None,
            float(price_alert_below) if price_alert_below else None,
        )

        if not result:
            raise NotFoundError("Watchlist Item")

        return result

    async def get_user_alerts(self, user_id: UUID, active_only: bool = True) -> List[Dict[str, Any]]:
        alerts = await self.alert_repo.get_user_alerts(user_id, active_only)
        return [alert.model_dump() for alert in alerts]
