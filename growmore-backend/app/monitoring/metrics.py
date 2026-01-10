"""Metrics Collection for Monitoring."""

import time
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from threading import Lock


class MetricsCollector:
    """
    Simple in-memory metrics collector.

    Collects basic application metrics for monitoring.
    """

    def __init__(self):
        self._lock = Lock()
        self._counters: Dict[str, int] = defaultdict(int)
        self._gauges: Dict[str, float] = {}
        self._histograms: Dict[str, List[float]] = defaultdict(list)
        self._start_time = datetime.utcnow()

        # Request metrics
        self._request_counts: Dict[str, int] = defaultdict(int)
        self._request_durations: Dict[str, List[float]] = defaultdict(list)
        self._status_codes: Dict[int, int] = defaultdict(int)

    # ==================== Counter Operations ====================

    def increment(self, name: str, value: int = 1, labels: Optional[Dict[str, str]] = None):
        """Increment a counter."""
        key = self._make_key(name, labels)
        with self._lock:
            self._counters[key] += value

    def get_counter(self, name: str, labels: Optional[Dict[str, str]] = None) -> int:
        """Get counter value."""
        key = self._make_key(name, labels)
        return self._counters.get(key, 0)

    # ==================== Gauge Operations ====================

    def set_gauge(self, name: str, value: float, labels: Optional[Dict[str, str]] = None):
        """Set a gauge value."""
        key = self._make_key(name, labels)
        with self._lock:
            self._gauges[key] = value

    def get_gauge(self, name: str, labels: Optional[Dict[str, str]] = None) -> Optional[float]:
        """Get gauge value."""
        key = self._make_key(name, labels)
        return self._gauges.get(key)

    # ==================== Histogram Operations ====================

    def observe(self, name: str, value: float, labels: Optional[Dict[str, str]] = None):
        """Record a value in a histogram."""
        key = self._make_key(name, labels)
        with self._lock:
            self._histograms[key].append(value)
            # Keep only last 1000 observations
            if len(self._histograms[key]) > 1000:
                self._histograms[key] = self._histograms[key][-1000:]

    def get_histogram_stats(
        self, name: str, labels: Optional[Dict[str, str]] = None
    ) -> Dict[str, float]:
        """Get histogram statistics."""
        key = self._make_key(name, labels)
        values = self._histograms.get(key, [])

        if not values:
            return {"count": 0, "sum": 0, "avg": 0, "min": 0, "max": 0, "p50": 0, "p95": 0, "p99": 0}

        sorted_values = sorted(values)
        count = len(values)

        return {
            "count": count,
            "sum": sum(values),
            "avg": sum(values) / count,
            "min": min(values),
            "max": max(values),
            "p50": sorted_values[int(count * 0.5)],
            "p95": sorted_values[int(count * 0.95)] if count >= 20 else sorted_values[-1],
            "p99": sorted_values[int(count * 0.99)] if count >= 100 else sorted_values[-1],
        }

    # ==================== Request Metrics ====================

    def record_request(
        self,
        method: str,
        path: str,
        status_code: int,
        duration_ms: float,
    ):
        """Record HTTP request metrics."""
        endpoint = f"{method} {path}"
        with self._lock:
            self._request_counts[endpoint] += 1
            self._request_durations[endpoint].append(duration_ms)
            self._status_codes[status_code] += 1

            # Keep only last 1000 durations per endpoint
            if len(self._request_durations[endpoint]) > 1000:
                self._request_durations[endpoint] = self._request_durations[endpoint][-1000:]

    def get_request_metrics(self) -> Dict[str, Any]:
        """Get request metrics summary."""
        total_requests = sum(self._request_counts.values())

        # Calculate error rates
        error_count = sum(
            count for code, count in self._status_codes.items()
            if code >= 400
        )
        error_rate = (error_count / total_requests * 100) if total_requests > 0 else 0

        # Top endpoints
        top_endpoints = sorted(
            self._request_counts.items(),
            key=lambda x: x[1],
            reverse=True,
        )[:10]

        # Status code distribution
        status_distribution = dict(sorted(self._status_codes.items()))

        return {
            "total_requests": total_requests,
            "error_count": error_count,
            "error_rate_percent": round(error_rate, 2),
            "status_codes": status_distribution,
            "top_endpoints": [
                {"endpoint": ep, "count": count}
                for ep, count in top_endpoints
            ],
        }

    # ==================== System Metrics ====================

    def get_system_metrics(self) -> Dict[str, Any]:
        """Get system metrics."""
        import os
        import sys

        uptime = datetime.utcnow() - self._start_time

        metrics = {
            "uptime_seconds": int(uptime.total_seconds()),
            "python_version": sys.version,
            "pid": os.getpid(),
        }

        # Try to get memory info
        try:
            import psutil
            process = psutil.Process(os.getpid())
            memory_info = process.memory_info()
            metrics["memory_mb"] = round(memory_info.rss / 1024 / 1024, 2)
            metrics["cpu_percent"] = process.cpu_percent()
        except ImportError:
            pass

        return metrics

    # ==================== Export Metrics ====================

    def get_all_metrics(self) -> Dict[str, Any]:
        """Get all metrics in a structured format."""
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "system": self.get_system_metrics(),
            "requests": self.get_request_metrics(),
            "counters": dict(self._counters),
            "gauges": dict(self._gauges),
            "histograms": {
                key: self.get_histogram_stats(key)
                for key in self._histograms.keys()
            },
        }

    def get_prometheus_format(self) -> str:
        """
        Export metrics in Prometheus format.

        Returns text that can be scraped by Prometheus.
        """
        lines = []

        # Counters
        for name, value in self._counters.items():
            safe_name = name.replace(".", "_").replace("-", "_")
            lines.append(f"# TYPE {safe_name} counter")
            lines.append(f"{safe_name} {value}")

        # Gauges
        for name, value in self._gauges.items():
            safe_name = name.replace(".", "_").replace("-", "_")
            lines.append(f"# TYPE {safe_name} gauge")
            lines.append(f"{safe_name} {value}")

        # Request metrics
        lines.append("# TYPE http_requests_total counter")
        for endpoint, count in self._request_counts.items():
            safe_endpoint = endpoint.replace(" ", "_").replace("/", "_")
            lines.append(f'http_requests_total{{endpoint="{safe_endpoint}"}} {count}')

        lines.append("# TYPE http_status_codes counter")
        for code, count in self._status_codes.items():
            lines.append(f'http_status_codes{{code="{code}"}} {count}')

        return "\n".join(lines)

    # ==================== Helpers ====================

    def _make_key(self, name: str, labels: Optional[Dict[str, str]] = None) -> str:
        """Make a key from name and labels."""
        if not labels:
            return name
        label_str = ",".join(f"{k}={v}" for k, v in sorted(labels.items()))
        return f"{name}{{{label_str}}}"

    def reset(self):
        """Reset all metrics (for testing)."""
        with self._lock:
            self._counters.clear()
            self._gauges.clear()
            self._histograms.clear()
            self._request_counts.clear()
            self._request_durations.clear()
            self._status_codes.clear()


# Singleton instance
metrics_collector = MetricsCollector()
