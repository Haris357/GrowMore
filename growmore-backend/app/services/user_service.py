from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from supabase import Client

from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.core.exceptions import NotFoundError, ConflictError


class UserService:
    def __init__(self, db: Client):
        self.repo = UserRepository(db)

    async def get_user_by_id(self, user_id: UUID) -> User:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User")
        return User(**user)

    async def get_user_by_firebase_uid(self, firebase_uid: str) -> Optional[User]:
        return await self.repo.get_by_firebase_uid(firebase_uid)

    async def create_or_update_user(self, user_data: Dict[str, Any]) -> tuple[User, bool]:
        existing = await self.repo.get_by_firebase_uid(user_data["firebase_uid"])

        if existing:
            await self.repo.update_last_login(existing.id)
            return existing, False

        existing_email = await self.repo.get_by_email(user_data["email"])
        if existing_email:
            raise ConflictError("User with this email already exists")

        user = await self.repo.create_user(user_data)
        return user, True

    async def update_user(self, user_id: UUID, data: Dict[str, Any]) -> User:
        user = await self.repo.update_user(user_id, data)
        if not user:
            raise NotFoundError("User")
        return user

    async def update_preferences(self, user_id: UUID, preferences: Dict[str, Any]) -> User:
        user = await self.repo.update_preferences(user_id, preferences)
        if not user:
            raise NotFoundError("User")
        return user

    async def deactivate_user(self, user_id: UUID) -> User:
        user = await self.repo.deactivate_user(user_id)
        if not user:
            raise NotFoundError("User")
        return user
