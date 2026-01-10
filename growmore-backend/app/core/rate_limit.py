"""Rate Limiting using slowapi."""

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse


def get_user_identifier(request: Request) -> str:
    """
    Get identifier for rate limiting.

    Uses user ID if authenticated, otherwise IP address.
    """
    # Try to get user ID from request state (set by auth middleware)
    if hasattr(request.state, "user_id") and request.state.user_id:
        return f"user:{request.state.user_id}"

    # Check for authorization header
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        # Use token hash as identifier (first 16 chars)
        token = auth_header[7:]
        if len(token) > 16:
            return f"token:{token[:16]}"

    # Fall back to IP address
    return get_remote_address(request)


# Create limiter instance
limiter = Limiter(
    key_func=get_user_identifier,
    default_limits=["100/minute"],
    storage_uri="memory://",  # Use memory storage (no Redis)
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded."""
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": "Too many requests. Please slow down.",
            "retry_after": exc.detail,
        },
        headers={
            "Retry-After": str(exc.detail),
        },
    )


def setup_rate_limiting(app: FastAPI):
    """Setup rate limiting for FastAPI app."""
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)


# Rate limit decorators for different tiers
# Usage: @limiter.limit("10/minute")

# Predefined rate limits for common use cases
class RateLimits:
    """Predefined rate limit strings."""

    # Default limits
    DEFAULT = "100/minute"

    # Auth endpoints (stricter)
    LOGIN = "5/minute"
    REGISTER = "3/minute"
    PASSWORD_RESET = "3/minute"

    # API endpoints
    SEARCH = "30/minute"
    AI_FEATURES = "10/minute"
    EXPORT = "5/minute"
    SCREENER = "20/minute"

    # Write operations
    CREATE = "30/minute"
    UPDATE = "60/minute"
    DELETE = "20/minute"

    # Bulk operations
    BULK = "5/minute"

    # Public endpoints
    PUBLIC = "200/minute"

    # Admin endpoints
    ADMIN = "200/minute"


# Exempt paths from rate limiting
EXEMPT_PATHS = {
    "/health",
    "/healthz",
    "/ready",
    "/metrics",
    "/docs",
    "/redoc",
    "/openapi.json",
}


def is_rate_limit_exempt(request: Request) -> bool:
    """Check if request path is exempt from rate limiting."""
    return request.url.path in EXEMPT_PATHS
