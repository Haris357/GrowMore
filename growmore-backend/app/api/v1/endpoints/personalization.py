"""
User Personalization API Endpoints.
Manage user profiles, risk assessment, and personalized recommendations.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.dependencies import get_current_user
from app.services.personalization_service import PersonalizationService
from app.models.user import User

router = APIRouter()


# ==================== Request/Response Models ====================

class ProfileCreate(BaseModel):
    risk_profile: str = Field(
        default="moderate",
        pattern="^(conservative|moderate|aggressive)$"
    )
    experience_level: str = Field(
        default="beginner",
        pattern="^(beginner|intermediate|advanced|expert)$"
    )
    investment_horizon: str = Field(
        default="medium_term",
        pattern="^(short_term|medium_term|long_term)$"
    )
    preferred_sectors: List[str] = Field(default=[])
    preferred_asset_types: List[str] = Field(default=[])
    monthly_investment_capacity: Optional[float] = Field(None, ge=0)
    financial_goals: List[str] = Field(default=[])


class ProfileUpdate(BaseModel):
    risk_profile: Optional[str] = Field(
        None,
        pattern="^(conservative|moderate|aggressive)$"
    )
    experience_level: Optional[str] = Field(
        None,
        pattern="^(beginner|intermediate|advanced|expert)$"
    )
    investment_horizon: Optional[str] = Field(
        None,
        pattern="^(short_term|medium_term|long_term)$"
    )
    preferred_sectors: Optional[List[str]] = None
    preferred_asset_types: Optional[List[str]] = None
    monthly_investment_capacity: Optional[float] = Field(None, ge=0)
    financial_goals: Optional[List[str]] = None


class RiskAssessmentAnswer(BaseModel):
    question_id: str
    answer: str


class RiskAssessmentSubmit(BaseModel):
    answers: List[RiskAssessmentAnswer]


# ==================== Profile Endpoints ====================

@router.get("/profile")
async def get_profile(
    current_user: User = Depends(get_current_user),
):
    """
    Get the current user's personalization profile.

    Returns profile data including risk score calculation.
    """
    service = PersonalizationService()
    profile = await service.get_profile(current_user.firebase_uid)

    if not profile:
        return {
            "profile": None,
            "message": "No profile found. Create one to get personalized recommendations.",
        }

    # Add risk score
    risk_score = service.calculate_risk_score(profile)
    profile["risk_score"] = risk_score

    return {"profile": profile}


@router.post("/profile", status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile: ProfileCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Create a personalization profile.

    This enables personalized recommendations based on:
    - Risk tolerance (conservative, moderate, aggressive)
    - Experience level
    - Investment horizon
    - Preferred sectors and asset types
    """
    service = PersonalizationService()

    # Check if profile already exists
    existing = await service.get_profile(current_user.firebase_uid)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile already exists. Use PUT to update.",
        )

    result = await service.create_profile(
        user_id=current_user.firebase_uid,
        data=profile.dict(),
    )

    return result


