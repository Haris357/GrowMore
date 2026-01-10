import re
from typing import Optional
from uuid import UUID


def validate_uuid(value: str) -> bool:
    try:
        UUID(value)
        return True
    except (ValueError, TypeError):
        return False


def validate_email(email: str) -> bool:
    if not email:
        return False

    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))


def validate_url(url: str) -> bool:
    if not url:
        return False

    pattern = r"^https?://[^\s/$.?#].[^\s]*$"
    return bool(re.match(pattern, url, re.IGNORECASE))


def validate_phone_pakistan(phone: str) -> bool:
    if not phone:
        return False

    phone = re.sub(r"[\s\-\(\)]", "", phone)
    patterns = [
        r"^\+92\d{10}$",
        r"^92\d{10}$",
        r"^0\d{10}$",
        r"^\d{10}$",
    ]

    return any(re.match(pattern, phone) for pattern in patterns)


def validate_cnic(cnic: str) -> bool:
    if not cnic:
        return False

    cnic = cnic.replace("-", "")
    if len(cnic) != 13:
        return False

    return cnic.isdigit()


def validate_stock_symbol(symbol: str) -> bool:
    if not symbol:
        return False

    pattern = r"^[A-Z]{2,10}$"
    return bool(re.match(pattern, symbol.upper()))


def validate_positive_number(value: float) -> bool:
    try:
        return float(value) > 0
    except (ValueError, TypeError):
        return False


def validate_percentage(value: float) -> bool:
    try:
        val = float(value)
        return -100 <= val <= 100
    except (ValueError, TypeError):
        return False


def validate_date_range(start_date: str, end_date: str) -> bool:
    from app.utils.helpers import parse_datetime

    start = parse_datetime(start_date)
    end = parse_datetime(end_date)

    if not start or not end:
        return False

    return start <= end


def sanitize_string(text: str, max_length: Optional[int] = None) -> str:
    if not text:
        return ""

    sanitized = re.sub(r"[<>\"']", "", text)
    sanitized = " ".join(sanitized.split())

    if max_length:
        sanitized = sanitized[:max_length]

    return sanitized.strip()
