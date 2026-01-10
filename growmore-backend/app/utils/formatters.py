from decimal import Decimal
from typing import Optional, Union


def format_currency(
    amount: Union[float, Decimal, int],
    currency: str = "PKR",
    symbol: str = "Rs",
    decimal_places: int = 2,
    include_symbol: bool = True,
) -> str:
    if amount is None:
        return ""

    try:
        amount = float(amount)
    except (ValueError, TypeError):
        return ""

    formatted = f"{amount:,.{decimal_places}f}"

    if include_symbol:
        return f"{symbol} {formatted}"

    return formatted


def format_percentage(
    value: Union[float, Decimal],
    decimal_places: int = 2,
    include_sign: bool = True,
) -> str:
    if value is None:
        return ""

    try:
        value = float(value)
    except (ValueError, TypeError):
        return ""

    formatted = f"{abs(value):.{decimal_places}f}%"

    if include_sign:
        if value > 0:
            return f"+{formatted}"
        elif value < 0:
            return f"-{formatted}"

    return formatted


def format_number(
    value: Union[float, Decimal, int],
    decimal_places: int = 2,
    use_suffix: bool = True,
) -> str:
    if value is None:
        return ""

    try:
        value = float(value)
    except (ValueError, TypeError):
        return ""

    if use_suffix:
        if abs(value) >= 1_000_000_000_000:
            return f"{value / 1_000_000_000_000:.{decimal_places}f}T"
        elif abs(value) >= 1_000_000_000:
            return f"{value / 1_000_000_000:.{decimal_places}f}B"
        elif abs(value) >= 1_000_000:
            return f"{value / 1_000_000:.{decimal_places}f}M"
        elif abs(value) >= 1_000:
            return f"{value / 1_000:.{decimal_places}f}K"

    return f"{value:,.{decimal_places}f}"


def format_volume(volume: int) -> str:
    if volume is None:
        return ""

    try:
        volume = int(volume)
    except (ValueError, TypeError):
        return ""

    return format_number(volume, decimal_places=2, use_suffix=True)


def format_market_cap(market_cap: Union[float, Decimal]) -> str:
    if market_cap is None:
        return ""

    return format_currency(market_cap, include_symbol=True) + " " + format_number(market_cap, use_suffix=True).split()[-1] if market_cap >= 1000 else format_currency(market_cap)


def format_price_change(
    change: Union[float, Decimal],
    change_pct: Optional[Union[float, Decimal]] = None,
) -> str:
    if change is None:
        return ""

    parts = [format_currency(abs(change), include_symbol=True)]

    if change_pct is not None:
        parts.append(f"({format_percentage(change_pct)})")

    result = " ".join(parts)

    if change > 0:
        return f"+{result}"
    elif change < 0:
        return f"-{result}"

    return result


def format_date(
    date_obj,
    format_string: str = "%d %b %Y",
) -> str:
    if date_obj is None:
        return ""

    try:
        return date_obj.strftime(format_string)
    except (AttributeError, ValueError):
        return ""


def format_datetime(
    datetime_obj,
    format_string: str = "%d %b %Y %H:%M",
) -> str:
    if datetime_obj is None:
        return ""

    try:
        return datetime_obj.strftime(format_string)
    except (AttributeError, ValueError):
        return ""


def format_time_ago(datetime_obj) -> str:
    if datetime_obj is None:
        return ""

    from datetime import datetime, timezone

    try:
        now = datetime.now(timezone.utc)
        if datetime_obj.tzinfo is None:
            from datetime import timezone
            datetime_obj = datetime_obj.replace(tzinfo=timezone.utc)

        diff = now - datetime_obj
        seconds = diff.total_seconds()

        if seconds < 60:
            return "just now"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f"{minutes}m ago"
        elif seconds < 86400:
            hours = int(seconds / 3600)
            return f"{hours}h ago"
        elif seconds < 604800:
            days = int(seconds / 86400)
            return f"{days}d ago"
        else:
            return format_date(datetime_obj)

    except Exception:
        return ""
