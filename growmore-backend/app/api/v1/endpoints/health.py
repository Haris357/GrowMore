"""Health Check API Endpoints."""

from fastapi import APIRouter, Response, status

from app.monitoring.health import health_checker, HealthStatus
from app.monitoring.metrics import metrics_collector

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Basic health check endpoint.

    Returns 200 if application is healthy.
    """
    return await health_checker.get_liveness()


@router.get("/healthz")
async def liveness_probe():
    """
    Kubernetes liveness probe.

    Returns 200 if application is alive.
    Simple check - just confirms the app is running.
    """
    result = await health_checker.get_liveness()
    return result


@router.get("/ready")
async def readiness_probe(response: Response):
    """
    Kubernetes readiness probe.

    Returns 200 if application is ready to serve traffic.
    Checks critical dependencies like database.
    """
    result = await health_checker.get_readiness()

    if result["status"] != HealthStatus.HEALTHY:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return result


@router.get("/startup")
async def startup_probe(response: Response):
    """
    Kubernetes startup probe.

    Returns 200 if application has finished starting.
    Used for slow-starting applications.
    """
    result = await health_checker.get_startup_health()

    if result["status"] != HealthStatus.HEALTHY:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return result


@router.get("/health/detailed")
async def detailed_health_check(response: Response):
    """
    Detailed health check with all component statuses.

    Returns comprehensive health information including:
    - Database connectivity
    - External service status
    - System metrics
    - Uptime information
    """
    result = await health_checker.get_full_health()

    if result["status"] == HealthStatus.UNHEALTHY:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    elif result["status"] == HealthStatus.DEGRADED:
        response.status_code = status.HTTP_200_OK  # Still return 200 for degraded

    return result


@router.get("/metrics")
async def get_metrics():
    """
    Get application metrics.

    Returns JSON metrics for monitoring dashboards.
    """
    return metrics_collector.get_all_metrics()


@router.get("/metrics/prometheus")
async def get_prometheus_metrics():
    """
    Get metrics in Prometheus format.

    Returns text format that can be scraped by Prometheus.
    """
    content = metrics_collector.get_prometheus_format()
    return Response(
        content=content,
        media_type="text/plain",
    )


@router.get("/metrics/requests")
async def get_request_metrics():
    """Get HTTP request metrics."""
    return metrics_collector.get_request_metrics()


@router.get("/metrics/system")
async def get_system_metrics():
    """Get system metrics (memory, CPU, etc.)."""
    return metrics_collector.get_system_metrics()