@router.put("/profile")
async def update_profile(
    update: ProfileUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update the user's personalization profile."""
    service = PersonalizationService()

    update_data = update.dict(exclude_none=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update data provided",
        )

    result = await service.update_profile(
        user_id=current_user.firebase_uid,
        data=update_data,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Create one first.",
        )

    return result


# ==================== Risk Assessment ====================

@router.get("/risk-assessment")
async def get_risk_assessment_questions():
    """
    Get risk assessment questionnaire.

    Answer these questions to determine your risk profile.
    """
    return {
        "questions": [
            {
                "id": "investment_goal",
                "question": "What is your primary investment goal?",
                "options": [
                    {"value": "preserve", "label": "Preserve my capital", "points": 1},
                    {"value": "income", "label": "Generate regular income", "points": 2},
                    {"value": "growth", "label": "Grow my wealth over time", "points": 3},
                    {"value": "aggressive_growth", "label": "Maximize returns aggressively", "points": 4},
                ],
            },
            {
                "id": "time_horizon",
                "question": "When do you plan to use this money?",
                "options": [
                    {"value": "1_year", "label": "Within 1 year", "points": 1},
                    {"value": "1_3_years", "label": "1-3 years", "points": 2},
                    {"value": "3_5_years", "label": "3-5 years", "points": 3},
                    {"value": "5_plus_years", "label": "More than 5 years", "points": 4},
                ],
            },
            {
                "id": "loss_reaction",
                "question": "If your investment dropped 20% in value, what would you do?",
                "options": [
                    {"value": "sell_all", "label": "Sell everything immediately", "points": 1},
                    {"value": "sell_some", "label": "Sell some to reduce risk", "points": 2},
                    {"value": "hold", "label": "Hold and wait for recovery", "points": 3},
                    {"value": "buy_more", "label": "Buy more at the lower price", "points": 4},
                ],
            },
            {
                "id": "income_stability",
                "question": "How stable is your income?",
                "options": [
                    {"value": "unstable", "label": "Variable/Uncertain", "points": 1},
                    {"value": "somewhat_stable", "label": "Somewhat stable", "points": 2},
                    {"value": "stable", "label": "Stable and reliable", "points": 3},
                    {"value": "very_stable", "label": "Very stable with growth potential", "points": 4},
                ],
            },
            {
                "id": "investment_experience",
                "question": "How much investment experience do you have?",
                "options": [
                    {"value": "none", "label": "None - Just starting", "points": 1},
                    {"value": "little", "label": "Limited - Basic knowledge", "points": 2},
                    {"value": "moderate", "label": "Moderate - Several years", "points": 3},
                    {"value": "extensive", "label": "Extensive - Expert level", "points": 4},
                ],
            },
            {
                "id": "emergency_fund",
                "question": "Do you have an emergency fund (3-6 months expenses)?",
                "options": [
                    {"value": "no", "label": "No emergency fund", "points": 1},
                    {"value": "partial", "label": "Less than 3 months", "points": 2},
                    {"value": "yes", "label": "3-6 months covered", "points": 3},
                    {"value": "excess", "label": "More than 6 months", "points": 4},
                ],
            },
            {
                "id": "risk_reward",
                "question": "Which statement best describes your preference?",
                "options": [
                    {"value": "low_risk", "label": "Low risk, low return - Safety first", "points": 1},
                    {"value": "balanced", "label": "Balanced - Moderate risk for moderate returns", "points": 2},
                    {"value": "growth", "label": "Higher risk for potentially higher returns", "points": 3},
                    {"value": "high_risk", "label": "Maximum risk for maximum potential returns", "points": 4},
                ],
            },
        ],
        "scoring": {
            "conservative": "7-14 points",
            "moderate": "15-21 points",
            "aggressive": "22-28 points",
        },
    }


@router.post("/risk-assessment")
async def submit_risk_assessment(
    submission: RiskAssessmentSubmit,
    current_user: User = Depends(get_current_user),
):
    """
    Submit risk assessment answers and get risk profile recommendation.

    Automatically updates user profile with the recommended risk profile.
    """
    # Point values for answers
    point_map = {
        "preserve": 1, "income": 2, "growth": 3, "aggressive_growth": 4,
        "1_year": 1, "1_3_years": 2, "3_5_years": 3, "5_plus_years": 4,
        "sell_all": 1, "sell_some": 2, "hold": 3, "buy_more": 4,
        "unstable": 1, "somewhat_stable": 2, "stable": 3, "very_stable": 4,
        "none": 1, "little": 2, "moderate": 3, "extensive": 4,
        "no": 1, "partial": 2, "yes": 3, "excess": 4,
        "low_risk": 1, "balanced": 2, "growth": 3, "high_risk": 4,
    }

    total_points = 0
    for answer in submission.answers:
        points = point_map.get(answer.answer, 2)  # Default to moderate
        total_points += points

    # Determine risk profile
    if total_points <= 14:
        risk_profile = "conservative"
        description = "You prefer safety over high returns. Focus on stable investments."
    elif total_points <= 21:
        risk_profile = "moderate"
        description = "You seek balanced growth with manageable risk."
    else:
        risk_profile = "aggressive"
        description = "You're comfortable with high risk for potentially high returns."

    # Update or create profile
    service = PersonalizationService()
    profile = await service.get_profile(current_user.firebase_uid)

    if profile:
        await service.update_profile(
            user_id=current_user.firebase_uid,
            data={"risk_profile": risk_profile},
        )
    else:
        await service.create_profile(
            user_id=current_user.firebase_uid,
            data={"risk_profile": risk_profile},
        )

    return {
        "total_points": total_points,
        "risk_profile": risk_profile,
        "description": description,
        "message": "Profile updated with your risk assessment results.",
    }


# ==================== Recommendations ====================

@router.get("/recommendations/stocks")
async def get_recommended_stocks(
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
):
    """
    Get personalized stock recommendations.

    Based on your risk profile and preferences.
    """
    service = PersonalizationService()
    stocks = await service.get_recommended_stocks(
        user_id=current_user.firebase_uid,
        limit=limit,
    )
    return {
        "recommendations": stocks,
        "total": len(stocks),
    }


@router.get("/recommendations/strategy")
async def get_recommended_strategy(
    current_user: User = Depends(get_current_user),
):
    """
    Get recommended investment strategy based on profile.

    Returns a screener strategy that matches your risk profile.
    """
    service = PersonalizationService()
    strategy = await service.get_recommended_strategy(current_user.firebase_uid)
    return {"strategy": strategy}


@router.get("/recommendations/news")
async def get_personalized_news(
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """
    Get personalized news feed.

    News articles filtered and ranked based on your interests.
    """
    service = PersonalizationService()
    news = await service.get_personalized_news(
        user_id=current_user.firebase_uid,
        limit=limit,
    )
    return {
        "news": news,
        "total": len(news),
    }


# ==================== Options ====================

@router.get("/options/risk-profiles")
async def get_risk_profile_options():
    """Get available risk profiles with descriptions."""
    return {
        "profiles": [
            {
                "id": "conservative",
                "name": "Conservative",
                "description": "Focus on capital preservation with steady, lower returns",
                "typical_allocation": {
                    "stocks": "20-30%",
                    "bonds_fd": "50-60%",
                    "gold": "10-20%",
                    "cash": "10%",
                },
                "suitable_for": "Near retirement, low risk tolerance, short-term goals",
            },
            {
                "id": "moderate",
                "name": "Moderate",
                "description": "Balance between growth and stability",
                "typical_allocation": {
                    "stocks": "40-60%",
                    "bonds_fd": "20-40%",
                    "gold": "10-15%",
                    "cash": "5-10%",
                },
                "suitable_for": "Medium-term goals, balanced risk tolerance",
            },
            {
                "id": "aggressive",
                "name": "Aggressive",
                "description": "Maximum growth potential with higher volatility",
                "typical_allocation": {
                    "stocks": "70-85%",
                    "bonds_fd": "5-15%",
                    "gold": "5-10%",
                    "cash": "5%",
                },
                "suitable_for": "Long-term goals, high risk tolerance, young investors",
            },
        ]
    }


@router.get("/options/sectors")
async def get_sector_options():
    """Get available sectors for preference selection."""
    return {
        "sectors": [
            {"id": "banking", "name": "Banking & Finance"},
            {"id": "cement", "name": "Cement"},
            {"id": "oil_gas", "name": "Oil & Gas"},
            {"id": "power", "name": "Power & Energy"},
            {"id": "fertilizer", "name": "Fertilizer"},
            {"id": "automobile", "name": "Automobile"},
            {"id": "pharma", "name": "Pharmaceuticals"},
            {"id": "textile", "name": "Textile"},
            {"id": "food", "name": "Food & Beverages"},
            {"id": "tech", "name": "Technology"},
            {"id": "telecom", "name": "Telecom"},
            {"id": "chemicals", "name": "Chemicals"},
            {"id": "engineering", "name": "Engineering"},
            {"id": "real_estate", "name": "Real Estate"},
            {"id": "insurance", "name": "Insurance"},
        ]
    }


@router.get("/options/asset-types")
async def get_asset_type_options():
    """Get available asset types for preference selection."""
    return {
        "asset_types": [
            {"id": "stocks", "name": "Stocks (PSX)", "risk": "high"},
            {"id": "mutual_funds", "name": "Mutual Funds", "risk": "medium-high"},
            {"id": "gold", "name": "Gold", "risk": "medium"},
            {"id": "silver", "name": "Silver", "risk": "medium-high"},
            {"id": "fixed_deposit", "name": "Fixed Deposits", "risk": "low"},
            {"id": "savings_account", "name": "Savings Accounts", "risk": "very_low"},
            {"id": "bonds", "name": "Government Bonds", "risk": "low"},
            {"id": "real_estate", "name": "Real Estate", "risk": "medium"},
            {"id": "crypto", "name": "Cryptocurrency", "risk": "very_high"},
        ]
    }


@router.get("/options/goals")
async def get_financial_goal_options():
    """Get common financial goals for preference selection."""
    return {
        "goals": [
            "Build Emergency Fund",
            "Save for Retirement",
            "Buy a House",
            "Children's Education",
            "Wedding Expenses",
            "Buy a Car",
            "Start a Business",
            "Grow Wealth",
            "Generate Passive Income",
            "Pay Off Debt",
            "Travel/Vacation",
            "Leave Inheritance",
        ]
    }
