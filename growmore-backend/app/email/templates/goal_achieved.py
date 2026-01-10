"""Goal Achieved Email Template."""

from app.email.templates.base import get_base_template


def get_goal_achieved_email(
    user_name: str,
    goal_name: str,
    target_amount: str,
    achieved_date: str,
    days_taken: int,
    app_url: str = "https://growmore.pk",
) -> tuple[str, str]:
    """
    Generate goal achieved celebration email.

    Args:
        user_name: User's display name
        goal_name: Name of the achieved goal
        target_amount: Target amount reached
        achieved_date: Date goal was achieved
        days_taken: Number of days to achieve goal
        app_url: Application URL

    Returns:
        Tuple of (subject, html_content)
    """
    subject = f"🎉 Congratulations! You achieved your goal: {goal_name}"

    content = f"""
    <h2 style="text-align: center;">🎉🎊 Goal Achieved! 🎊🎉</h2>

    <p>Hi {user_name},</p>

    <p>Amazing news! You've successfully achieved your investment goal! This is a huge milestone and a testament to your dedication and discipline.</p>

    <div class="stat-card" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);">
        <div class="stat-label" style="font-size: 16px; font-weight: 600; color: #059669;">
            {goal_name}
        </div>
        <div class="stat-value" style="font-size: 36px; margin: 16px 0;">
            {target_amount}
        </div>
        <p style="margin-bottom: 0; color: #047857;">
            Completed on {achieved_date}
        </p>
        <p style="margin-top: 8px; margin-bottom: 0; color: #6b7280; font-size: 14px;">
            Time taken: {days_taken} days
        </p>
    </div>

    <div class="highlight">
        <strong>💪 Why this matters:</strong>
        <ul style="margin-bottom: 0;">
            <li>You stayed committed to your financial goals</li>
            <li>Your consistency paid off</li>
            <li>You've built a strong investing habit</li>
            <li>You're closer to financial freedom!</li>
        </ul>
    </div>

    <h3>What's Next?</h3>

    <p>Don't stop here! Keep the momentum going by setting a new goal:</p>

    <p style="text-align: center; margin: 24px 0;">
        <a href="{app_url}/goals/new" class="button">Set New Goal</a>
    </p>

    <div class="info-box">
        <strong>🎯 Goal Ideas:</strong>
        <ul style="margin-bottom: 0;">
            <li><strong>Emergency Fund</strong> - 3-6 months of expenses</li>
            <li><strong>Investment Milestone</strong> - Next PKR milestone</li>
            <li><strong>Passive Income</strong> - Dividend income target</li>
            <li><strong>Specific Purchase</strong> - House, car, education</li>
        </ul>
    </div>

    <div class="divider"></div>

    <p>Keep up the fantastic work! Your future self will thank you. 🚀</p>

    <p>
        <strong>Cheers,</strong><br>
        The GrowMore Team
    </p>
    """

    html = get_base_template(content, "Goal Achieved!", app_url)
    return subject, html


def get_goal_milestone_email(
    user_name: str,
    goal_name: str,
    milestone_percent: int,
    current_amount: str,
    target_amount: str,
    remaining_amount: str,
    app_url: str = "https://growmore.pk",
) -> tuple[str, str]:
    """
    Generate goal milestone email (25%, 50%, 75% progress).

    Args:
        user_name: User's display name
        goal_name: Name of the goal
        milestone_percent: Milestone percentage reached
        current_amount: Current progress amount
        target_amount: Target amount
        remaining_amount: Amount remaining
        app_url: Application URL

    Returns:
        Tuple of (subject, html_content)
    """
    subject = f"🎯 {milestone_percent}% Progress on your goal: {goal_name}"

    emoji_map = {25: "🌱", 50: "📈", 75: "🔥", 90: "🚀"}
    emoji = emoji_map.get(milestone_percent, "📊")

    content = f"""
    <h2>{emoji} Milestone Reached!</h2>

    <p>Hi {user_name},</p>

    <p>Great progress! You've reached <strong>{milestone_percent}%</strong> of your goal "{goal_name}"!</p>

    <div class="stat-card">
        <div class="stat-label">{goal_name}</div>
        <div style="background: #e5e7eb; border-radius: 8px; height: 20px; margin: 16px 0; overflow: hidden;">
            <div style="background: linear-gradient(90deg, #10b981, #059669); height: 100%; width: {milestone_percent}%; border-radius: 8px;"></div>
        </div>
        <div class="stat-value">{current_amount}</div>
        <p style="color: #6b7280; margin-top: 8px; margin-bottom: 0;">
            of {target_amount} target
        </p>
    </div>

    <div class="highlight">
        <strong>📊 Progress Summary:</strong>
        <ul style="margin-bottom: 0;">
            <li>Progress: {milestone_percent}%</li>
            <li>Current: {current_amount}</li>
            <li>Remaining: {remaining_amount}</li>
        </ul>
    </div>

    <p>You're doing amazing! Keep contributing consistently to reach your goal.</p>

    <p style="text-align: center; margin: 24px 0;">
        <a href="{app_url}/goals" class="button">View Goal Progress</a>
    </p>
    """

    html = get_base_template(content, "Goal Milestone", app_url)
    return subject, html
