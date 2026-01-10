from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from supabase import Client

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, client: Client):
        super().__init__(client, "users")

    async def get_by_firebase_uid(self, firebase_uid: str) -> Optional[User]:
        result = self.client.table(self.table_name).select("*").eq(
            "firebase_uid", firebase_uid
        ).execute()

        if result.data:
            return User(**result.data[0])
        return None

    async def get_by_email(self, email: str) -> Optional[User]:
        result = self.client.table(self.table_name).select("*").eq(
            "email", email
        ).execute()

        if result.data:
            return User(**result.data[0])
        return None

    async def create_user(self, data: Dict[str, Any]) -> User:
        result = self.client.table(self.table_name).insert(data).execute()
        return User(**result.data[0])

    async def update_user(self, id: UUID, data: Dict[str, Any]) -> Optional[User]:
        data["updated_at"] = datetime.utcnow().isoformat()
        result = self.client.table(self.table_name).update(data).eq(
            "id", str(id)
        ).execute()

        if result.data:
            return User(**result.data[0])
        return None

    async def update_last_login(self, id: UUID) -> Optional[User]:
        return await self.update_user(id, {"last_login_at": datetime.utcnow().isoformat()})

    async def update_preferences(
        self, id: UUID, preferences: Dict[str, Any]
    ) -> Optional[User]:
        current = await self.get_by_id(id)
        if not current:
            return None

        current_prefs = current.get("preferences", {})
        current_prefs.update(preferences)

        return await self.update_user(id, {"preferences": current_prefs})

    async def deactivate_user(self, id: UUID) -> Optional[User]:
        return await self.update_user(id, {"is_active": False})

    async def activate_user(self, id: UUID) -> Optional[User]:
        return await self.update_user(id, {"is_active": True})
