"""Email Sender Service.

High-level service for sending all types of application emails.
"""

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

from app.email.client import email_client
from app.email.templates import (
    get_welcome_email,
    get_login_alert_email,
    get_password_reset_email,
    get_password_changed_email,
    get_price_alert_email,
    get_goal_achieved_email,
    get_goal_milestone_email,
    get_weekly_digest_email,
    get_news_roundup_email,
    get_portfolio_report_email,
)
from app.config.settings import settings

logger = logging.getLogger(__name__)


class EmailSender:
    """High-level email sending service."""

    def __init__(self):
        self.client = email_client
        self.app_url = getattr(settings, "APP_URL", "https://growmore.pk")
        self.from_email = getattr(settings, "EMAIL_FROM", "noreply@growmore.pk")

    async def send_welcome_email(self, user: Dict[str, Any]) -> bool:
        """
        Send welcome email to new user.

        Args:
            user: User dict with email, display_name

        Returns:
            True if sent successfully
        """
        try:
            user_name = user.get("display_name") or user.get("email", "").split("@")[0]
            subject, html = get_welcome_email(user_name, self.app_url)

            result = await self.client.send(
                to=user["email"],
                subject=subject,
                html=html,
                tags=[{"name": "type", "value": "welcome"}],
            )
            return result.get("success", False)
        except Exception as e:
            logger.error(f"Failed to send welcome email: {e}")
            return False

    async def send_login_alert(
        self,
        user: Dict[str, Any],
        device_info: Dict[str, Any],
        ip_address: str,
        location: str,
    ) -> bool:
        """
        Send login alert for new device/location.

        Args:
            user: User dict with email, display_name
            device_info: Dict with device, browser info
            ip_address: Login IP address
            location: Location string (city, country)

        Returns:
            True if sent successfully
        """
        try:
            user_name = user.get("display_name") or user.get("email", "").split("@")[0]
            subject, html = get_login_alert_email(
                user_name=user_name,
                device=device_info.get("device", "Unknown Device"),
                browser=device_info.get("browser", "Unknown Browser"),
                ip_address=ip_address,
                location=location,
                login_time=datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC"),
                app_url=self.app_url,
            )

            result = await self.client.send(
                to=user["email"],
                subject=subject,
                html=html,
                tags=[{"name": "type", "value": "security"}],
            )
            return result.get("success", False)
        except Exception as e:
            logger.error(f"Failed to send login alert: {e}")
            return False

    async def send_new_device_alert(
        self,
        user: Dict[str, Any],
        device_info: Dict[str, Any],
    ) -> bool:
        """
        Send alert for new device login.

        Args:
            user: User dict with email, display_name
            device_info: Dict with device details

        Returns:
            True if sent successfully
        """
        return await self.send_login_alert(
            user=user,
            device_info=device_info,
            ip_address=device_info.get("ip_address", "Unknown"),
            location=device_info.get("location", "Unknown Location"),
        )

    async def send_password_reset(
        self,
        user: Dict[str, Any],
        reset_token: str,
        expiry_minutes: int = 60,
    ) -> bool:
        """
        Send password reset email.

        Args:
            user: User dict with email, display_name
            reset_token: Password reset token
            expiry_minutes: Token expiry in minutes

        Returns:
            True if sent successfully
        """
        try:
            user_name = user.get("display_name") or user.get("email", "").split("@")[0]
            reset_link = f"{self.app_url}/reset-password?token={reset_token}"

            subject, html = get_password_reset_email(
                user_name=user_name,
                reset_link=reset_link,
                expiry_minutes=expiry_minutes,
                app_url=self.app_url,
            )

            result = await self.client.send(
                to=user["email"],
                subject=subject,
                html=html,
                tags=[{"name": "type", "value": "password_reset"}],
            )
            return result.get("success", False)
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
            return False

    async def send_password_changed(self, user: Dict[str, Any]) -> bool:
        """
        Send password changed confirmation.

        Args:
            user: User dict with email, display_name

        Returns:
            True if sent successfully
        """
        try:
            user_name = user.get("display_name") or user.get("email", "").split("@")[0]
            subject, html = get_password_changed_email(
                user_name=user_name,
                change_time=datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC"),
                app_url=self.app_url,
            )

            result = await self.client.send(
                to=user["email"],
                subject=subject,
                html=html,
                tags=[{"name": "type", "value": "security"}],
            )
            return result.get("success", False)
        except Exception as e:
            logger.error(f"Failed to send password changed email: {e}")
            return False

    async def send_price_alert_triggered(
        self,
        user: Dict[str, Any],
        alert: Dict[str, Any],
        current_price: float,
    ) -> bool:
        """
        Send price alert triggered notification.

        Args:
            user: User dict with email, display_name
            alert: Alert dict with symbol, target_price, alert_type
            current_price: Current stock price

        Returns:
            True if sent successfully
        """
        try:
            user_name = user.get("display_name") or user.get("email", "").split("@")[0]
            target_price = float(alert.get("target_price", 0))
            change_pct = ((current_price - target_price) / target_price * 100) if target_price else 0

            subject, html = get_price_alert_email(
                user_name=user_name,
                symbol=alert.get("symbol", "N/A"),
                company_name=alert.get("company_name", alert.get("symbol", "")),
                alert_type=alert.get("alert_type", "price_above"),
                target_price=f"PKR {target_price:,.2f}",
                current_price=f"PKR {current_price:,.2f}",
                change_pct=abs(change_pct),
                is_positive=current_price >= target_price,
                app_url=self.app_url,
            )

            result = await self.client.send(
                to=user["email"],
                subject=subject,
                html=html,
                tags=[{"name": "type", "value": "price_alert"}],
            )
            return result.get("success", False)
        except Exception as e:
            logger.error(f"Failed to send price alert email: {e}")
            return False

    async def send_goal_milestone(
        self,
        user: Dict[str, Any],
        goal: Dict[str, Any],
        milestone_percent: int,
    ) -> bool:
        """
        Send goal milestone notification.

        Args:
            user: User dict with email, display_name
            goal: Goal dict with name, current_amount, target_amount
            milestone_percent: Milestone percentage (25, 50, 75)

        Returns:
            True if sent successfully
        """
        try:
            user_name = user.get("display_name") or user.get("email", "").split("@")[0]
            current = float(goal.get("current_amount", 0))
            target = float(goal.get("target_amount", 0))
            remaining = max(0, target - current)

            subject, html = get_goal_milestone_email(
                user_name=user_name,
                goal_name=goal.get("name", "Your Goal"),
                milestone_percent=milestone_percent,
                current_amount=f"PKR {current:,.0f}",
                target_amount=f"PKR {target:,.0f}",
                remaining_amount=f"PKR {remaining:,.0f}",
                app_url=self.app_url,
            )

            result = await self.client.send(
                to=user["email"],
                subject=subject,
                html=html,
                tags=[{"name": "type", "value": "goal_milestone"}],
            )
            return result.get("success", False)
        except Exception as e:
            logger.error(f"Failed to send goal milestone email: {e}")
            return False

    async def send_goal_achieved(
        self,
        user: Dict[str, Any],
        goal: Dict[str, Any],
    ) -> bool:
        """
        Send goal achieved notification.

        Args:
            user: User dict with email, display_name
            goal: Goal dict with name, target_amount, created_at

        Returns:
            True if sent successfully
        """
        try:
            user_name = user.get("display_name") or user.get("email", "").split("@")[0]
            target = float(goal.get("target_amount", 0))

            # Calculate days taken
            created_at = goal.get("created_at")
            if created_at:
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                days_taken = (datetime.utcnow() - created_at.replace(tzinfo=None)).days
            else:
                days_taken = 0

            subject, html = get_goal_achieved_email(
                user_name=user_name,
                goal_name=goal.get("name", "Your Goal"),
                target_amount=f"PKR {target:,.0f}",
                achieved_date=datetime.utcnow().strftime("%B %d, %Y"),
                days_taken=days_taken,
                app_url=self.app_url,
            )

            result = await self.client.send(
                to=user["email"],
                subject=subject,
                html=html,
                tags=[{"name": "type", "value": "goal_achieved"}],
            )
            return result.get("success", False)
        except Exception as e:
            logger.error(f"Failed to send goal achieved email: {e}")
            return False

    async def send_weekly_digest(
        self,
        user: Dict[str, Any],
        digest_data: Dict[str, Any],
    ) -> bool:
        """
        Send weekly portfolio digest.

        Args:
            user: User dict with email, display_name
            digest_data: Dict with portfolio and market data

        Returns:
            True if sent successfully
        """
        try:
            user_name = user.get("display_name") or user.get("email", "").split("@")[0]

            subject, html = get_weekly_digest_email(
                user_name=user_name,
                week_start=digest_data.get("week_start", ""),
                week_end=digest_data.get("week_end", ""),
                portfolio_value=digest_data.get("portfolio_value", "PKR 0"),
                weekly_change=digest_data.get("weekly_change", "PKR 0"),
                weekly_change_pct=digest_data.get("weekly_change_pct", "0"),
                is_positive=digest_data.get("is_positive", True),
                top_gainers=digest_data.get("top_gainers", []),
                top_losers=digest_data.get("top_losers", []),
                market_summary=digest_data.get("market_summary", {}),
                app_url=self.app_url,
            )

            result = await self.client.send(
                to=user["email"],
                subject=subject,
                html=html,
                tags=[{"name": "type", "value": "weekly_digest"}],
            )
            return result.get("success", False)
        except Exception as e:
            logger.error(f"Failed to send weekly digest: {e}")
            return False

    async def send_news_roundup(
        self,
        user: Dict[str, Any],
        news_items: List[Dict[str, Any]],
    ) -> bool:
        """
        Send weekly news roundup.

        Args:
            user: User dict with email, display_name
            news_items: List of news dicts

        Returns:
            True if sent successfully
        """
        try:
            user_name = user.get("display_name") or user.get("email", "").split("@")[0]

            # Separate news by category
            top_stories = [n for n in news_items if n.get("is_featured")][:3]
            if not top_stories:
                top_stories = news_items[:3]

            market_highlights = [
                n for n in news_items
                if n.get("category") in ["market", "stocks", "index"]
            ][:3]

            sector_updates = [
                n for n in news_items
                if n.get("category") in ["sector", "industry"]
            ][:3]

            subject, html = get_news_roundup_email(
                user_name=user_name,
                week_date=datetime.utcnow().strftime("%B %d, %Y"),
                top_stories=top_stories,
                market_highlights=market_highlights,
                sector_updates=sector_updates,
                app_url=self.app_url,
            )

            result = await self.client.send(
                to=user["email"],
                subject=subject,
                html=html,
                tags=[{"name": "type", "value": "news_roundup"}],
            )
            return result.get("success", False)
        except Exception as e:
            logger.error(f"Failed to send news roundup: {e}")
            return False

    async def send_portfolio_report(
        self,
        user: Dict[str, Any],
        report_data: Dict[str, Any],
    ) -> bool:
        """
        Send monthly portfolio report.

        Args:
            user: User dict with email, display_name
            report_data: Dict with comprehensive portfolio data

        Returns:
            True if sent successfully
        """
        try:
            user_name = user.get("display_name") or user.get("email", "").split("@")[0]

            subject, html = get_portfolio_report_email(
                user_name=user_name,
                report_period=report_data.get("report_period", datetime.utcnow().strftime("%B %Y")),
                total_value=report_data.get("total_value", "PKR 0"),
                total_invested=report_data.get("total_invested", "PKR 0"),
                total_gain_loss=report_data.get("total_gain_loss", "PKR 0"),
                gain_loss_pct=report_data.get("gain_loss_pct", "0"),
                is_positive=report_data.get("is_positive", True),
                holdings=report_data.get("holdings", []),
                sector_allocation=report_data.get("sector_allocation", []),
                performance_vs_kse100=report_data.get("performance_vs_kse100", ""),
                outperformed=report_data.get("outperformed", False),
                top_performer=report_data.get("top_performer", {}),
                worst_performer=report_data.get("worst_performer", {}),
                app_url=self.app_url,
            )

            result = await self.client.send(
                to=user["email"],
                subject=subject,
                html=html,
                tags=[{"name": "type", "value": "portfolio_report"}],
            )
            return result.get("success", False)
        except Exception as e:
            logger.error(f"Failed to send portfolio report: {e}")
            return False

    async def send_newsletter(
        self,
        to: str,
        subject: str,
        html_content: str,
        newsletter_id: Optional[str] = None,
    ) -> bool:
        """
        Send newsletter email.

        Args:
            to: Recipient email
            subject: Email subject
            html_content: Full HTML content
            newsletter_id: Optional newsletter ID for tracking

        Returns:
            True if sent successfully
        """
        try:
            tags = [{"name": "type", "value": "newsletter"}]
            if newsletter_id:
                tags.append({"name": "newsletter_id", "value": newsletter_id})

            result = await self.client.send(
                to=to,
                subject=subject,
                html=html_content,
                tags=tags,
            )
            return result.get("success", False)
        except Exception as e:
            logger.error(f"Failed to send newsletter: {e}")
            return False


# Singleton instance
email_sender = EmailSender()
