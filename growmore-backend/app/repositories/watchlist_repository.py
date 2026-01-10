from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from supabase import Client

from app.models.watchlist import Watchlist, WatchlistItem, UserAlert
from app.repositories.base import BaseRepository


class WatchlistRepository(BaseRepository[Watchlist]):
    def __init__(self, client: Client):
        super().__init__(client, "watchlists")

    async def get_user_watchlists(self, user_id: UUID) -> List[Dict[str, Any]]:
        result = self.client.table(self.table_name).select(
            "*, watchlist_items(count)"
        ).eq("user_id", str(user_id)).order("is_default", desc=True).order("created_at").execute()

        watchlists = []
        for item in result.data or []:
            item["items_count"] = item.pop("watchlist_items", [{}])[0].get("count", 0)
            watchlists.append(item)

        return watchlists

    async def get_default_watchlist(self, user_id: UUID) -> Optional[Watchlist]:
        result = self.client.table(self.table_name).select("*").eq(
            "user_id", str(user_id)
        ).eq("is_default", True).execute()

        if result.data:
            return Watchlist(**result.data[0])
        return None

    async def set_default(self, user_id: UUID, watchlist_id: UUID) -> Optional[Watchlist]:
        self.client.table(self.table_name).update({"is_default": False}).eq(
            "user_id", str(user_id)
        ).execute()

        result = self.client.table(self.table_name).update({
            "is_default": True,
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", str(watchlist_id)).execute()

        if result.data:
            return Watchlist(**result.data[0])
        return None


class WatchlistItemRepository(BaseRepository[WatchlistItem]):
    def __init__(self, client: Client):
        super().__init__(client, "watchlist_items")

    async def get_watchlist_items(self, watchlist_id: UUID) -> List[WatchlistItem]:
        result = self.client.table(self.table_name).select("*").eq(
            "watchlist_id", str(watchlist_id)
        ).order("added_at", desc=True).execute()

        return [WatchlistItem(**item) for item in result.data] if result.data else []

    async def get_item_by_asset(
        self, watchlist_id: UUID, item_type: str, item_id: UUID
    ) -> Optional[WatchlistItem]:
        result = self.client.table(self.table_name).select("*").eq(
            "watchlist_id", str(watchlist_id)
        ).eq("item_type", item_type).eq("item_id", str(item_id)).execute()

        if result.data:
            return WatchlistItem(**result.data[0])
        return None

    async def update_price_alerts(
        self, item_id: UUID, price_alert_above: Optional[float], price_alert_below: Optional[float]
    ) -> Optional[WatchlistItem]:
        data = {}
        if price_alert_above is not None:
            data["price_alert_above"] = price_alert_above
        if price_alert_below is not None:
            data["price_alert_below"] = price_alert_below

        if not data:
            return None

        result = self.client.table(self.table_name).update(data).eq(
            "id", str(item_id)
        ).execute()

        if result.data:
            return WatchlistItem(**result.data[0])
        return None


class UserAlertRepository(BaseRepository[UserAlert]):
    def __init__(self, client: Client):
        super().__init__(client, "user_alerts")

    async def get_user_alerts(
        self, user_id: UUID, active_only: bool = True
    ) -> List[UserAlert]:
        query = self.client.table(self.table_name).select("*").eq(
            "user_id", str(user_id)
        )

        if active_only:
            query = query.eq("is_active", True)

        result = query.order("created_at", desc=True).execute()

        return [UserAlert(**item) for item in result.data] if result.data else []

    async def get_pending_alerts(self) -> List[UserAlert]:
        result = self.client.table(self.table_name).select("*").eq(
            "is_active", True
        ).eq("is_triggered", False).execute()

        return [UserAlert(**item) for item in result.data] if result.data else []

    async def trigger_alert(self, alert_id: UUID, message: Optional[str] = None) -> Optional[UserAlert]:
        data = {
            "is_triggered": True,
            "triggered_at": datetime.utcnow().isoformat(),
        }
        if message:
            data["message"] = message

        result = self.client.table(self.table_name).update(data).eq(
            "id", str(alert_id)
        ).execute()

        if result.data:
            return UserAlert(**result.data[0])
        return None
