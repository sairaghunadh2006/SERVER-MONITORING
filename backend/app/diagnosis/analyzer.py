"""Root-Cause Analysis and Telemetry-Log Correlation Engine."""
from typing import Dict, Any, Optional
from backend.app.schemas.schemas import HostMetrics

class DiagnosisResult:
    def __init__(
        self,
        probable_cause: str,
        confidence_score: float,
        recommended_action: str,
        hypothesis_summary: str,
        supporting_metrics: Dict[str, Any],
        relevant_logs: list
    ):
        self.probable_cause = probable_cause
        self.confidence_score = confidence_score
        self.recommended_action = recommended_action
        self.hypothesis_summary = hypothesis_summary
        self.supporting_metrics = supporting_metrics
        self.relevant_logs = relevant_logs

class RootCauseAnalyzer:
    def diagnose(
        self,
        metric_name: str,
        observed_val: float,
        service_id: Optional[str],
        host_metrics: Optional[HostMetrics],
        last_error_message: Optional[str] = None,
        recent_status_code: Optional[int] = None
    ) -> DiagnosisResult:
        """Correlate metrics and service telemetry to formulate an explainable hypothesis."""
        supporting: Dict[str, Any] = {"observed_value": observed_val}
        logs = []

        if host_metrics:
            supporting["host_cpu_percent"] = host_metrics.cpu_percent
            supporting["host_memory_percent"] = host_metrics.memory_percent
            supporting["host_disk_percent"] = host_metrics.disk_percent

        if last_error_message:
            logs.append(f"HTTP Client: {last_error_message}")

        # Correlation 1: Service Outage / Connection Refused / Port Dead
        if metric_name == "consecutive_failures":
            cause = "Hypothesis: Service process termination or container shutdown."
            rec_action = "restart_test_service"
            confidence = 0.92
            summary = (
                f"Endpoint consecutive failures exceeded threshold. "
                f"Service is not answering HTTP probes. Container or process restart recommended."
            )
            logs.append(f"Probe: Service healthcheck timed out / refused connection ({observed_val} consecutive times).")

        # Correlation 2: High Latency with High CPU (CPU saturation causing queueing)
        elif metric_name == "latency_ms":
            if host_metrics and host_metrics.cpu_percent > 80.0:
                cause = "Hypothesis: Host CPU saturation causing request queuing and latency degradation."
                rec_action = "retry_health_check"
                confidence = 0.88
                summary = f"API latency is {observed_val}ms while host CPU is high at {host_metrics.cpu_percent}%."
                logs.append("Kernel: Thread scheduling pressure detected due to elevated CPU load.")
            else:
                cause = "Hypothesis: Downstream database query stall or blocking I/O."
                rec_action = "retry_health_check"
                confidence = 0.75
                summary = f"API response delay of {observed_val}ms observed without severe host resource exhaustion."
                logs.append("App: Slow HTTP response cycle observed.")

        # Correlation 3: Repeated HTTP 500 Responses
        elif metric_name == "http_5xx_error":
            cause = "Hypothesis: Unhandled runtime exception or unrecoverable microservice internal state."
            rec_action = "restart_test_service"
            confidence = 0.89
            summary = f"Server returned HTTP status {recent_status_code or 500}. Application logic or internal state corrupted."
            logs.append(f"App: HTTP {recent_status_code or 500} returned: {last_error_message or 'Internal Server Error'}")

        # Correlation 4: Host CPU Spike
        elif metric_name == "cpu_percent":
            cause = "Hypothesis: Runaway computation, intensive background worker, or CPU leak."
            rec_action = "retry_health_check"
            confidence = 0.84
            summary = f"Host CPU spike reached {observed_val}%. Monitoring workload cooldown recommended."
            logs.append(f"OS Telemetry: CPU peak at {observed_val}%.")

        # Correlation 5: Host Memory Saturation
        elif metric_name == "memory_percent":
            cause = "Hypothesis: Memory exhaustion or progressive resource leak."
            rec_action = "escalate_incident" if observed_val > 95.0 else "retry_health_check"
            confidence = 0.85
            summary = f"System RAM usage at {observed_val}%. Potential Out-Of-Memory (OOM) risk."
            logs.append(f"OS Telemetry: Memory allocation warning at {observed_val}%.")

        # Correlation 6: Disk Space Full
        elif metric_name == "disk_percent":
            cause = "Hypothesis: Unrotated logs, cache accumulation, or excessive disk usage."
            rec_action = "escalate_incident"
            confidence = 0.95
            summary = f"Persistent storage partition usage at {observed_val}%. Storage capacity threshold exceeded."
            logs.append(f"Filesystem: Free blocks low on primary partition.")

        # Correlation 7: ML Multivariate Anomaly
        elif metric_name == "multivariate_host_telemetry":
            cause = "Hypothesis: Statistical multi-variable telemetry drift detected by Isolation Forest."
            rec_action = "retry_health_check"
            confidence = round(float(observed_val), 2)
            summary = f"Unusual joint distribution across host CPU, RAM, and Disk metrics."
            logs.append("ML Engine: Outlier pattern identified by Isolation Forest.")

        else:
            cause = "Hypothesis: General operational anomaly."
            rec_action = "retry_health_check"
            confidence = 0.70
            summary = f"Anomaly observed for {metric_name} with value {observed_val}."

        return DiagnosisResult(
            probable_cause=cause,
            confidence_score=confidence,
            recommended_action=rec_action,
            hypothesis_summary=summary,
            supporting_metrics=supporting,
            relevant_logs=logs
        )

root_cause_analyzer = RootCauseAnalyzer()
