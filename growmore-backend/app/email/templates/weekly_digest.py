"""Weekly Digest Email Template."""

from typing import List, Dict, Any
from app.email.templates.base import get_base_template


def get_weekly_digest_email(
    user_name: str,
    week_range: str,
    portfolio_value: str,
    portfolio_change: str,
    portfolio_change_pct: str,
    is_positive: bool,
    top_gainers: List[Dict[str, Any]],
    top_losers: List[Dict[str, Any]],
    market_summary: str,
    kse100_value: str,
    kse100_change_pct: str,
    kse100_positive: bool,
    gold_price: str,
    gold_change_pct: str,
    gold_positive: bool,
    app_url: str = "https://growmore.pk",
) -> tuple[str, str]:
    """
    Generate weekly portfolio digest email.

    Args:
        user_name: User's display name
        week_range: Date range string (e.g., "Jan 1 - Jan 7, 2025")
        portfolio_value: Current portfolio value
        portfolio_change: Portfolio change amount
        portfolio_change_pct: Portfolio change percentage
        is_positive: Whether portfolio change is positive
        top_gainers: List of top gaining stocks
        top_losers: List of top losing stocks
        market_summary: AI-generated market summary
        kse100_value: KSE-100 index value
        kse100_change_pct: KSE-100 change percentage
        kse100_positive: Whether KSE-100 change is positive
        gold_price: Gold price per tola
        gold_change_pct: Gold price change percentage
        gold_positive: Whether gold change is positive
        app_url: Application URL

    Returns:
        Tuple of (subject, html_content)
    """
    subject = f"📊 Your Weekly Investment Digest - {week_range}"

    change_class = "positive" if is_positive else "negative"
    change_symbol = "+" if is_positive else ""

    kse_class = "positive" if kse100_positive else "negative"
    kse_symbol = "+" if kse100_positive else ""

    gold_class = "positive" if gold_positive else "negative"
    gold_symbol = "+" if gold_positive else ""

    # Generate gainers HTML
    gainers_html = ""
    for g in top_gainers[:5]:
        gainers_html += f"""
        <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong>{g.get('symbol', 'N/A')}</strong>
            </td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                <span class="positive">+{g.get('change_pct', 0):.1f}%</span>
            </td>
        </tr>
        """

    # Generate losers HTML
    losers_html = ""
    for l in top_losers[:5]:
        losers_html += f"""
        <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <strong>{l.get('symbol', 'N/A')}</strong>
            </td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                <span class="negative">{l.get('change_pct', 0):.1f}%</span>
            </td>
        </tr>
        """

    content = f"""
    <h2>Weekly Investment Digest 📊</h2>

    <p>Hi {user_name}, here's your investment summary for <strong>{week_range}</strong></p>

    <div class="stat-card">
        <div class="stat-label">Your Portfolio Value</div>
        <div class="stat-value">{portfolio_value}</div>
        <p class="{change_class}" style="margin-top: 8px; margin-bottom: 0; font-size: 16px;">
            {change_symbol}{portfolio_change} ({change_symbol}{portfolio_change_pct}%) this week
        </p>
    </div>

    <div style="display: flex; gap: 16px; margin: 20px 0;">
        <div style="flex: 1; background-color: #f9fafb; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #6b7280;">KSE-100</div>
            <div style="font-size: 18px; font-weight: 600; margin: 4px 0;">{kse100_value}</div>
            <div class="{kse_class}" style="font-size: 14px;">{kse_symbol}{kse100_change_pct}%</div>
        </div>
        <div style="flex: 1; background-color: #f9fafb; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #6b7280;">Gold/Tola</div>
            <div style="font-size: 18px; font-weight: 600; margin: 4px 0;">{gold_price}</div>
            <div class="{gold_class}" style="font-size: 14px;">{gold_symbol}{gold_change_pct}%</div>
        </div>
    </div>

    <div class="divider"></div>

    <h3>🏆 Top Gainers (Your Holdings)</h3>
    <table style="width: 100%; border-collapse: collapse;">
        {gainers_html if gainers_html else '<tr><td style="color: #6b7280;">No significant gainers this week</td></tr>'}
    </table>

    <h3>📉 Top Losers (Your Holdings)</h3>
    <table style="width: 100%; border-collapse: collapse;">
        {losers_html if losers_html else '<tr><td style="color: #6b7280;">No significant losers this week</td></tr>'}
    </table>

    <div class="divider"></div>

    <h3>📰 Market Summary</h3>
    <div class="info-box">
        <p style="margin: 0;">{market_summary}</p>
    </div>

    <p style="text-align: center; margin: 32px 0;">
        <a href="{app_url}/dashboard" class="button">View Full Report</a>
    </p>

    <div class="divider"></div>

    <p style="font-size: 13px; color: #6b7280; text-align: center;">
        You're receiving this digest because you're subscribed to weekly updates.
        <a href="{app_url}/settings/notifications">Manage preferences</a>
    </p>
    """

    html = get_base_template(content, "Weekly Digest", app_url)
    return subject, html
