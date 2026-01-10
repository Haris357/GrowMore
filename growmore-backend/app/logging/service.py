"""Logging Service for all log types."""

import logging
import traceback
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.db.supabase import get_supabase_service_client

logger = logging.getLogger(__name__)


class LoggingService:
    """Service for managing all application logs."""

    def __init__(self):
        self._db = None

    @property
    def db(self):
        """Lazy load database connection."""
        if self._db is None:
            self._db = get_supabase_service_client()
        return self._db

    # ==================== API Logs ====================

    async def log_api_request(
        self,
        method: str,
        path: str,
        status_code: int,
        duration_ms: int,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_body: Optional[dict] = None,
        response_body: Optional[dict] = None,
        error_message: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Log an API request."""
        try:
            # Don't log health check endpoints
            if path in ["/health", "/healthz", "/ready", "/metrics"]:
                return {}

            # Sanitize sensitive data
            if request_body:
                request_body = self._sanitize_data(request_body)
            if response_body:
                response_body = self._sanitize_data(response_body)

            result = self.db.table("api_logs").insert({
                "method": method,
                "path": path,
                "status_code": status_code,
                "duration_ms": duration_ms,
                "user_id": user_id,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "request_body": request_body,
                "response_body": response_body,
                "error_message": error_message,
                "created_at": datetime.utcnow().isoformat(),
            }).execute()
            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error(f"Failed to log API request: {e}")
            return {}

    async def get_api_logs(
        self,
        page: int = 1,
        page_size: int = 50,
        method: Optional[str] = None,
        status_code: Optional[int] = None,
        user_id: Optional[str] = None,
        path_contains: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get API logs with filtering."""
        offset = (page - 1) * page_size

        query = self.db.table("api_logs").select("*", count="exact")

        if method:
            query = query.eq("method", method)
        if status_code:
            query = query.eq("status_code", status_code)
        if user_id:
            query = query.eq("user_id", user_id)
        if path_contains:
            query = query.ilike("path", f"%{path_contains}%")

        count_result = query.execute()
        total = count_result.count or 0

        # Rebuild query for results
        query = self.db.table("api_logs").select("*")
        if method:
            query = query.eq("method", method)
        if status_code:
            query = query.eq("status_code", status_code)
        if user_id:
            query = query.eq("user_id", user_id)
        if path_contains:
            query = query.ilike("path", f"%{path_contains}%")

        result = query.order("created_at", desc=True).range(
            offset, offset + page_size - 1
        ).execute()

        return {
            "logs": result.data or [],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    # ==================== Error Logs ====================

    async def log_error(
        self,
        error_type: str,
        error_message: str,
        stack_trace: Optional[str] = None,
        endpoint: Optional[str] = None,
        user_id: Optional[str] = None,
        request_data: Optional[dict] = None,
        severity: str = "error",
    ) -> Dict[str, Any]:
        """Log an application error."""
        try:
            if request_data:
                request_data = self._sanitize_data(request_data)

            result = self.db.table("error_logs").insert({
                "error_type": error_type,
                "error_message": error_message,
                "stack_trace": stack_trace,
                "endpoint": endpoint,
                "user_id": user_id,
                "request_data": request_data,
                "severity": severity,
                "resolved": False,
                "created_at": datetime.utcnow().isoformat(),
            }).execute()
            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error(f"Failed to log error: {e}")
            return {}

    async def log_exception(
        self,
        exception: Exception,
        endpoint: Optional[str] = None,
        user_id: Optional[str] = None,
        request_data: Optional[dict] = None,
    ) -> Dict[str, Any]:
        """Log an exception with full stack trace."""
        return await self.log_error(
            error_type=type(exception).__name__,
            error_message=str(exception),
            stack_trace=traceback.format_exc(),
            endpoint=endpoint,
            user_id=user_id,
            request_data=request_data,
            severity="error",
        )

    async def get_error_logs(
        self,
        page: int = 1,
        page_size: int = 50,
        severity: Optional[str] = None,
        resolved: Optional[bool] = None,
        error_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get error logs with filtering."""
        offset = (page - 1) * page_size

        query = self.db.table("error_logs").select("*", count="exact")

        if severity:
            query = query.eq("severity", severity)
        if resolved is not None:
            query = query.eq("resolved", resolved)
        if error_type:
            query = query.eq("error_type", error_type)

        count_result = query.execute()
        total = count_result.count or 0

        query = self.db.table("error_logs").select("*")
        if severity:
            query = query.eq("severity", severity)
        if resolved is not None:
            query = query.eq("resolved", resolved)
        if error_type:
            query = query.eq("error_type", error_type)

        result = query.order("created_at", desc=True).range(
            offset, offset + page_size - 1
        ).execute()

        return {
            "logs": result.data or [],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def resolve_error(
        self,
        error_id: str,
        resolved_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Mark an error as resolved."""
        result = self.db.table("error_logs").update({
            "resolved": True,
            "resolved_at": datetime.utcnow().isoformat(),
            "resolved_by": resolved_by,
        }).eq("id", error_id).execute()
        return result.data[0] if result.data else {}

    # ==================== Audit Logs ====================

    async def log_audit(
        self,
        user_id: str,
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Log an audit trail entry."""
        try:
            result = self.db.table("audit_logs").insert({
                "user_id": user_id,
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "old_values": old_values,
                "new_values": new_values,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "created_at": datetime.utcnow().isoformat(),
            }).execute()
            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error(f"Failed to log audit: {e}")
            return {}

    async def get_audit_logs(
        self,
        page: int = 1,
        page_size: int = 50,
        user_id: Optional[str] = None,
        entity_type: Optional[str] = None,
        action: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get audit logs with filtering."""
        offset = (page - 1) * page_size

        query = self.db.table("audit_logs").select("*", count="exact")

        if user_id:
            query = query.eq("user_id", user_id)
        if entity_type:
            query = query.eq("entity_type", entity_type)
        if action:
            query = query.eq("action", action)

        count_result = query.execute()
        total = count_result.count or 0

        query = self.db.table("audit_logs").select("*")
        if user_id:
            query = query.eq("user_id", user_id)
        if entity_type:
            query = query.eq("entity_type", entity_type)
        if action:
            query = query.eq("action", action)

        result = query.order("created_at", desc=True).range(
            offset, offset + page_size - 1
        ).execute()

        return {
            "logs": result.data or [],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    # ==================== Scraper Logs ====================

    async def log_scraper_start(
        self,
        scraper_name: str,
        metadata: Optional[dict] = None,
    ) -> Dict[str, Any]:
        """Log scraper execution start."""
        try:
            result = self.db.table("scraper_logs").insert({
                "scraper_name": scraper_name,
                "status": "started",
                "metadata": metadata,
                "started_at": datetime.utcnow().isoformat(),
                "created_at": datetime.utcnow().isoformat(),
            }).execute()
            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error(f"Failed to log scraper start: {e}")
            return {}

    async def log_scraper_complete(
        self,
        log_id: str,
        records_processed: int = 0,
        records_created: int = 0,
        records_updated: int = 0,
        records_failed: int = 0,
        duration_ms: int = 0,
    ) -> Dict[str, Any]:
        """Log scraper execution completion."""
        try:
            result = self.db.table("scraper_logs").update({
                "status": "completed",
                "records_processed": records_processed,
                "records_created": records_created,
                "records_updated": records_updated,
                "records_failed": records_failed,
                "duration_ms": duration_ms,
                "completed_at": datetime.utcnow().isoformat(),
            }).eq("id", log_id).execute()
            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error(f"Failed to log scraper complete: {e}")
            return {}

    async def log_scraper_failure(
        self,
        log_id: str,
        error_message: str,
        duration_ms: int = 0,
    ) -> Dict[str, Any]:
        """Log scraper execution failure."""
        try:
            result = self.db.table("scraper_logs").update({
                "status": "failed",
                "error_message": error_message,
                "duration_ms": duration_ms,
                "completed_at": datetime.utcnow().isoformat(),
            }).eq("id", log_id).execute()
            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error(f"Failed to log scraper failure: {e}")
            return {}

    async def get_scraper_logs(
        self,
        page: int = 1,
        page_size: int = 50,
        scraper_name: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get scraper logs with filtering."""
        offset = (page - 1) * page_size

        query = self.db.table("scraper_logs").select("*", count="exact")

        if scraper_name:
            query = query.eq("scraper_name", scraper_name)
        if status:
            query = query.eq("status", status)

        count_result = query.execute()
        total = count_result.count or 0

        query = self.db.table("scraper_logs").select("*")
        if scraper_name:
            query = query.eq("scraper_name", scraper_name)
        if status:
            query = query.eq("status", status)

        result = query.order("created_at", desc=True).range(
            offset, offset + page_size - 1
        ).execute()

        return {
            "logs": result.data or [],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    # ==================== AI Logs ====================

    async def log_ai_usage(
        self,
        service: str,
        model: str,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        total_tokens: int = 0,
        cost_estimate: Optional[float] = None,
        user_id: Optional[str] = None,
        feature: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        duration_ms: int = 0,
    ) -> Dict[str, Any]:
        """Log AI service usage."""
        try:
            result = self.db.table("ai_logs").insert({
                "service": service,
                "model": model,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
                "cost_estimate": cost_estimate,
                "user_id": user_id,
                "feature": feature,
                "success": success,
                "error_message": error_message,
                "duration_ms": duration_ms,
                "created_at": datetime.utcnow().isoformat(),
            }).execute()
            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error(f"Failed to log AI usage: {e}")
            return {}

    async def get_ai_logs(
        self,
        page: int = 1,
        page_size: int = 50,
        service: Optional[str] = None,
        user_id: Optional[str] = None,
        feature: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get AI logs with filtering."""
        offset = (page - 1) * page_size

        query = self.db.table("ai_logs").select("*", count="exact")

        if service:
            query = query.eq("service", service)
        if user_id:
            query = query.eq("user_id", user_id)
        if feature:
            query = query.eq("feature", feature)

        count_result = query.execute()
        total = count_result.count or 0

        query = self.db.table("ai_logs").select("*")
        if service:
            query = query.eq("service", service)
        if user_id:
            query = query.eq("user_id", user_id)
        if feature:
            query = query.eq("feature", feature)

        result = query.order("created_at", desc=True).range(
            offset, offset + page_size - 1
        ).execute()

        return {
            "logs": result.data or [],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def get_ai_usage_stats(self) -> Dict[str, Any]:
        """Get AI usage statistics."""
        result = self.db.table("ai_logs").select(
            "service,total_tokens,cost_estimate"
        ).execute()

        logs = result.data or []

        total_tokens = sum(l.get("total_tokens", 0) for l in logs)
        total_cost = sum(l.get("cost_estimate", 0) or 0 for l in logs)

        by_service = {}
        for log in logs:
            svc = log.get("service", "unknown")
            if svc not in by_service:
                by_service[svc] = {"tokens": 0, "cost": 0, "requests": 0}
            by_service[svc]["tokens"] += log.get("total_tokens", 0)
            by_service[svc]["cost"] += log.get("cost_estimate", 0) or 0
            by_service[svc]["requests"] += 1

        return {
            "total_tokens": total_tokens,
            "total_cost": round(total_cost, 4),
            "total_requests": len(logs),
            "by_service": by_service,
        }

    # ==================== Job Logs ====================

    async def log_job_start(
        self,
        job_name: str,
        job_type: str = "scheduled",
        parameters: Optional[dict] = None,
    ) -> Dict[str, Any]:
        """Log background job start."""
        try:
            result = self.db.table("job_logs").insert({
                "job_name": job_name,
                "job_type": job_type,
                "status": "running",
                "parameters": parameters,
                "retry_count": 0,
                "started_at": datetime.utcnow().isoformat(),
                "created_at": datetime.utcnow().isoformat(),
            }).execute()
            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error(f"Failed to log job start: {e}")
            return {}

    async def log_job_complete(
        self,
        log_id: str,
        result_data: Optional[dict] = None,
        duration_ms: int = 0,
    ) -> Dict[str, Any]:
        """Log background job completion."""
        try:
            result = self.db.table("job_logs").update({
                "status": "completed",
                "result": result_data,
                "duration_ms": duration_ms,
                "completed_at": datetime.utcnow().isoformat(),
            }).eq("id", log_id).execute()
            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error(f"Failed to log job complete: {e}")
            return {}

    async def log_job_failure(
        self,
        log_id: str,
        error_message: str,
        duration_ms: int = 0,
    ) -> Dict[str, Any]:
        """Log background job failure."""
        try:
            # Get current retry count
            current = self.db.table("job_logs").select("retry_count").eq(
                "id", log_id
            ).execute()
            retry_count = (current.data[0].get("retry_count", 0) if current.data else 0) + 1

            result = self.db.table("job_logs").update({
                "status": "failed",
                "error_message": error_message,
                "duration_ms": duration_ms,
                "retry_count": retry_count,
                "completed_at": datetime.utcnow().isoformat(),
            }).eq("id", log_id).execute()
            return result.data[0] if result.data else {}
        except Exception as e:
            logger.error(f"Failed to log job failure: {e}")
            return {}

    async def get_job_logs(
        self,
        page: int = 1,
        page_size: int = 50,
        job_name: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get job logs with filtering."""
        offset = (page - 1) * page_size

        query = self.db.table("job_logs").select("*", count="exact")

        if job_name:
            query = query.eq("job_name", job_name)
        if status:
            query = query.eq("status", status)

        count_result = query.execute()
        total = count_result.count or 0

        query = self.db.table("job_logs").select("*")
        if job_name:
            query = query.eq("job_name", job_name)
        if status:
            query = query.eq("status", status)

        result = query.order("created_at", desc=True).range(
            offset, offset + page_size - 1
        ).execute()

        return {
            "logs": result.data or [],
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    # ==================== Helpers ====================

    def _sanitize_data(self, data: dict) -> dict:
        """Remove sensitive fields from data."""
        sensitive_fields = {
            "password", "token", "secret", "api_key", "authorization",
            "credit_card", "card_number", "cvv", "pin",
        }

        def sanitize(obj):
            if isinstance(obj, dict):
                return {
                    k: "[REDACTED]" if k.lower() in sensitive_fields else sanitize(v)
                    for k, v in obj.items()
                }
            elif isinstance(obj, list):
                return [sanitize(item) for item in obj]
            return obj

        return sanitize(data)


# Singleton instance
logging_service = LoggingService()
