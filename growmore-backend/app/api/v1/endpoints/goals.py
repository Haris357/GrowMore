"""
Investment Goals API Endpoints.
Track and manage user investment goals.
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.dependencies import get_current_user
from app.services.goals_service import GoalsService
from app.models.user import User

router = APIRouter()


# ==================== Request/Response Models ====================

class GoalCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    target_amount: float = Field(..., gt=0)
    current_amount: float = Field(default=0, ge=0)
    target_date: Optional[date] = None
    goal_type: str = Field(..., pattern="^(emergency_fund|retirement|house_purchase|education|wedding|vehicle|vacation|business|investment|other)$")
    priority: str = Field(default="medium", pattern="^(low|medium|high|critical)$")
    linked_portfolio_id: Optional[str] = None
    notes: Optional[str] = None


class GoalUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    target_amount: Optional[float] = Field(None, gt=0)
    current_amount: Optional[float] = Field(None, ge=0)
    target_date: Optional[date] = None
    goal_type: Optional[str] = Field(None, pattern="^(emergency_fund|retirement|house_purchase|education|wedding|vehicle|vacation|business|investment|other)$")
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")
    linked_portfolio_id: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(active|paused|achieved|cancelled)$")
    notes: Optional[str] = None


class ContributionCreate(BaseModel):
    amount: float = Field(..., gt=0)
    contribution_date: Optional[date] = None
    source: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None


class ProjectionRequest(BaseModel):
    monthly_contribution: Optional[float] = Field(None, gt=0)


class SuggestionRequest(BaseModel):
    target_amount: float = Field(..., gt=0)
    current_amount: float = Field(default=0, ge=0)
    target_date: date


# ==================== Goal CRUD Endpoints ====================

@router.get("")
async def list_goals(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """
    Get all investment goals for the current user.

    Optional filter by status: active, paused, achieved, cancelled
    """
    service = GoalsService()
    goals = await service.get_user_goals(
        user_id=current_user.firebase_uid,
        status=status,
    )
    return {
        "goals": goals,
        "total": len(goals),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_goal(
    goal: GoalCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Create a new investment goal.

    Goal types:
    - emergency_fund: Build emergency savings
    - retirement: Retirement savings
    - house_purchase: Down payment or full house purchase
    - education: Children's education or self-improvement
    - wedding: Wedding expenses
    - vehicle: Car or motorcycle purchase
    - vacation: Travel and vacation fund
    - business: Start or expand business
    - investment: General investment target
    - other: Custom goal
    """
    service = GoalsService()
    result = await service.create_goal(
        user_id=current_user.firebase_uid,
        data=goal.dict(exclude_none=True),
    )
    return result


@router.get("/summary")
async def get_goals_summary(
    current_user: User = Depends(get_current_user),
):
    """
    Get a summary of all user goals.

    Returns:
    - Total goals count (active, achieved)
    - Overall progress percentage
    - Goals needing attention (behind schedule)
    - Recent achievements
    """
    service = GoalsService()
    return await service.get_goals_summary(current_user.firebase_uid)


@router.get("/types")
async def get_goal_types():
    """Get available goal types with descriptions."""
    return {
        "types": [
            {
                "id": "emergency_fund",
                "name": "Emergency Fund",
                "description": "Build 3-6 months of expenses as safety net",
                "icon": "shield",
                "recommended_priority": "high",
            },
            {
                "id": "retirement",
                "name": "Retirement",
                "description": "Long-term savings for comfortable retirement",
                "icon": "sunset",
                "recommended_priority": "high",
            },
            {
                "id": "house_purchase",
                "name": "House Purchase",
                "description": "Save for down payment or full house purchase",
                "icon": "home",
                "recommended_priority": "high",
            },
            {
                "id": "education",
                "name": "Education",
                "description": "Children's education or self-improvement",
                "icon": "graduation-cap",
                "recommended_priority": "high",
            },
            {
                "id": "wedding",
                "name": "Wedding",
                "description": "Wedding expenses and celebrations",
                "icon": "heart",
                "recommended_priority": "medium",
            },
            {
                "id": "vehicle",
                "name": "Vehicle",
                "description": "Car or motorcycle purchase",
                "icon": "car",
                "recommended_priority": "medium",
            },
            {
                "id": "vacation",
                "name": "Vacation",
                "description": "Travel and vacation fund",
                "icon": "plane",
                "recommended_priority": "low",
            },
            {
                "id": "business",
                "name": "Business",
                "description": "Start or expand a business",
                "icon": "briefcase",
                "recommended_priority": "medium",
            },
            {
                "id": "investment",
                "name": "Investment Target",
                "description": "General investment portfolio goal",
                "icon": "trending-up",
                "recommended_priority": "medium",
            },
            {
                "id": "other",
                "name": "Other",
                "description": "Custom financial goal",
                "icon": "target",
                "recommended_priority": "medium",
            },
        ]
    }


