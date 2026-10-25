"""SQLAlchemy Database Models for PulseOps."""
from datetime import datetime, timezone
import json
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Service(Base):
    __tablename__ = "services"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    description = Column(String(255), default="")
    health_url = Column(String(512), nullable=False)
    enabled = Column(Boolean, default=True)
    status = Column(String(32), default="unknown")  # healthy, degraded, unavailable, unknown
    last_check_time = Column(DateTime, nullable=True)
    last_response_time_ms = Column(Float, default=0.0)
    recent_failure_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    # Relationships
    service_metrics = relationship("ServiceMetricRecord", back_populates="service", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="service")

class MetricRecord(Base):
    """Host metrics collected via psutil or demo simulator."""
    __tablename__ = "metric_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=utcnow, index=True)
    cpu_percent = Column(Float, nullable=False)
    memory_percent = Column(Float, nullable=False)
    memory_used_bytes = Column(Integer, default=0)
    memory_total_bytes = Column(Integer, default=0)
    disk_percent = Column(Float, nullable=False)
    disk_used_bytes = Column(Integer, default=0)
    disk_total_bytes = Column(Integer, default=0)
    uptime_seconds = Column(Float, default=0.0)
    is_simulated = Column(Boolean, default=False)

    __table_args__ = (
        Index("idx_metric_timestamp", "timestamp"),
    )

class ServiceMetricRecord(Base):
    """HTTP check telemetry for monitored services."""
    __tablename__ = "service_metric_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=utcnow, index=True)
    service_id = Column(String(64), ForeignKey("services.id"), nullable=False)
    status_code = Column(Integer, nullable=True)
    response_time_ms = Column(Float, default=0.0)
    is_success = Column(Boolean, default=True)
    error_message = Column(String(512), nullable=True)
    is_simulated = Column(Boolean, default=False)

    service = relationship("Service", back_populates="service_metrics")

    __table_args__ = (
        Index("idx_service_metric_time", "service_id", "timestamp"),
    )

class Incident(Base):
    """Recorded operational incidents and alerts."""
    __tablename__ = "incidents"

    id = Column(String(64), primary_key=True)
    title = Column(String(255), nullable=False)
    service_id = Column(String(64), ForeignKey("services.id"), nullable=True)
    severity = Column(String(32), nullable=False)  # low, medium, high, critical
    status = Column(String(32), default="open")     # open, investigating, recovering, recovered, unresolved
    metric_name = Column(String(64), nullable=False)
    observed_value = Column(Float, nullable=False)
    threshold_value = Column(Float, nullable=False)
    detection_method = Column(String(32), default="rule_based")  # rule_based, machine_learning
    description = Column(Text, nullable=False)
    probable_cause = Column(Text, nullable=False)
    confidence_score = Column(Float, default=0.85)
    supporting_evidence = Column(Text, default="{}")  # JSON string
    recommended_action = Column(String(128), nullable=False)
    recovery_state = Column(String(32), default="idle")  # idle, pending_approval, in_progress, verified, escalated
    created_at = Column(DateTime, default=utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)

    service = relationship("Service", back_populates="incidents")
    recoveries = relationship("RecoveryAction", back_populates="incident")

    def get_evidence(self) -> dict:
        try:
            return json.loads(self.supporting_evidence or "{}")
        except Exception:
            return {}

class RecoveryAction(Base):
    """Policy-governed recovery executions and verification records."""
    __tablename__ = "recovery_actions"

    id = Column(String(64), primary_key=True)
    incident_id = Column(String(64), ForeignKey("incidents.id"), nullable=False)
    service_id = Column(String(64), nullable=True)
    action_type = Column(String(64), nullable=False)  # retry_health_check, restart_test_service, verify_service_health, escalate_incident
    is_simulated = Column(Boolean, default=False)
    requested_by = Column(String(64), default="operator")
    execution_status = Column(String(32), default="pending")  # pending, running, succeeded, failed, escalated
    pre_recovery_state = Column(Text, default="{}")
    post_recovery_state = Column(Text, default="{}")
    verification_passed = Column(Boolean, nullable=True)
    output_message = Column(Text, default="")
    started_at = Column(DateTime, default=utcnow)
    completed_at = Column(DateTime, nullable=True)

    incident = relationship("Incident", back_populates="recoveries")

class AuditLog(Base):
    """Immutable audit trail for monitoring events and recovery actions."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=utcnow, index=True)
    event_type = Column(String(64), nullable=False)
    severity = Column(String(32), default="info")
    target_id = Column(String(64), nullable=True)
    actor = Column(String(64), default="system")
    details = Column(Text, default="{}")

class SystemSetting(Base):
    """Key-value persistence for runtime configurable settings."""
    __tablename__ = "system_settings"

    key = Column(String(64), primary_key=True)
    value = Column(String(255), nullable=False)
    description = Column(String(255), default="")
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
