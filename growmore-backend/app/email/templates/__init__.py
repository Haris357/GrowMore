from app.email.templates.base import get_base_template
from app.email.templates.welcome import get_welcome_email
from app.email.templates.login_alert import get_login_alert_email
from app.email.templates.password_reset import get_password_reset_email, get_password_changed_email
from app.email.templates.price_alert import get_price_alert_email
from app.email.templates.goal_achieved import get_goal_achieved_email, get_goal_milestone_email
from app.email.templates.weekly_digest import get_weekly_digest_email
from app.email.templates.news_roundup import get_news_roundup_email
from app.email.templates.portfolio_report import get_portfolio_report_email

__all__ = [
    "get_base_template",
    "get_welcome_email",
    "get_login_alert_email",
    "get_password_reset_email",
    "get_password_changed_email",
    "get_price_alert_email",
    "get_goal_achieved_email",
    "get_goal_milestone_email",
    "get_weekly_digest_email",
    "get_news_roundup_email",
    "get_portfolio_report_email",
]
