"""
User Personalization Service.
Handles user profiles, preferences, and personalized recommendations.
"""

import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.db.supabase import get_supabase_service_client

logger = logging.getLogger(__name__)


# Risk Profile Options
RISK_TOLERANCES = ["conservative", "moderate", "aggressive"]
INVESTMENT_EXPERIENCES = ["beginner", "intermediate", "advanced", "expert"]
INVESTMENT_HORIZONS = ["short_term", "medium_term", "long_term"]

# Goal Types
GOAL_TYPES = [
    {"code": "emergency_fund", "name": "Emergency Fund", "icon": "shield"},
    {"code": "retirement", "name": "Retirement", "icon": "umbrella"},
    {"code": "house_purchase", "name": "House Purchase", "icon": "home"},
    {"code": "education", "name": "Education", "icon": "book"},
    {"code": "wedding", "name": "Wedding", "icon": "heart"},
    {"code": "car_purchase", "name": "Car Purchase", "icon": "car"},
    {"code": "vacation", "name": "Vacation", "icon": "plane"},
    {"code": "wealth_building", "name": "Wealth Building", "icon": "trending-up"},
    {"code": "other", "name": "Other", "icon": "target"},
]


class PersonalizationService:
    """
    User personalization and recommendations service.
    """

    def __init__(self):
        self.db = get_supabase_service_client()

    async def get_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile."""
        try:
            result = self.db.table("user_profiles").select("*").eq(
                "user_id", user_id
            ).execute()

            return result.data[0] if result.data else None

        except Exception as e:
            logger.error(f"Error getting profile: {e}")
            return None

    async def create_profile(
        self,
        user_id: str,
        data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Create user profile."""
        try:
            profile_data = {
                "user_id": user_id,
                "risk_tolerance": data.get("risk_tolerance", "moderate"),
                "investment_experience": data.get("investment_experience", "beginner"),
                "investment_horizon": data.get("investment_horizon", "medium_term"),
                "monthly_investment_capacity": data.get("monthly_investment_capacity"),
                "primary_goal": data.get("primary_goal"),
                "interested_sectors": data.get("interested_sectors", []),
                "interested_commodities": data.get("interested_commodities", []),
                "notification_preferences": data.get("notification_preferences", {}),
                "onboarding_completed": data.get("onboarding_completed", False),
            }

            result = self.db.table("user_profiles").insert(profile_data).execute()
            return result.data[0] if result.data else {}

        except Exception as e:
            logger.error(f"Error creating profile: {e}")
            raise

    async def update_profile(
        self,
        user_id: str,
        data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Update user profile."""
        try:
            # Check if profile exists
            existing = await self.get_profile(user_id)

            if existing:
                result = self.db.table("user_profiles").update(data).eq(
                    "user_id", user_id
                ).execute()
            else:
                result = await self.create_profile(user_id, data)
                return result

            return result.data[0] if result.data else {}

        except Exception as e:
            logger.error(f"Error updating profile: {e}")
            raise

    async def complete_onboarding(
        self,
        user_id: str,
        onboarding_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Complete user onboarding."""
        onboarding_data["onboarding_completed"] = True
        return await self.update_profile(user_id, onboarding_data)

    def calculate_risk_score(self, profile: Dict[str, Any]) -> float:
        """
        Calculate numerical risk score from profile.
        Score ranges from 0 (very conservative) to 100 (very aggressive).
        """
        score = 50.0  # Start at neutral

        # Risk tolerance
        risk_tolerance = profile.get("risk_tolerance", "moderate")
        if risk_tolerance == "conservative":
            score -= 20
        elif risk_tolerance == "aggressive":
            score += 20

        # Experience
        experience = profile.get("investment_experience", "beginner")
        experience_scores = {
            "beginner": -10,
            "intermediate": 0,
            "advanced": 10,
            "expert": 15,
        }
        score += experience_scores.get(experience, 0)

        # Horizon
        horizon = profile.get("investment_horizon", "medium_term")
        horizon_scores = {
            "short_term": -15,
            "medium_term": 0,
            "long_term": 15,
        }
        score += horizon_scores.get(horizon, 0)

        return max(0, min(100, score))

    async def get_recommended_stocks(
        self,
        user_id: str,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Get personalized stock recommendations based on user profile.
        """
        profile = await self.get_profile(user_id)
        if not profile:
            return []

        risk_score = self.calculate_risk_score(profile)

        # Build recommendation query based on risk profile
        query = self.db.table("stocks").select(
            "*, companies!inner(id, symbol, name, sector_id)"
        )

        # Filter by interested sectors if specified
        interested_sectors = profile.get("interested_sectors", [])
        if interested_sectors:
            query = query.in_("companies.sector_id", interested_sectors)

        # Apply risk-based filters
        if risk_score < 40:  # Conservative
            # Prefer dividend stocks, lower volatility
            query = query.gte("dividend_yield", 3)
        elif risk_score > 70:  # Aggressive
            # Growth stocks, higher momentum
            query = query.gte("change_percentage", 0)

        query = query.limit(limit)
        result = query.execute()

        return result.data or []

    async def get_recommended_strategy(
        self,
        user_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Get recommended screening strategy based on user profile.
        """
        profile = await self.get_profile(user_id)
        if not profile:
            return None

        risk_score = self.calculate_risk_score(profile)

        # Map risk score to strategy
        if risk_score < 35:
            return {
                "slug": "beginners-safe-start",
                "name": "Beginner's Safe Start",
                "reason": "Based on your conservative risk profile",
            }
        elif risk_score < 50:
            return {
                "slug": "dividend-income",
                "name": "Dividend Income",
                "reason": "Steady income suitable for moderate risk tolerance",
            }
        elif risk_score < 70:
            return {
                "slug": "warren-buffett-style",
                "name": "Warren Buffett Style",
                "reason": "Quality at fair price matches your balanced approach",
            }
        else:
            return {
                "slug": "growth-rockets",
                "name": "Growth Rockets",
                "reason": "High growth potential for aggressive investors",
            }

    async def get_personalized_news(
        self,
        user_id: str,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """
        Get personalized news feed based on user interests.
        """
        profile = await self.get_profile(user_id)

        # Get base news
        query = self.db.table("news_articles").select(
            "*, news_sources(name)"
        ).eq("is_processed", True).order(
            "published_at", desc=True
        ).limit(limit * 2)  # Get more to filter

        result = query.execute()
        articles = result.data or []

        if not profile:
            return articles[:limit]

        # Score and rank articles based on user interests
        interested_sectors = profile.get("interested_sectors", [])
        interested_commodities = profile.get("interested_commodities", [])

        scored_articles = []
        for article in articles:
            score = 1.0

            # Boost for matching categories
            categories = article.get("categories", [])
            tags = article.get("tags", [])

            # Sector matching
            for sector_id in interested_sectors:
                if any(sector_id in str(cat) for cat in categories):
                    score += 0.5

            # Commodity matching
            for commodity_id in interested_commodities:
                if any(commodity_id in str(tag) for tag in tags):
                    score += 0.5

            scored_articles.append((article, score))

        # Sort by score
        scored_articles.sort(key=lambda x: x[1], reverse=True)

        return [a[0] for a in scored_articles[:limit]]

    def get_risk_profiles(self) -> List[Dict[str, Any]]:
        """Get available risk tolerance options."""
        return [
            {
                "code": "conservative",
                "name": "Conservative",
                "description": "Prefer stable returns with minimal risk. Focus on capital preservation.",
                "suitable_for": "Risk-averse investors, near retirement, emergency funds",
            },
            {
                "code": "moderate",
                "name": "Moderate",
                "description": "Balance between growth and safety. Accept some volatility.",
                "suitable_for": "Most investors with medium-term goals",
            },
            {
                "code": "aggressive",
                "name": "Aggressive",
                "description": "Seek high growth, accept higher risk and volatility.",
                "suitable_for": "Young investors, long-term horizons, high income",
            },
        ]

    def get_experience_levels(self) -> List[Dict[str, Any]]:
        """Get available experience level options."""
        return [
            {
                "code": "beginner",
                "name": "Beginner",
                "description": "New to investing, learning the basics",
            },
            {
                "code": "intermediate",
                "name": "Intermediate",
                "description": "Some experience, understand basic concepts",
            },
            {
                "code": "advanced",
                "name": "Advanced",
                "description": "Good understanding, actively managing portfolio",
            },
            {
                "code": "expert",
                "name": "Expert",
                "description": "Deep knowledge, complex strategies",
            },
        ]

    def get_goal_types(self) -> List[Dict[str, Any]]:
        """Get available goal types."""
        return GOAL_TYPES
