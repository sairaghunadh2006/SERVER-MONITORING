"""Comprehensive Automated Test Suite for PulseOps."""
import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.core.database import Base
from backend.app.models.models import Service, MetricRecord, ServiceMetricRecord, Incident, RecoveryAction, AuditLog
from backend.app.schemas.schemas import HostMetrics, ServiceMetrics, RecoveryRequest, ServiceCreate
from backend.app.monitoring.host_collector import HostMetricsCollector
from backend.app.monitoring.http_collector import is_safe_url
from backend.app.detection.rule_detector import RuleAnomalyDetector
from backend.app.diagnosis.analyzer import RootCauseAnalyzer
from backend.app.detection.engine import AnomalyEngine
from backend.app.recovery.policy import RecoveryPolicyEngine
from backend.app.recovery.executor import RecoveryExecutor

# Test in-memory SQLite database
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=test_engine)

# 1. Test Host Metrics Collection
def test_host_metrics_collection():
    collector = HostMetricsCollector()
    metrics = collector.collect()
    assert metrics.cpu_percent >= 0.0
    assert metrics.memory_percent >= 0.0
    assert metrics.disk_percent >= 0.0
    assert not metrics.is_simulated

def test_host_metrics_simulation_separation():
    collector = HostMetricsCollector()
    collector.set_simulation(cpu=95.5)
    metrics = collector.collect()
    assert metrics.cpu_percent == 95.5
    assert metrics.is_simulated is True
    collector.clear_simulation()
    metrics_after = collector.collect()
    assert not metrics_after.is_simulated

# 2. Test Safe URL Validation
def test_safe_url_allowlist():
    assert is_safe_url("http://localhost:8001/health") is True
    assert is_safe_url("http://127.0.0.1:8001/health") is True
    assert is_safe_url("http://test-service:8001/health") is True
    # Dangerous or external targets must be rejected
    assert is_safe_url("http://169.254.169.254/latest/meta-data") is False
    assert is_safe_url("http://malicious.com/api") is False
    assert is_safe_url("ftp://localhost:21") is False

# 3. Test Rule Anomaly Detection & Severity
def test_rule_detection_high_cpu():
    detector = RuleAnomalyDetector()
    high_host = HostMetrics(
        timestamp=datetime.now(timezone.utc),
        cpu_percent=96.0,
        memory_percent=40.0,
        memory_used_bytes=1000,
        memory_total_bytes=2000,
        disk_percent=30.0,
        disk_used_bytes=1000,
        disk_total_bytes=3000,
        uptime_seconds=500.0,
        is_simulated=False
    )
    anomalies = detector.evaluate_host_metrics(high_host)
    assert len(anomalies) == 1
    assert anomalies[0].metric_name == "cpu_percent"
    assert anomalies[0].severity == "critical"
    assert anomalies[0].observed_value == 96.0

def test_rule_detection_service_outage():
    detector = RuleAnomalyDetector()
    svc = Service(id="svc-test", name="Test Service", health_url="http://localhost:8001/health", recent_failure_count=3)
    metric = ServiceMetricRecord(service_id="svc-test", status_code=None, response_time_ms=0.0, is_success=False)
    anomalies = detector.evaluate_service_metric(svc, metric)
    assert len(anomalies) == 1
    assert anomalies[0].metric_name == "consecutive_failures"
    assert anomalies[0].severity == "critical"

# 4. Test Root Cause Diagnosis Evidence
def test_root_cause_diagnosis_evidence():
    analyzer = RootCauseAnalyzer()
    diag = analyzer.diagnose(
        metric_name="latency_ms",
        observed_val=2500.0,
        service_id="svc-test",
        host_metrics=None,
        last_error_message="Slow query in DB"
    )
    assert "latency" in diag.probable_cause.lower() or "delay" in diag.hypothesis_summary.lower()
    assert diag.confidence_score > 0.5
    assert diag.recommended_action == "retry_health_check"
    assert len(diag.relevant_logs) > 0

# 5. Test Incident Deduplication
def test_incident_deduplication(db):
    engine = AnomalyEngine()
    high_host = HostMetrics(
        timestamp=datetime.now(timezone.utc),
        cpu_percent=91.0,
        memory_percent=50.0,
        memory_used_bytes=1000,
        memory_total_bytes=2000,
        disk_percent=30.0,
        disk_used_bytes=1000,
        disk_total_bytes=3000,
        uptime_seconds=500.0,
        is_simulated=False
    )
    # First cycle creates incident
    inc1 = engine.process_host_telemetry(db, high_host)
    assert len(inc1) == 1
    first_id = inc1[0].id

    # Second cycle with same condition should deduplicate and update, not create new incident
    high_host_2 = HostMetrics(
        timestamp=datetime.now(timezone.utc),
        cpu_percent=94.0,
        memory_percent=50.0,
        memory_used_bytes=1000,
        memory_total_bytes=2000,
        disk_percent=30.0,
        disk_used_bytes=1000,
        disk_total_bytes=3000,
        uptime_seconds=505.0,
        is_simulated=False
    )
    inc2 = engine.process_host_telemetry(db, high_host_2)
    assert len(inc2) == 1
    assert inc2[0].id == first_id
    assert inc2[0].observed_value == 94.0
    # Total incidents in DB should still be 1
    assert db.query(Incident).count() == 1

# 6. Test Recovery Allowlist & Policy
def test_recovery_allowlist_validation(db):
    policy = RecoveryPolicyEngine()
    inc = Incident(
        id="INC-TEST-01",
        title="Test Incident",
        severity="high",
        status="open",
        metric_name="cpu_percent",
        observed_value=90.0,
        threshold_value=85.0,
        description="CPU Spike",
        probable_cause="Saturation",
        recommended_action="retry_health_check"
    )
    db.add(inc)
    db.commit()

    # Allowlisted action must pass
    valid, err = policy.validate_request(db, inc, "retry_health_check")
    assert valid is True
    assert err is None

    # Disallowed action must be rejected
    valid_bad, err_bad = policy.validate_request(db, inc, "rm -rf /")
    assert valid_bad is False
    assert "not in approved recovery allowlist" in err_bad

# 7. Test Recovery Dry Run Mode
def test_recovery_dry_run(db):
    import asyncio
    executor = RecoveryExecutor()
    inc = Incident(
        id="INC-TEST-02",
        title="Test Incident",
        severity="critical",
        status="open",
        metric_name="consecutive_failures",
        observed_value=3.0,
        threshold_value=3.0,
        description="Outage",
        probable_cause="Crash",
        recommended_action="restart_test_service"
    )
    db.add(inc)
    db.commit()

    req = RecoveryRequest(action_type="restart_test_service", is_dry_run=True)
    passed, msg, action = asyncio.run(executor.execute_recovery(db, inc, req))
    assert passed is True
    assert "Dry run" in msg
    assert action.is_simulated is True
    # Incident status should NOT have changed to recovered in dry run
    assert inc.status == "open"

# 8. Test Database Persistence and Audit Log
def test_audit_persistence(db):
    audit = AuditLog(
        timestamp=datetime.now(timezone.utc),
        event_type="test_event",
        severity="info",
        target_id="unit-test",
        actor="tester",
        details='{"test": true}'
    )
    db.add(audit)
    db.commit()

    saved = db.query(AuditLog).filter(AuditLog.target_id == "unit-test").first()
    assert saved is not None
    assert saved.event_type == "test_event"
    assert saved.actor == "tester"
