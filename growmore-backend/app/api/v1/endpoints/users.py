from fastapi import APIRouter, Depends
from uuid import UUID

from app.core.dependencies import get_db, get_current_user
from app.services.user_service import UserService
from app.schemas.user import UserResponse
from app.models.user import User

router = APIRouter()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    user_service = UserService(db)
    user = await user_service.get_user_by_id(user_id)
    return UserResponse.model_validate(user.model_dump())
