"""Welcome Email Template."""

from app.email.templates.base import get_base_template


def get_welcome_email(user_name: str, app_url: str = "https://growmore.pk") -> tuple[str, str]:
    """
    Generate welcome email for new users.

    Args:
        user_name: User's display name
        app_url: Application URL

    Returns:
        Tuple of (subject, html_content)
    """
    subject = "Welcome to GrowMore! 🎉"

    content = f"""
    <h2>Welcome aboard, {user_name}! 👋</h2>

    <p>We're thrilled to have you join GrowMore - your smart investment companion for the Pakistani market.</p>

    <div class="highlight">
        <strong>Here's what you can do with GrowMore:</strong>
        <ul>
            <li>📊 <strong>Track Investments</strong> - Stocks, Gold, Silver & Bank Products all in one place</li>
            <li>📰 <strong>AI-Powered News</strong> - Get insights via our GrowNews Network</li>
            <li>🎯 <strong>Set Goals</strong> - Create investment goals and track your progress</li>
            <li>🔔 <strong>Price Alerts</strong> - Get notified when stocks hit your target price</li>
            <li>📈 <strong>Stock Screener</strong> - Find opportunities with our powerful filters</li>
            <li>🧮 <strong>Calculators</strong> - Plan your investments with precision</li>
        </ul>
    </div>

    <p style="text-align: center; margin: 32px 0;">
        <a href="{app_url}/dashboard" class="button">Go to Dashboard</a>
    </p>

    <div class="info-box">
        <strong>🚀 Quick Start Tips:</strong>
        <ol>
            <li>Add your first stock to your watchlist</li>
            <li>Set up a price alert for a stock you're interested in</li>
            <li>Create an investment goal to stay motivated</li>
            <li>Explore our stock screener to find opportunities</li>
        </ol>
    </div>

    <p>Need help getting started? Check out our <a href="{app_url}/guide">Quick Start Guide</a> or reach out to our support team.</p>

    <p>Happy investing! 🚀</p>

    <p>
        <strong>The GrowMore Team</strong>
    </p>
    """

    html = get_base_template(content, "Welcome to GrowMore", app_url)
    return subject, html
