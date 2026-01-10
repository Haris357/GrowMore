"""Portfolio Report Email Template."""

from typing import List, Dict, Any
from app.email.templates.base import get_base_template


def get_portfolio_report_email(
    user_name: str,
    report_period: str,
    total_value: str,
    total_invested: str,
    total_gain_loss: str,
    gain_loss_pct: str,
    is_positive: bool,
    holdings: List[Dict[str, Any]],
    sector_allocation: List[Dict[str, Any]],
    performance_vs_kse100: str,
    outperformed: bool,
    top_performer: Dict[str, Any],
    worst_performer: Dict[str, Any],
    app_url: str = "https://growmore.pk",
) -> tuple[str, str]:
    """
    Generate monthly portfolio report email.

    Args:
        user_name: User's display name
        report_period: Report period string (e.g., "January 2025")
        total_value: Total portfolio value
        total_invested: Total invested amount
        total_gain_loss: Total gain/loss amount
        gain_loss_pct: Gain/loss percentage
        is_positive: Whether overall is positive
        holdings: List of holdings with symbol, name, value, change_pct
        sector_allocation: List of sectors with name, percentage
        performance_vs_kse100: Performance vs KSE-100 text
        outperformed: Whether portfolio outperformed KSE-100
        top_performer: Best performing holding
        worst_performer: Worst performing holding
        app_url: Application URL

    Returns:
        Tuple of (subject, html_content)
    """
    subject = f"📈 Your Portfolio Report - {report_period}"

    change_class = "positive" if is_positive else "negative"
    change_symbol = "+" if is_positive else ""
    perf_class = "positive" if outperformed else "negative"

    # Holdings table
    holdings_html = ""
    for h in holdings[:10]:
        h_class = "positive" if h.get("change_pct", 0) >= 0 else "negative"
        h_symbol = "+" if h.get("change_pct", 0) >= 0 else ""
        holdings_html += f"""
        <tr>
            <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb;">
                <strong>{h.get('symbol', 'N/A')}</strong>
                <div style="font-size: 12px; color: #6b7280;">{h.get('name', '')[:20]}</div>
            </td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                {h.get('value', 'N/A')}
            </td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                <span class="{h_class}">{h_symbol}{h.get('change_pct', 0):.1f}%</span>
            </td>
        </tr>
        """

    # Sector allocation
    sector_html = ""
    for s in sector_allocation[:5]:
        sector_html += f"""
        <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="font-size: 14px;">{s.get('name', 'Other')}</span>
                <span style="font-size: 14px; font-weight: 600;">{s.get('percentage', 0):.1f}%</span>
            </div>
            <div style="background: #e5e7eb; border-radius: 4px; height: 8px; overflow: hidden;">
                <div style="background: #10b981; height: 100%; width: {s.get('percentage', 0)}%;"></div>
            </div>
        </div>
        """

    content = f"""
    <h2>Monthly Portfolio Report 📈</h2>

    <p>Hi {user_name}, here's your detailed portfolio report for <strong>{report_period}</strong></p>

    <div class="stat-card" style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <div class="stat-label">Portfolio Value</div>
                <div class="stat-value">{total_value}</div>
            </div>
            <div>
                <div class="stat-label">Total Invested</div>
                <div style="font-size: 24px; font-weight: 600; color: #374151;">{total_invested}</div>
            </div>
        </div>
        <div class="divider"></div>
        <div style="text-align: center;">
            <div class="stat-label">Total Gain/Loss</div>
            <div class="{change_class}" style="font-size: 28px; font-weight: 700;">
                {change_symbol}{total_gain_loss}
            </div>
            <div class="{change_class}" style="font-size: 16px;">
                ({change_symbol}{gain_loss_pct}%)
            </div>
        </div>
    </div>

    <div class="highlight">
        <strong>📊 vs KSE-100 Index:</strong>
        <p class="{perf_class}" style="margin-top: 8px; margin-bottom: 0; font-size: 16px;">
            {performance_vs_kse100}
        </p>
    </div>

    <h3>🏆 Performance Highlights</h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <div style="background: #ecfdf5; padding: 16px; border-radius: 8px;">
            <div style="font-size: 12px; color: #047857; margin-bottom: 4px;">Best Performer</div>
            <div style="font-weight: 600;">{top_performer.get('symbol', 'N/A')}</div>
            <div class="positive" style="font-size: 18px; font-weight: 700;">
                +{top_performer.get('change_pct', 0):.1f}%
            </div>
        </div>
        <div style="background: #fef2f2; padding: 16px; border-radius: 8px;">
            <div style="font-size: 12px; color: #b91c1c; margin-bottom: 4px;">Needs Attention</div>
            <div style="font-weight: 600;">{worst_performer.get('symbol', 'N/A')}</div>
            <div class="negative" style="font-size: 18px; font-weight: 700;">
                {worst_performer.get('change_pct', 0):.1f}%
            </div>
        </div>
    </div>

    <h3>📋 Holdings Summary</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
            <tr style="background-color: #f9fafb;">
                <th style="padding: 10px 8px; text-align: left; font-size: 12px; color: #6b7280;">Stock</th>
                <th style="padding: 10px 8px; text-align: right; font-size: 12px; color: #6b7280;">Value</th>
                <th style="padding: 10px 8px; text-align: right; font-size: 12px; color: #6b7280;">Change</th>
            </tr>
        </thead>
        <tbody>
            {holdings_html if holdings_html else '<tr><td colspan="3" style="padding: 16px; text-align: center; color: #6b7280;">No holdings</td></tr>'}
        </tbody>
    </table>

    <h3>🥧 Sector Allocation</h3>
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
        {sector_html if sector_html else '<p style="margin: 0; color: #6b7280;">No sector data available</p>'}
    </div>

    <p style="text-align: center; margin: 32px 0;">
        <a href="{app_url}/portfolio" class="button">View Full Details</a>
    </p>

    <div class="info-box">
        <strong>💡 Monthly Tips:</strong>
        <ul style="margin-bottom: 0;">
            <li>Review your asset allocation quarterly</li>
            <li>Rebalance if any sector exceeds 30% of portfolio</li>
            <li>Consider tax implications before selling</li>
            <li>Stay consistent with your investment strategy</li>
        </ul>
    </div>

    <div class="divider"></div>

    <p style="font-size: 13px; color: #6b7280; text-align: center;">
        <a href="{app_url}/exports/portfolio/pdf">Download PDF Report</a> •
        <a href="{app_url}/settings/notifications">Manage preferences</a>
    </p>
    """

    html = get_base_template(content, "Portfolio Report", app_url)
    return subject, html
