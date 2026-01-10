"""News Roundup Email Template."""

from typing import List, Dict, Any
from app.email.templates.base import get_base_template


def get_news_roundup_email(
    user_name: str,
    date_range: str,
    top_stories: List[Dict[str, Any]],
    market_highlights: List[str],
    sector_updates: Dict[str, str],
    app_url: str = "https://growmore.pk",
) -> tuple[str, str]:
    """
    Generate weekly news roundup email.

    Args:
        user_name: User's display name
        date_range: Date range string
        top_stories: List of top news stories with title, summary, impact, url
        market_highlights: List of market highlight bullets
        sector_updates: Dict of sector name to update text
        app_url: Application URL

    Returns:
        Tuple of (subject, html_content)
    """
    subject = f"📰 GrowNews Weekly Roundup - {date_range}"

    # Generate stories HTML
    stories_html = ""
    for i, story in enumerate(top_stories[:5]):
        impact_color = {
            "high": "#ef4444",
            "medium": "#f59e0b",
            "low": "#10b981",
        }.get(story.get("impact", "medium"), "#6b7280")

        stories_html += f"""
        <div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e5e7eb;">
            <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #111827;">
                {story.get('title', 'Untitled')}
            </h4>
            <p style="margin: 0 0 12px 0; color: #4b5563; font-size: 14px; line-height: 1.5;">
                {story.get('summary', '')[:200]}...
            </p>
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 12px; color: {impact_color}; font-weight: 600;">
                    Impact: {story.get('impact', 'Medium').title()}
                </span>
                <span style="color: #d1d5db;">•</span>
                <span style="font-size: 12px; color: #6b7280;">
                    {story.get('source', '')}
                </span>
                <a href="{story.get('url', app_url + '/news')}" style="font-size: 12px; margin-left: auto;">
                    Read more →
                </a>
            </div>
        </div>
        """

    # Generate highlights HTML
    highlights_html = ""
    for highlight in market_highlights[:5]:
        highlights_html += f"<li style='margin-bottom: 8px;'>{highlight}</li>"

    # Generate sector updates HTML
    sector_html = ""
    for sector, update in list(sector_updates.items())[:4]:
        sector_html += f"""
        <div style="margin-bottom: 12px;">
            <strong style="color: #10b981;">{sector}:</strong>
            <span style="color: #4b5563;"> {update}</span>
        </div>
        """

    content = f"""
    <h2>Weekly News Roundup 📰</h2>

    <p>Hi {user_name}, here are the top investment stories from <strong>{date_range}</strong></p>

    <div class="divider"></div>

    <h3>🔥 Top Stories</h3>
    {stories_html if stories_html else '<p style="color: #6b7280;">No major stories this week</p>'}

    <div class="highlight">
        <h3 style="margin-top: 0;">📊 Market Highlights</h3>
        <ul style="margin-bottom: 0;">
            {highlights_html if highlights_html else '<li>Market was relatively stable this week</li>'}
        </ul>
    </div>

    <h3>📈 Sector Updates</h3>
    <div class="info-box">
        {sector_html if sector_html else '<p style="margin: 0;">No significant sector movements</p>'}
    </div>

    <p style="text-align: center; margin: 32px 0;">
        <a href="{app_url}/news" class="button">Read All News</a>
    </p>

    <div class="divider"></div>

    <p style="font-size: 13px; color: #6b7280; text-align: center;">
        Curated by GrowNews AI • <a href="{app_url}/settings/notifications">Manage preferences</a>
    </p>
    """

    html = get_base_template(content, "News Roundup", app_url)
    return subject, html
