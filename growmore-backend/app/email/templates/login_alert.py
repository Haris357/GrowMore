"""Login Alert Email Template."""

from app.email.templates.base import get_base_template


def get_login_alert_email(
    user_name: str,
    device: str,
    browser: str,
    ip_address: str,
    location: str,
    login_time: str,
    app_url: str = "https://growmore.pk",
) -> tuple[str, str]:
    """
    Generate login alert email for security notifications.

    Args:
        user_name: User's display name
        device: Device type/name
        browser: Browser name and version
        ip_address: IP address
        location: Geographic location
        login_time: Formatted login timestamp
        app_url: Application URL

    Returns:
        Tuple of (subject, html_content)
    """
    subject = "🔐 New Login to Your GrowMore Account"

    content = f"""
    <h2>New Login Detected</h2>

    <p>Hi {user_name},</p>

    <p>We detected a new login to your GrowMore account. Here are the details:</p>

    <div class="highlight">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 8px 0;"><strong>📱 Device:</strong></td>
                <td style="padding: 8px 0;">{device}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0;"><strong>🌐 Browser:</strong></td>
                <td style="padding: 8px 0;">{browser}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0;"><strong>📍 Location:</strong></td>
                <td style="padding: 8px 0;">{location}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0;"><strong>🔢 IP Address:</strong></td>
                <td style="padding: 8px 0;">{ip_address}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0;"><strong>🕐 Time:</strong></td>
                <td style="padding: 8px 0;">{login_time}</td>
            </tr>
        </table>
    </div>

    <h3>Was this you?</h3>

    <p>If you recognize this login, you can safely ignore this email.</p>

    <div class="alert-box">
        <strong>⚠️ If this wasn't you:</strong>
        <p style="margin-top: 8px;">Your account security may be compromised. We recommend taking immediate action:</p>
        <ol style="margin-bottom: 16px;">
            <li>Change your password immediately</li>
            <li>Review your recent account activity</li>
            <li>Revoke any suspicious sessions</li>
            <li>Enable two-factor authentication if available</li>
        </ol>
        <p style="text-align: center; margin-top: 16px;">
            <a href="{app_url}/settings/security" class="button button-danger">Secure My Account</a>
        </p>
    </div>

    <div class="divider"></div>

    <p style="font-size: 13px; color: #6b7280;">
        You're receiving this email because we want to keep your account secure.
        You can manage login alerts in your <a href="{app_url}/settings/notifications">notification settings</a>.
    </p>
    """

    html = get_base_template(content, "New Login Alert", app_url)
    return subject, html
