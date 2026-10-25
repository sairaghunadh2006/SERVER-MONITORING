"""Service health monitor coordinator."""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.app.models.models import Service, ServiceMetricRecord
from backend.app.monitoring.http_collector import http_collector
from backend.app.core.config import config
from backend.app.core.logging_config import logger

class ServiceMonitor:
    async def check_service(self, db: Session, service: Service) -> ServiceMetricRecord:
        """Execute check for a single service and update its status record."""
        metric_res = await http_collector.check_endpoint(service.id, service.health_url)
        
        now = datetime.now(timezone.utc)
        service.last_check_time = now
        service.last_response_time_ms = metric_res.response_time_ms

        if metric_res.is_success:
            if metric_res.response_time_ms > config.latency_threshold_ms:
                service.status = "degraded"
            else:
                service.status = "healthy"
            service.recent_failure_count = 0
        else:
            service.recent_failure_count += 1
            if service.recent_failure_count >= config.consecutive_failures_threshold:
                service.status = "unavailable"
            else:
                service.status = "degraded"

        # Record metric entry
        record = ServiceMetricRecord(
            service_id=service.id,
            timestamp=now,
            status_code=metric_res.status_code,
            response_time_ms=metric_res.response_time_ms,
            is_success=metric_res.is_success,
            error_message=metric_res.error_message,
            is_simulated=metric_res.is_simulated
        )
        db.add(record)
        db.commit()
        db.refresh(service)
        return record

    async def check_all_active_services(self, db: Session):
        """Poll all enabled services."""
        services = db.query(Service).filter(Service.enabled == True).all()
        results = []
        for svc in services:
            try:
                rec = await self.check_service(db, svc)
                results.append(rec)
            except Exception as e:
                logger.error(f"Error checking service {svc.id}: {e}")
        return results

service_monitor = ServiceMonitor()
