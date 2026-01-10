from typing import Optional

from fastapi import Depends, Header

from app.core.security import extract_token_from_header, get_current_user_from_token
from app.core.exceptions import AuthenticationError, NotFoundError
from app.db.supabase import get_supabase_client
from app.ai.groq_client import get_groq_client
from app.repositories.user_repository import UserRepository
from app.models.user import User


async def get_db():
    return get_supabase_client()


async def get_groq():
    return get_groq_client()


async def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db=Depends(get_db),
) -> User:
    if not authorization:
        raise AuthenticationError("Authorization header missing")

    token = extract_token_from_header(authorization)
    token_data = await get_current_user_from_token(token)

    user_repo = UserRepository(db)
    user = await user_repo.get_by_firebase_uid(token_data["firebase_uid"])

    if not user:
        raise NotFoundError("User", "User not found. Please verify your account first.")

    if not user.is_active:
        raise AuthenticationError("User account is deactivated")

    return user


async def get_current_user_optional(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db=Depends(get_db),
) -> Optional[User]:
    if not authorization:
        return None

    try:
        return await get_current_user(authorization, db)
    except (AuthenticationError, NotFoundError):
        return None


async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency that requires the current user to be an admin."""
    if not getattr(current_user, 'is_admin', False):
        raise AuthenticationError("Admin privileges required")
    return current_user


class RateLimiter:
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: dict = {}

    async def check_rate_limit(self, client_id: str) -> bool:
        import time
        current_time = time.time()
        window_start = current_time - 60

        if client_id not in self.requests:
            self.requests[client_id] = []

        self.requests[client_id] = [
            req_time for req_time in self.requests[client_id]
            if req_time > window_start
        ]

        if len(self.requests[client_id]) >= self.requests_per_minute:
            return False

        self.requests[client_id].append(current_time)
        return True
