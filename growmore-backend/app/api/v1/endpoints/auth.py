from fastapi import APIRouter, Depends, Header
from typing import Optional

from app.core.dependencies import get_db, get_current_user
from app.core.security import extract_token_from_header, get_current_user_from_token
from app.services.user_service import UserService
from app.schemas.user import (
    TokenVerifyRequest,
    TokenVerifyResponse,
    UserResponse,
    UserUpdate,
    UserPreferencesUpdate,
)
from app.models.user import User

router = APIRouter()


@router.post("/verify", response_model=TokenVerifyResponse)
async def verify_token(
    request: TokenVerifyRequest,
    db=Depends(get_db),
):
    token_data = await get_current_user_from_token(request.token)

    user_service = UserService(db)
    user, is_new = await user_service.create_or_update_user({
        "firebase_uid": token_data["firebase_uid"],
        "email": token_data["email"],
        "display_name": token_data.get("display_name"),
        "photo_url": token_data.get("photo_url"),
        "auth_provider": token_data["auth_provider"],
    })

    return TokenVerifyResponse(
        user=UserResponse.model_validate(user.model_dump()),
        is_new_user=is_new,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    return UserResponse.model_validate(current_user.model_dump())


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    user_service = UserService(db)
    updated = await user_service.update_user(
        current_user.id,
        data.model_dump(exclude_unset=True),
    )
    return UserResponse.model_validate(updated.model_dump())


@router.put("/preferences", response_model=UserResponse)
async def update_user_preferences(
    data: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    user_service = UserService(db)
    updated = await user_service.update_preferences(
        current_user.id,
        data.model_dump(exclude_unset=True),
    )
    return UserResponse.model_validate(updated.model_dump())
