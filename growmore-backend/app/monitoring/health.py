"""Health Check Service."""

import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.config.settings import settings

logger = logging.getLogger(__name__)


class HealthStatus:
    """Health status constants."""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


class HealthChecker:
    """Service for health checks."""

    def __init__(self):
        self.start_time = datetime.utcnow()

    async def check_database(self) -> Dict[str, Any]:
        """Check database connectivity."""
        try:
            from app.db.supabase import get_supabase_service_client
            db = get_supabase_service_client()

            # Simple query to test connectivity
            start = datetime.utcnow()
            result = db.table("markets").select("id").limit(1).execute()
            latency = (datetime.utcnow() - start).total_seconds() * 1000

            return {
                "status": HealthStatus.HEALTHY,
                "latency_ms": round(latency, 2),
                "message": "Database connected",
            }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": HealthStatus.UNHEALTHY,
                "message": f"Database error: {str(e)}",
            }

    async def check_external_services(self) -> Dict[str, Any]:
        """Check external service connectivity."""
        results = {}

        # Check email service (Resend)
        try:
            from app.email.client import email_client
            if email_client.api_key:
                results["email"] = {
                    "status": HealthStatus.HEALTHY,
                    "message": "Email service configured",
                }
            else:
                results["email"] = {
                    "status": HealthStatus.DEGRADED,
                    "message": "Email service not configured",
                }
        except Exception as e:
            results["email"] = {
                "status": HealthStatus.UNHEALTHY,
                "message": str(e),
            }

        return results

    async def get_liveness(self) -> Dict[str, Any]:
        """
        Liveness probe - is the application running?

        Simple check that the app is alive and can respond.
        """
        return {
            "status": HealthStatus.HEALTHY,
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def get_readiness(self) -> Dict[str, Any]:
        """
        Readiness probe - is the application ready to serve traffic?

        Checks critical dependencies like database.
        """
        checks = {}
        overall_status = HealthStatus.HEALTHY

        # Check database
        db_check = await self.check_database()
        checks["database"] = db_check
        if db_check["status"] != HealthStatus.HEALTHY:
            overall_status = HealthStatus.UNHEALTHY

        return {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "checks": checks,
        }

    async def get_full_health(self) -> Dict[str, Any]:
        """
        Full health check - detailed status of all components.

        Used for monitoring dashboards and detailed diagnostics.
        """
        checks = {}
        overall_status = HealthStatus.HEALTHY
        degraded_count = 0
        unhealthy_count = 0

        # Database check
        db_check = await self.check_database()
        checks["database"] = db_check
        if db_check["status"] == HealthStatus.UNHEALTHY:
            unhealthy_count += 1
        elif db_check["status"] == HealthStatus.DEGRADED:
            degraded_count += 1

        # External services
        external = await self.check_external_services()
        for service, check in external.items():
            checks[service] = check
            if check["status"] == HealthStatus.UNHEALTHY:
                unhealthy_count += 1
            elif check["status"] == HealthStatus.DEGRADED:
                degraded_count += 1

        # Determine overall status
        if unhealthy_count > 0:
            overall_status = HealthStatus.UNHEALTHY
        elif degraded_count > 0:
            overall_status = HealthStatus.DEGRADED

        # Calculate uptime
        uptime = datetime.utcnow() - self.start_time

        return {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "uptime_seconds": int(uptime.total_seconds()),
            "version": getattr(settings, "APP_VERSION", "1.0.0"),
            "environment": getattr(settings, "ENVIRONMENT", "development"),
            "checks": checks,
            "summary": {
                "healthy": len(checks) - degraded_count - unhealthy_count,
                "degraded": degraded_count,
                "unhealthy": unhealthy_count,
                "total": len(checks),
            },
        }

    async def get_startup_health(self) -> Dict[str, Any]:
        """
        Startup probe - has the application finished starting?

        Used for slow-starting applications.
        """
        # Check if database is ready
        db_check = await self.check_database()

        if db_check["status"] == HealthStatus.HEALTHY:
            return {
                "status": HealthStatus.HEALTHY,
                "timestamp": datetime.utcnow().isoformat(),
                "message": "Application started successfully",
            }

        return {
            "status": HealthStatus.UNHEALTHY,
            "timestamp": datetime.utcnow().isoformat(),
            "message": "Application still starting",
            "checks": {"database": db_check},
        }


# Singleton instance
health_checker = HealthChecker()
