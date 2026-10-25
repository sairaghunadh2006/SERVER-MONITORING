"""Pydantic schemas for request/response validation."""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# --- Health & Status ---
class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    timestamp: datetime
    uptime_seconds: float
    database: str
    docker_available: bool

# --- Metrics ---
class HostMetrics(BaseModel):
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    memory_used_bytes: int
    memory_total_bytes: int
    disk_percent: float
    disk_used_bytes: int
    disk_total_bytes: int
    uptime_seconds: float
    is_simulated: bool = False

class ServiceMetrics(BaseModel):
    timestamp: datetime
    service_id: str
    status_code: Optional[int]
    response_time_ms: float
    is_success: bool
    error_message: Optional[str] = None
    is_simulated: bool = False

class MetricsOverview(BaseModel):
    host: HostMetrics
    avg_latency_ms: float
    http_error_rate_percent: float
    total_services: int
    healthy_services: int
    unhealthy_services: int
    open_incidents: int
    active_recovery: Optional[str] = None

class MetricHistoryPoint(BaseModel):
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    disk_percent: float
    avg_latency_ms: float
    error_rate_percent: float

# --- Services ---
class ServiceCreate(BaseModel):
    id: str = Field(..., min_length=2, max_length=64)
    name: str = Field(..., min_length=2, max_length=128)
    description: Optional[str] = ""
    health_url: str = Field(..., min_length=7, max_length=512)
    enabled: bool = True

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    health_url: Optional[str] = None
    enabled: Optional[bool] = None

class ServiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    health_url: str
    enabled: bool
    status: str
    last_check_time: Optional[datetime]
    last_response_time_ms: float
    recent_failure_count: int
    created_at: datetime
    updated_at: datetime

# --- Incidents ---
class IncidentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    service_id: Optional[str]
    severity: str
    status: str
    metric_name: str
    observed_value: float
    threshold_value: float
    detection_method: str
    description: str
    probable_cause: str
    confidence_score: float
    supporting_evidence: Dict[str, Any]
    recommended_action: str
    recovery_state: str
    created_at: datetime
    resolved_at: Optional[datetime]
    acknowledged_at: Optional[datetime]

class IncidentAcknowledge(BaseModel):
    acknowledged_by: str = "operator"

# --- Recovery ---
class RecoveryRequest(BaseModel):
    action_type: str = Field(..., description="Approved action: retry_health_check, restart_test_service, verify_service_health, escalate_incident")
    is_dry_run: bool = False
    requested_by: str = "operator"
    override_reason: Optional[str] = None

class RecoveryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    incident_id: str
    service_id: Optional[str]
    action_type: str
    is_simulated: bool
    requested_by: str
    execution_status: str
    pre_recovery_state: Dict[str, Any]
    post_recovery_state: Dict[str, Any]
    verification_passed: Optional[bool]
    output_message: str
    started_at: datetime
    completed_at: Optional[datetime]

# --- Audit ---
class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    event_type: str
    severity: str
    target_id: Optional[str]
    actor: str
    details: Dict[str, Any]

# --- Settings ---
class SettingsUpdate(BaseModel):
    polling_interval_seconds: Optional[int] = Field(None, ge=2, le=60)
    cpu_threshold_percent: Optional[float] = Field(None, ge=10.0, le=100.0)
    memory_threshold_percent: Optional[float] = Field(None, ge=10.0, le=100.0)
    disk_threshold_percent: Optional[float] = Field(None, ge=10.0, le=100.0)
    latency_threshold_ms: Optional[float] = Field(None, ge=50.0, le=10000.0)
    http_failure_threshold: Optional[int] = Field(None, ge=1, le=20)
    consecutive_failures_threshold: Optional[int] = Field(None, ge=1, le=20)
    recovery_cooldown_seconds: Optional[int] = Field(None, ge=5, le=600)
    max_recovery_retries: Optional[int] = Field(None, ge=1, le=10)
    enable_ml_detection: Optional[bool] = None
    demo_mode: Optional[bool] = None

class SettingsOut(BaseModel):
    polling_interval_seconds: int
    cpu_threshold_percent: float
    memory_threshold_percent: float
    disk_threshold_percent: float
    latency_threshold_ms: float
    http_failure_threshold: int
    consecutive_failures_threshold: int
    recovery_cooldown_seconds: int
    max_recovery_retries: int
    enable_ml_detection: bool
    demo_mode: bool
    docker_container_name: str
    docker_available: bool
    test_service_url: str

# --- Demo Scenarios ---
class ScenarioTrigger(BaseModel):
    scenario: str = Field(..., description="normal, high_cpu, high_memory, slow_api, repeated_500, service_down, successful_recovery, failed_recovery_escalate")
