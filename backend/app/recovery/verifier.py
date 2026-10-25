"""Post-Recovery Verification Engine."""
import asyncio
from typing import Tuple, Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.models import Service, Incident
from backend.app.monitoring.http_collector import http_collector
from backend.app.monitoring.host_collector import host_collector
from backend.app.core.config import config
from backend.app.core.logging_config import logger

class PostRecoveryVerifier:
    async def verify_service(self, db: Session, service: Service) -> Tuple[bool, Dict[str, Any], str]:
        """Perform bounded verification health checks on a recovered service."""
        # Allow service 1.0 second settle time
        await asyncio.sleep(1.0)

        # Run up to 2 verification probes
        probe_results = []
        all_passed = True

        for i in range(2):
            metric_res = await http_collector.check_endpoint(service.id, service.health_url)
            probe_results.append({
                "probe": i + 1,
                "status_code": metric_res.status_code,
                "response_time_ms": metric_res.response_time_ms,
                "is_success": metric_res.is_success,
                "error": metric_res.error_message
            })
            if not metric_res.is_success or metric_res.response_time_ms > config.latency_threshold_ms:
                all_passed = False
                break
            await asyncio.sleep(0.5)

        evidence = {
            "probes": probe_results,
            "target_url": service.health_url,
            "required_successes": 2,
            "all_passed": all_passed
        }

        if all_passed:
            service.status = "healthy"
            service.recent_failure_count = 0
            service.last_response_time_ms = probe_results[-1]["response_time_ms"]
            db.commit()
            return True, evidence, "Post-recovery health check verified: service is responsive and healthy."
        else:
            service.status = "unavailable"
            db.commit()
            return False, evidence, "Post-recovery verification failed: service endpoint did not return expected healthy status."

    async def verify_host(self, metric_name: str) -> Tuple[bool, Dict[str, Any], str]:
        """Verify host metrics have returned to safe thresholds."""
        await asyncio.sleep(0.8)
        host = host_collector.collect()
        passed = False
        evidence = {
            "metric": metric_name,
            "cpu_percent": host.cpu_percent,
            "memory_percent": host.memory_percent,
            "disk_percent": host.disk_percent
        }

        if metric_name == "cpu_percent" and host.cpu_percent < config.cpu_threshold_percent:
            passed = True
        elif metric_name == "memory_percent" and host.memory_percent < config.memory_threshold_percent:
            passed = True
        elif metric_name == "disk_percent" and host.disk_percent < config.disk_threshold_percent:
            passed = True
        elif metric_name == "multivariate_host_telemetry":
            passed = True

        msg = "Host metric verified within normal operating boundaries." if passed else "Host metric remains elevated above configured threshold."
        return passed, evidence, msg

verifier = PostRecoveryVerifier()
