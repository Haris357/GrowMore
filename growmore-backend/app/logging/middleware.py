"""Logging Middleware for FastAPI."""

import time
import json
import logging
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.logging.service import logging_service

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all API requests."""

    def __init__(self, app, log_request_body: bool = False, log_response_body: bool = False):
        super().__init__(app)
        self.log_request_body = log_request_body
        self.log_response_body = log_response_body
        # Paths to skip logging
        self.skip_paths = {
            "/health",
            "/healthz",
            "/ready",
            "/metrics",
            "/docs",
            "/redoc",
            "/openapi.json",
        }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and log details."""
        # Skip certain paths
        if request.url.path in self.skip_paths:
            return await call_next(request)

        start_time = time.time()

        # Get request info
        method = request.method
        path = request.url.path
        ip_address = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")

        # Get user ID from auth token if available
        user_id = None
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            # We'd need to decode the token here to get user_id
            # For now, we'll set it from request state if available
            pass

        # Get request body (if enabled and not too large)
        request_body = None
        if self.log_request_body and method in ["POST", "PUT", "PATCH"]:
            try:
                content_length = int(request.headers.get("content-length", 0))
                if content_length < 10000:  # Only log bodies < 10KB
                    body = await request.body()
                    if body:
                        request_body = json.loads(body)
                        # Re-create request body for downstream handlers
                        request._body = body
            except Exception:
                pass

        # Process request
        error_message = None
        status_code = 500
        response_body = None

        try:
            response = await call_next(request)
            status_code = response.status_code

            # Get response body if enabled
            if self.log_response_body and status_code >= 400:
                try:
                    # This would require response body capturing
                    pass
                except Exception:
                    pass

        except Exception as e:
            error_message = str(e)
            logger.error(f"Request error: {e}")
            raise
        finally:
            # Calculate duration
            duration_ms = int((time.time() - start_time) * 1000)

            # Try to get user_id from request state
            if hasattr(request, "state") and hasattr(request.state, "user_id"):
                user_id = request.state.user_id

            # Log asynchronously (fire and forget)
            try:
                import asyncio
                asyncio.create_task(
                    logging_service.log_api_request(
                        method=method,
                        path=path,
                        status_code=status_code,
                        duration_ms=duration_ms,
                        user_id=user_id,
                        ip_address=ip_address,
                        user_agent=user_agent[:500] if user_agent else None,
                        request_body=request_body,
                        response_body=response_body,
                        error_message=error_message,
                    )
                )
            except Exception as log_error:
                logger.error(f"Failed to log request: {log_error}")

        return response

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request headers."""
        # Check for forwarded headers (common in load balancers)
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()

        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        # Fall back to client host
        if request.client:
            return request.client.host

        return "unknown"


def setup_request_logging(app, log_request_body: bool = False, log_response_body: bool = False):
    """Add logging middleware to FastAPI app."""
    app.add_middleware(
        LoggingMiddleware,
        log_request_body=log_request_body,
        log_response_body=log_response_body,
    )
