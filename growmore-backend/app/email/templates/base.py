"""
Base Email Template.
Provides consistent styling for all email templates.
"""


def get_base_template(content: str, title: str, app_url: str = "https://growmore.pk") -> str:
    """
    Generate base HTML template with consistent styling.

    Args:
        content: Inner HTML content
        title: Email title
        app_url: Application URL for links

    Returns:
        Complete HTML email
    """
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{title}</title>
    <style>
        /* Reset */
        body, table, td, p, a, li, blockquote {{
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }}
        table, td {{
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }}
        img {{
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
        }}

        /* Base styles */
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            margin: 0;
            padding: 0;
            background-color: #f3f4f6;
            width: 100%;
        }}

        .wrapper {{
            width: 100%;
            table-layout: fixed;
            background-color: #f3f4f6;
            padding: 40px 20px;
        }}

        .container {{
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }}

        .header {{
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 32px;
            text-align: center;
        }}

        .logo {{
            font-size: 28px;
            font-weight: 700;
            color: #ffffff;
            text-decoration: none;
        }}

        .logo-icon {{
            font-size: 32px;
            margin-right: 8px;
        }}

        .content {{
            padding: 32px;
        }}

        h1, h2, h3 {{
            color: #111827;
            margin-top: 0;
        }}

        h2 {{
            font-size: 24px;
            margin-bottom: 16px;
        }}

        h3 {{
            font-size: 18px;
            margin-bottom: 12px;
        }}

        p {{
            margin: 0 0 16px 0;
            color: #4b5563;
        }}

        a {{
            color: #10b981;
            text-decoration: none;
        }}

        a:hover {{
            text-decoration: underline;
        }}

        .button {{
            display: inline-block;
            background-color: #10b981;
            color: #ffffff !important;
            padding: 14px 28px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            transition: background-color 0.2s;
        }}

        .button:hover {{
            background-color: #059669;
            text-decoration: none;
        }}

        .button-danger {{
            background-color: #ef4444;
        }}

        .button-danger:hover {{
            background-color: #dc2626;
        }}

        .highlight {{
            background-color: #ecfdf5;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #10b981;
            margin: 20px 0;
        }}

        .alert-box {{
            background-color: #fef2f2;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #ef4444;
            margin: 20px 0;
        }}

        .info-box {{
            background-color: #eff6ff;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
            margin: 20px 0;
        }}

        .stat-card {{
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 12px 0;
            text-align: center;
        }}

        .stat-label {{
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 4px;
        }}

        .stat-value {{
            font-size: 28px;
            font-weight: 700;
            color: #10b981;
        }}

        .positive {{
            color: #10b981;
        }}

        .negative {{
            color: #ef4444;
        }}

        ul {{
            padding-left: 20px;
            margin: 16px 0;
        }}

        li {{
            margin-bottom: 8px;
            color: #4b5563;
        }}

        .divider {{
            height: 1px;
            background-color: #e5e7eb;
            margin: 24px 0;
        }}

        .footer {{
            background-color: #f9fafb;
            padding: 24px 32px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }}

        .footer p {{
            font-size: 12px;
            color: #9ca3af;
            margin: 4px 0;
        }}

        .footer a {{
            color: #6b7280;
        }}

        .social-links {{
            margin: 16px 0;
        }}

        .social-links a {{
            display: inline-block;
            margin: 0 8px;
            color: #6b7280;
        }}

        /* Responsive */
        @media only screen and (max-width: 600px) {{
            .wrapper {{
                padding: 20px 10px;
            }}
            .content {{
                padding: 24px 20px;
            }}
            .header {{
                padding: 24px;
            }}
            .stat-value {{
                font-size: 24px;
            }}
        }}
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <a href="{app_url}" class="logo">
                    <span class="logo-icon">📈</span>GrowMore
                </a>
            </div>
            <div class="content">
                {content}
            </div>
            <div class="footer">
                <div class="social-links">
                    <a href="{app_url}">Website</a> •
                    <a href="{app_url}/help">Help Center</a> •
                    <a href="{app_url}/contact">Contact Us</a>
                </div>
                <p>© 2025 GrowMore. All rights reserved.</p>
                <p>You received this email because you have an account with GrowMore.</p>
                <p>
                    <a href="{app_url}/settings/notifications">Email Preferences</a> •
                    <a href="{app_url}/unsubscribe">Unsubscribe</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
"""
