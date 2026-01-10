"""Password Reset Email Template."""

from app.email.templates.base import get_base_template


def get_password_reset_email(
    user_name: str,
    reset_link: str,
    expiry_minutes: int = 60,
    app_url: str = "https://growmore.pk",
) -> tuple[str, str]:
    """
    Generate password reset email.

    Args:
        user_name: User's display name
        reset_link: Password reset link with token
        expiry_minutes: Link expiration time in minutes
        app_url: Application URL

    Returns:
        Tuple of (subject, html_content)
    """
    subject = "Reset Your GrowMore Password"

    content = f"""
    <h2>Password Reset Request</h2>

    <p>Hi {user_name},</p>

    <p>We received a request to reset your GrowMore account password. Click the button below to create a new password:</p>

    <p style="text-align: center; margin: 32px 0;">
        <a href="{reset_link}" class="button">Reset Password</a>
    </p>

    <div class="info-box">
        <strong>⏰ This link expires in {expiry_minutes} minutes</strong>
        <p style="margin-top: 8px; margin-bottom: 0;">
            For security reasons, this password reset link will only work for a limited time.
        </p>
    </div>

    <p>If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="background-color: #f3f4f6; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 13px;">
        {reset_link}
    </p>

    <div class="divider"></div>

    <div class="alert-box">
        <strong>⚠️ Didn't request this?</strong>
        <p style="margin-top: 8px; margin-bottom: 0;">
            If you didn't request a password reset, you can safely ignore this email.
            Your password will not be changed unless you click the link above.
        </p>
    </div>

    <p style="font-size: 13px; color: #6b7280;">
        For security tips, visit our <a href="{app_url}/help/security">Security Help Center</a>.
    </p>
    """

    html = get_base_template(content, "Password Reset", app_url)
    return subject, html


def get_password_changed_email(
    user_name: str,
    change_time: str,
    app_url: str = "https://growmore.pk",
) -> tuple[str, str]:
    """
    Generate password changed confirmation email.

    Args:
        user_name: User's display name
        change_time: Formatted timestamp of password change
        app_url: Application URL

    Returns:
        Tuple of (subject, html_content)
    """
    subject = "Your GrowMore Password Has Been Changed"

    content = f"""
    <h2>Password Changed Successfully</h2>

    <p>Hi {user_name},</p>

    <p>Your GrowMore account password was successfully changed on <strong>{change_time}</strong>.</p>

    <div class="highlight">
        <strong>✅ Your account is secure</strong>
        <p style="margin-top: 8px; margin-bottom: 0;">
            This email confirms that your password has been updated.
        </p>
    </div>

    <div class="alert-box">
        <strong>⚠️ Didn't make this change?</strong>
        <p style="margin-top: 8px;">
            If you didn't change your password, your account may be compromised.
            Please take immediate action:
        </p>
        <p style="text-align: center; margin-top: 16px;">
            <a href="{app_url}/auth/forgot-password" class="button button-danger">Reset My Password</a>
        </p>
    </div>

    <p style="font-size: 13px; color: #6b7280;">
        If you made this change, you can safely ignore this email.
    </p>
    """

    html = get_base_template(content, "Password Changed", app_url)
    return subject, html
