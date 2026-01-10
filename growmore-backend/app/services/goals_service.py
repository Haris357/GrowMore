"""
Investment Goals Service.
Track and manage user investment goals.
"""

import logging
from datetime import datetime, date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.db.supabase import get_supabase_service_client

logger = logging.getLogger(__name__)


class GoalsService:
    """
    Investment goals tracking and management service.
    """

    def __init__(self):
        self.db = get_supabase_service_client()

    async def create_goal(
        self,
        user_id: str,
        data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Create a new investment goal."""
        try:
            goal_data = {
                "user_id": user_id,
                "name": data["name"],
                "target_amount": data["target_amount"],
                "current_amount": data.get("current_amount", 0),
                "target_date": data.get("target_date"),
                "goal_type": data["goal_type"],
                "priority": data.get("priority", "medium"),
                "linked_portfolio_id": data.get("linked_portfolio_id"),
                "status": "active",
                "notes": data.get("notes"),
            }

            result = self.db.table("investment_goals").insert(goal_data).execute()
            return result.data[0] if result.data else {}

        except Exception as e:
            logger.error(f"Error creating goal: {e}")
            raise

    async def update_goal(
        self,
        user_id: str,
        goal_id: str,
        data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Update an investment goal."""
        try:
            # Verify ownership
            existing = await self.get_goal(user_id, goal_id)
            if not existing:
                raise ValueError("Goal not found")

            result = self.db.table("investment_goals").update(data).eq(
                "id", goal_id
            ).eq("user_id", user_id).execute()

            return result.data[0] if result.data else {}

        except Exception as e:
            logger.error(f"Error updating goal: {e}")
            raise

    async def delete_goal(self, user_id: str, goal_id: str) -> bool:
        """Delete an investment goal."""
        try:
            self.db.table("investment_goals").delete().eq(
                "id", goal_id
            ).eq("user_id", user_id).execute()
            return True

        except Exception as e:
            logger.error(f"Error deleting goal: {e}")
            return False

    async def get_goal(self, user_id: str, goal_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific goal."""
        try:
            result = self.db.table("investment_goals").select("*").eq(
                "id", goal_id
            ).eq("user_id", user_id).execute()

            return result.data[0] if result.data else None

        except Exception as e:
            logger.error(f"Error getting goal: {e}")
            return None

    async def get_user_goals(
        self,
        user_id: str,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get all goals for a user."""
        try:
            query = self.db.table("investment_goals").select("*").eq(
                "user_id", user_id
            )

            if status:
                query = query.eq("status", status)

            query = query.order("priority").order("created_at", desc=True)
            result = query.execute()

            goals = result.data or []

            # Add progress info to each goal
            for goal in goals:
                progress = self.calculate_progress(goal)
                goal["progress"] = progress

            return goals

        except Exception as e:
            logger.error(f"Error getting user goals: {e}")
            return []

    async def add_contribution(
        self,
        user_id: str,
        goal_id: str,
        amount: float,
        contribution_date: Optional[date] = None,
        source: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Add a contribution to a goal."""
        try:
            # Verify goal ownership
            goal = await self.get_goal(user_id, goal_id)
            if not goal:
                raise ValueError("Goal not found")

            # Add contribution record
            contribution_data = {
                "goal_id": goal_id,
                "amount": amount,
                "contribution_date": (contribution_date or date.today()).isoformat(),
                "source": source,
                "notes": notes,
            }

            self.db.table("goal_contributions").insert(contribution_data).execute()

            # Update goal current amount
            new_amount = float(goal.get("current_amount", 0)) + amount

            # Check if goal achieved
            target = float(goal.get("target_amount", 0))
            new_status = "achieved" if new_amount >= target else goal.get("status", "active")

            update_data = {"current_amount": new_amount}
            if new_status == "achieved":
                update_data["status"] = "achieved"

            result = self.db.table("investment_goals").update(update_data).eq(
                "id", goal_id
            ).execute()

            return result.data[0] if result.data else {}

        except Exception as e:
            logger.error(f"Error adding contribution: {e}")
            raise

    async def get_contributions(
        self,
        user_id: str,
        goal_id: str,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Get contributions for a goal."""
        try:
            # Verify goal ownership
            goal = await self.get_goal(user_id, goal_id)
            if not goal:
                return []

            result = self.db.table("goal_contributions").select("*").eq(
                "goal_id", goal_id
            ).order("contribution_date", desc=True).limit(limit).execute()

            return result.data or []

        except Exception as e:
            logger.error(f"Error getting contributions: {e}")
            return []

    def calculate_progress(self, goal: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate goal progress metrics."""
        current = Decimal(str(goal.get("current_amount", 0)))
        target = Decimal(str(goal.get("target_amount", 1)))
        target_date_str = goal.get("target_date")

        # Percentage progress
        percentage = (current / target * 100) if target > 0 else Decimal("0")
        percentage = min(percentage, Decimal("100"))

        # Remaining amount
        remaining = max(target - current, Decimal("0"))

        # Time-based calculations
        days_remaining = None
        on_track = None
        required_monthly = None

        if target_date_str:
            try:
                target_date = datetime.fromisoformat(target_date_str).date() if isinstance(
                    target_date_str, str
                ) else target_date_str

                today = date.today()
                days_remaining = (target_date - today).days

                if days_remaining > 0:
                    months_remaining = max(days_remaining / 30, 1)
                    required_monthly = remaining / Decimal(str(months_remaining))

                    # Calculate if on track (simple linear projection)
                    total_days = (target_date - goal.get("created_at", today).date() if isinstance(
                        goal.get("created_at"), datetime
                    ) else (target_date - today)).days
                    days_elapsed = total_days - days_remaining

                    if days_elapsed > 0 and total_days > 0:
                        expected_progress = (Decimal(str(days_elapsed)) / Decimal(str(total_days))) * 100
                        on_track = percentage >= expected_progress * Decimal("0.9")  # 10% tolerance
            except Exception as e:
                logger.debug(f"Error calculating time progress: {e}")

        return {
            "percentage": float(percentage.quantize(Decimal("0.1"), ROUND_HALF_UP)),
            "current_amount": float(current),
            "target_amount": float(target),
            "remaining_amount": float(remaining.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "days_remaining": days_remaining,
            "on_track": on_track,
            "required_monthly": float(required_monthly.quantize(Decimal("0.01"), ROUND_HALF_UP)) if required_monthly else None,
            "is_achieved": goal.get("status") == "achieved" or current >= target,
        }

    async def get_goal_progress(
        self,
        user_id: str,
        goal_id: str,
    ) -> Dict[str, Any]:
        """Get detailed progress report for a goal."""
        goal = await self.get_goal(user_id, goal_id)
        if not goal:
            return {"error": "Goal not found"}

        # Get contributions history
        contributions = await self.get_contributions(user_id, goal_id, limit=100)

        # Calculate progress
        progress = self.calculate_progress(goal)

        # Monthly contribution summary
        monthly_contributions = {}
        for contrib in contributions:
            date_str = contrib.get("contribution_date", "")
            if date_str:
                month_key = date_str[:7]  # YYYY-MM
                monthly_contributions[month_key] = monthly_contributions.get(month_key, 0) + float(
                    contrib.get("amount", 0)
                )

        # Sort by month
        monthly_breakdown = [
            {"month": k, "amount": v}
            for k, v in sorted(monthly_contributions.items(), reverse=True)
        ]

        return {
            "goal": goal,
            "progress": progress,
            "total_contributions": len(contributions),
            "monthly_breakdown": monthly_breakdown[:12],
            "recent_contributions": contributions[:5],
        }

    async def get_projected_completion(
        self,
        user_id: str,
        goal_id: str,
        monthly_contribution: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Project when a goal will be achieved."""
        goal = await self.get_goal(user_id, goal_id)
        if not goal:
            return {"error": "Goal not found"}

        current = Decimal(str(goal.get("current_amount", 0)))
        target = Decimal(str(goal.get("target_amount", 0)))
        remaining = target - current

        if remaining <= 0:
            return {
                "already_achieved": True,
                "message": "Goal already achieved!",
            }

        # Calculate average monthly contribution from history
        contributions = await self.get_contributions(user_id, goal_id, limit=100)

        if monthly_contribution:
            avg_monthly = Decimal(str(monthly_contribution))
        elif contributions:
            total_contributed = sum(float(c.get("amount", 0)) for c in contributions)
            months_count = len(set(c.get("contribution_date", "")[:7] for c in contributions))
            avg_monthly = Decimal(str(total_contributed / max(months_count, 1)))
        else:
            return {
                "error": "No contribution history. Please provide expected monthly contribution.",
            }

        if avg_monthly <= 0:
            return {
                "error": "Monthly contribution must be positive",
            }

        # Calculate months to completion
        months_to_complete = remaining / avg_monthly
        projected_date = date.today() + timedelta(days=int(months_to_complete * 30))

        # Compare with target date if set
        target_date = goal.get("target_date")
        will_meet_deadline = None
        if target_date:
            target_dt = datetime.fromisoformat(target_date).date() if isinstance(
                target_date, str
            ) else target_date
            will_meet_deadline = projected_date <= target_dt

        return {
            "current_amount": float(current),
            "target_amount": float(target),
            "remaining_amount": float(remaining),
            "average_monthly_contribution": float(avg_monthly.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "months_to_complete": float(months_to_complete.quantize(Decimal("0.1"), ROUND_HALF_UP)),
            "projected_completion_date": projected_date.isoformat(),
            "target_date": target_date,
            "will_meet_deadline": will_meet_deadline,
        }

    def suggest_monthly_contribution(
        self,
        target_amount: float,
        current_amount: float,
        target_date: date,
    ) -> Dict[str, Any]:
        """Suggest monthly contribution to meet goal."""
        target = Decimal(str(target_amount))
        current = Decimal(str(current_amount))
        remaining = target - current

        if remaining <= 0:
            return {
                "required_monthly": 0,
                "message": "Goal already achieved!",
            }

        days_remaining = (target_date - date.today()).days
        if days_remaining <= 0:
            return {
                "error": "Target date has passed",
            }

        months_remaining = max(Decimal(str(days_remaining)) / Decimal("30"), Decimal("1"))
        required_monthly = remaining / months_remaining

        # Suggest comfortable options
        comfortable = required_monthly * Decimal("0.8")  # 80% of required
        aggressive = required_monthly * Decimal("1.2")   # 120% of required

        return {
            "target_amount": float(target),
            "current_amount": float(current),
            "remaining_amount": float(remaining),
            "months_remaining": float(months_remaining.quantize(Decimal("0.1"), ROUND_HALF_UP)),
            "required_monthly": float(required_monthly.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "comfortable_monthly": float(comfortable.quantize(Decimal("0.01"), ROUND_HALF_UP)),
            "aggressive_monthly": float(aggressive.quantize(Decimal("0.01"), ROUND_HALF_UP)),
        }

    async def get_goals_summary(self, user_id: str) -> Dict[str, Any]:
        """Get summary of all user goals."""
        goals = await self.get_user_goals(user_id)

        total_target = sum(float(g.get("target_amount", 0)) for g in goals)
        total_current = sum(float(g.get("current_amount", 0)) for g in goals)
        total_progress = (total_current / total_target * 100) if total_target > 0 else 0

        active_goals = [g for g in goals if g.get("status") == "active"]
        achieved_goals = [g for g in goals if g.get("status") == "achieved"]

        # Goals needing attention (behind schedule)
        attention_needed = []
        for goal in active_goals:
            progress = goal.get("progress", {})
            if progress.get("on_track") is False:
                attention_needed.append(goal)

        return {
            "total_goals": len(goals),
            "active_goals": len(active_goals),
            "achieved_goals": len(achieved_goals),
            "total_target_amount": round(total_target, 2),
            "total_current_amount": round(total_current, 2),
            "overall_progress_percentage": round(total_progress, 1),
            "goals_needing_attention": len(attention_needed),
            "attention_list": attention_needed[:3],
            "recent_achievements": achieved_goals[:3],
        }
