import asyncio
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from functools import wraps
from typing import Any, Callable, List, Optional, TypeVar

T = TypeVar("T")


def generate_slug(text: str, max_length: int = 100) -> str:
    slug = text.lower()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[-\s]+", "-", slug)
    slug = slug.strip("-")
    return slug[:max_length]


def parse_datetime(
    date_string: str,
    formats: Optional[List[str]] = None,
) -> Optional[datetime]:
    if not date_string:
        return None

    formats = formats or [
        "%Y-%m-%d",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%d %b %Y",
        "%d %B %Y",
        "%B %d, %Y",
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%m/%d/%Y",
    ]

    date_string = date_string.strip()

    for fmt in formats:
        try:
            return datetime.strptime(date_string, fmt)
        except ValueError:
            continue

    return None


def safe_decimal(value: Any, default: Optional[Decimal] = None) -> Optional[Decimal]:
    if value is None:
        return default

    try:
        if isinstance(value, Decimal):
            return value
        if isinstance(value, str):
            value = value.replace(",", "").strip()
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return default


def retry_async(
    max_retries: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: tuple = (Exception,),
):
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            current_delay = delay
            last_exception = None

            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        await asyncio.sleep(current_delay)
                        current_delay *= backoff

            raise last_exception

        return wrapper

    return decorator


def chunks(lst: List[T], size: int) -> List[List[T]]:
    return [lst[i:i + size] for i in range(0, len(lst), size)]


def flatten(nested_list: List[List[T]]) -> List[T]:
    return [item for sublist in nested_list for item in sublist]


def remove_duplicates(lst: List[T], key: Optional[Callable[[T], Any]] = None) -> List[T]:
    seen = set()
    result = []

    for item in lst:
        k = key(item) if key else item
        if k not in seen:
            seen.add(k)
            result.append(item)

    return result


def truncate_string(text: str, max_length: int, suffix: str = "...") -> str:
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix


def clean_html(html: str) -> str:
    clean = re.sub(r"<[^>]+>", "", html)
    clean = re.sub(r"\s+", " ", clean)
    return clean.strip()


def extract_numbers(text: str) -> List[float]:
    pattern = r"[-+]?\d*\.?\d+"
    matches = re.findall(pattern, text)
    return [float(m) for m in matches]


def mask_string(text: str, visible_chars: int = 4, mask_char: str = "*") -> str:
    if len(text) <= visible_chars * 2:
        return mask_char * len(text)

    return text[:visible_chars] + mask_char * (len(text) - visible_chars * 2) + text[-visible_chars:]
