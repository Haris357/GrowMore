"""Price Alert Email Template."""

from app.email.templates.base import get_base_template


def get_price_alert_email(
    user_name: str,
    symbol: str,
    company_name: str,
    alert_type: str,
    target_price: str,
    current_price: str,
    change_pct: str,
    is_positive: bool,
    app_url: str = "https://growmore.pk",
) -> tuple[str, str]:
    """
    Generate price alert triggered email.

    Args:
        user_name: User's display name
        symbol: Stock symbol
        company_name: Company name
        alert_type: Type of alert (price_above, price_below, etc.)
        target_price: Alert target price
        current_price: Current stock price
        change_pct: Price change percentage
        is_positive: Whether change is positive
        app_url: Application URL

    Returns:
        Tuple of (subject, html_content)
    """
    subject = f"🔔 Price Alert: {symbol} hit your target!"

    change_class = "positive" if is_positive else "negative"
    change_symbol = "+" if is_positive else ""

    # Determine alert description
    alert_descriptions = {
        "price_above": f"rose above your target of {target_price}",
        "price_below": f"fell below your target of {target_price}",
        "change_above": f"increased by more than {target_price}%",
        "change_below": f"decreased by more than {target_price}%",
        "new_high": "reached a new 52-week high",
        "new_low": "reached a new 52-week low",
    }
    alert_desc = alert_descriptions.get(alert_type, f"hit your target of {target_price}")

    content = f"""
    <h2>Price Alert Triggered! 🎯</h2>

    <p>Hi {user_name},</p>

    <p>Great news! Your price alert for <strong>{symbol}</strong> has been triggered.</p>

    <div class="stat-card">
        <div class="stat-label">{company_name} ({symbol})</div>
        <div class="stat-value">{current_price}</div>
        <p class="{change_class}" style="margin-top: 8px; margin-bottom: 0;">
            {change_symbol}{change_pct}% today
        </p>
    </div>

    <div class="highlight">
        <strong>Alert Details:</strong>
        <p style="margin-top: 8px; margin-bottom: 0;">
            {symbol} {alert_desc}
        </p>
    </div>

    <p style="text-align: center; margin: 32px 0;">
        <a href="{app_url}/stocks/{symbol}" class="button">View {symbol}</a>
    </p>

    <div class="info-box">
        <strong>📊 What now?</strong>
        <ul style="margin-bottom: 0;">
            <li>Review the stock's recent performance</li>
            <li>Check related news and analysis</li>
            <li>Consider your investment strategy</li>
            <li>Set a new alert if needed</li>
        </ul>
    </div>

    <div class="divider"></div>

    <p style="font-size: 13px; color: #6b7280;">
        This alert has been automatically deactivated.
        <a href="{app_url}/watchlist">Manage your alerts</a> to create new ones.
    </p>
    """

    html = get_base_template(content, "Price Alert", app_url)
    return subject, html
