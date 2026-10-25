"""Rule-based anomaly detection engine."""
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from backend.app.schemas.schemas import HostMetrics
from backend.app.models.models import Service, ServiceMetricRecord
from backend.app.core.config import config

class AnomalyCandidate:
    def __init__(
        self,
        metric_name: str,
        service_id: Optional[str],
        observed_value: float,
        threshold_value: float,
        severity: str,
        title: str,
        description: str,
        evidence: Dict[str, Any],
        detection_method: str = "rule_based"
    ):
        self.metric_name = metric_name
        self.service_id = service_id
        self.observed_value = observed_value
        self.threshold_value = threshold_value
        self.severity = severity
        self.title = title
        self.description = description
        self.evidence = evidence
        self.detection_method = detection_method
        self.timestamp = datetime.now(timezone.utc)

class RuleAnomalyDetector:
    def evaluate_host_metrics(self, host: HostMetrics) -> List[AnomalyCandidate]:
        anomalies: List[AnomalyCandidate] = []

        # 1. CPU Check
        if host.cpu_percent >= config.cpu_threshold_percent:
            sev = "critical" if host.cpu_percent >= 95.0 else "high"
            anomalies.append(
                AnomalyCandidate(
                    metric_name="cpu_percent",
                    service_id=None,
                    observed_value=host.cpu_percent,
                    threshold_value=config.cpu_threshold_percent,
                    severity=sev,
                    title=f"Host CPU Spike ({host.cpu_percent}%)",
                    description=f"Host CPU utilization reached {host.cpu_percent}%, exceeding safe threshold of {config.cpu_threshold_percent}%.",
                    evidence={
                        "cpu_percent": host.cpu_percent,
                        "uptime_seconds": host.uptime_seconds,
                        "is_simulated": host.is_simulated
                    }
                )
            )

        # 2. Memory Check
        if host.memory_percent >= config.memory_threshold_percent:
            sev = "critical" if host.memory_percent >= 95.0 else "high"
            anomalies.append(
                AnomalyCandidate(
                    metric_name="memory_percent",
                    service_id=None,
                    observed_value=host.memory_percent,
                    threshold_value=config.memory_threshold_percent,
                    severity=sev,
                    title=f"Host Memory Saturation ({host.memory_percent}%)",
                    description=f"Host memory usage reached {host.memory_percent}%, exceeding safe threshold of {config.memory_threshold_percent}%.",
                    evidence={
                        "memory_percent": host.memory_percent,
                        "used_mb": round(host.memory_used_bytes / (1024 * 1024), 1),
                        "total_mb": round(host.memory_total_bytes / (1024 * 1024), 1),
                        "is_simulated": host.is_simulated
                    }
                )
            )

        # 3. Disk Check
        if host.disk_percent >= config.disk_threshold_percent:
            sev = "critical" if host.disk_percent >= 98.0 else "high"
            anomalies.append(
                AnomalyCandidate(
                    metric_name="disk_percent",
                    service_id=None,
                    observed_value=host.disk_percent,
                    threshold_value=config.disk_threshold_percent,
                    severity=sev,
                    title=f"Host Storage Near Full ({host.disk_percent}%)",
                    description=f"Disk space reached {host.disk_percent}%, exceeding critical threshold of {config.disk_threshold_percent}%.",
                    evidence={
                        "disk_percent": host.disk_percent,
                        "used_gb": round(host.disk_used_bytes / (1024**3), 2),
                        "total_gb": round(host.disk_total_bytes / (1024**3), 2)
                    }
                )
            )

        return anomalies

    def evaluate_service_metric(self, service: Service, metric: ServiceMetricRecord) -> List[AnomalyCandidate]:
        anomalies: List[AnomalyCandidate] = []

        # 1. Consecutive Health-Check Failures / Service Unavailable
        if service.recent_failure_count >= config.consecutive_failures_threshold:
            anomalies.append(
                AnomalyCandidate(
                    metric_name="consecutive_failures",
                    service_id=service.id,
                    observed_value=float(service.recent_failure_count),
                    threshold_value=float(config.consecutive_failures_threshold),
                    severity="critical",
                    title=f"{service.name} Outage Detected",
                    description=f"Service has failed {service.recent_failure_count} consecutive health checks. Target endpoint {service.health_url} is unreachable or returning critical errors.",
                    evidence={
                        "recent_failure_count": service.recent_failure_count,
                        "last_error": metric.error_message,
                        "health_url": service.health_url,
                        "status_code": metric.status_code
                    }
                )
            )

        # 2. Repeated HTTP 5xx responses
        elif metric.status_code and metric.status_code >= 500:
            anomalies.append(
                AnomalyCandidate(
                    metric_name="http_5xx_error",
                    service_id=service.id,
                    observed_value=float(metric.status_code),
                    threshold_value=500.0,
                    severity="high",
                    title=f"{service.name} HTTP {metric.status_code} Server Error",
                    description=f"Service responded with server error HTTP {metric.status_code}: {metric.error_message or 'Internal Server Error'}.",
                    evidence={
                        "status_code": metric.status_code,
                        "response_time_ms": metric.response_time_ms,
                        "error_message": metric.error_message
                    }
                )
            )

        # 3. High Latency Check
        elif metric.is_success and metric.response_time_ms >= config.latency_threshold_ms:
            sev = "high" if metric.response_time_ms >= config.latency_threshold_ms * 2 else "medium"
            anomalies.append(
                AnomalyCandidate(
                    metric_name="latency_ms",
                    service_id=service.id,
                    observed_value=metric.response_time_ms,
                    threshold_value=config.latency_threshold_ms,
                    severity=sev,
                    title=f"{service.name} Latency Spike ({round(metric.response_time_ms, 1)}ms)",
                    description=f"API response latency reached {round(metric.response_time_ms, 1)}ms, exceeding limit of {config.latency_threshold_ms}ms.",
                    evidence={
                        "response_time_ms": metric.response_time_ms,
                        "threshold_ms": config.latency_threshold_ms,
                        "status_code": metric.status_code
                    }
                )
            )

        return anomalies

rule_detector = RuleAnomalyDetector()