@router.get("/{goal_id}")
async def get_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get a specific goal with progress information."""
    service = GoalsService()
    goal = await service.get_goal(current_user.firebase_uid, goal_id)

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )

    # Add progress info
    progress = service.calculate_progress(goal)
    goal["progress"] = progress

    return goal


@router.put("/{goal_id}")
async def update_goal(
    goal_id: str,
    update: GoalUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update an investment goal."""
    service = GoalsService()

    update_data = update.dict(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided",
        )

    result = await service.update_goal(
        user_id=current_user.firebase_uid,
        goal_id=goal_id,
        data=update_data,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )

    return result


@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete an investment goal."""
    service = GoalsService()
    success = await service.delete_goal(current_user.firebase_uid, goal_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found or could not be deleted",
        )

    return {"message": "Goal deleted successfully"}


# ==================== Contribution Endpoints ====================

@router.post("/{goal_id}/contributions")
async def add_contribution(
    goal_id: str,
    contribution: ContributionCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Add a contribution to a goal.

    Contributions track progress toward the goal.
    The goal's current_amount is automatically updated.
    If the goal is achieved, its status changes to 'achieved'.
    """
    service = GoalsService()

    try:
        result = await service.add_contribution(
            user_id=current_user.firebase_uid,
            goal_id=goal_id,
            amount=contribution.amount,
            contribution_date=contribution.contribution_date,
            source=contribution.source,
            notes=contribution.notes,
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get("/{goal_id}/contributions")
async def get_contributions(
    goal_id: str,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
):
    """Get contribution history for a goal."""
    service = GoalsService()
    contributions = await service.get_contributions(
        user_id=current_user.firebase_uid,
        goal_id=goal_id,
        limit=limit,
    )
    return {
        "contributions": contributions,
        "total": len(contributions),
    }


# ==================== Progress & Analytics Endpoints ====================

@router.get("/{goal_id}/progress")
async def get_goal_progress(
    goal_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed progress report for a goal.

    Includes:
    - Current progress metrics
    - Monthly contribution breakdown
    - Recent contributions
    - Time-based analysis
    """
    service = GoalsService()
    result = await service.get_goal_progress(current_user.firebase_uid, goal_id)

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["error"],
        )

    return result


@router.post("/{goal_id}/projection")
async def get_goal_projection(
    goal_id: str,
    request: ProjectionRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Project when a goal will be achieved.

    Uses contribution history to calculate average monthly contribution,
    or accepts a custom monthly_contribution amount.

    Returns projected completion date and whether it meets the target date.
    """
    service = GoalsService()
    result = await service.get_projected_completion(
        user_id=current_user.firebase_uid,
        goal_id=goal_id,
        monthly_contribution=request.monthly_contribution,
    )

    if "error" in result:
        if result["error"] == "Goal not found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=result["error"],
            )
        return result  # Return other errors as informational

    return result


@router.post("/suggest-contribution")
async def suggest_contribution(
    request: SuggestionRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Calculate suggested monthly contribution to reach a goal.

    Returns:
    - Required monthly amount (to exactly meet goal)
    - Comfortable amount (80% - takes longer)
    - Aggressive amount (120% - faster achievement)
    """
    service = GoalsService()
    result = service.suggest_monthly_contribution(
        target_amount=request.target_amount,
        current_amount=request.current_amount,
        target_date=request.target_date,
    )

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"],
        )

    return result


# ==================== Quick Actions ====================

@router.post("/{goal_id}/pause")
async def pause_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
):
    """Pause a goal (temporarily stop tracking)."""
    service = GoalsService()
    result = await service.update_goal(
        user_id=current_user.firebase_uid,
        goal_id=goal_id,
        data={"status": "paused"},
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )

    return {"message": "Goal paused", "goal": result}


@router.post("/{goal_id}/resume")
async def resume_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
):
    """Resume a paused goal."""
    service = GoalsService()
    result = await service.update_goal(
        user_id=current_user.firebase_uid,
        goal_id=goal_id,
        data={"status": "active"},
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )

    return {"message": "Goal resumed", "goal": result}


@router.post("/{goal_id}/mark-achieved")
async def mark_goal_achieved(
    goal_id: str,
    current_user: User = Depends(get_current_user),
):
    """Manually mark a goal as achieved."""
    service = GoalsService()
    result = await service.update_goal(
        user_id=current_user.firebase_uid,
        goal_id=goal_id,
        data={"status": "achieved"},
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goal not found",
        )

    return {"message": "Goal marked as achieved!", "goal": result}
