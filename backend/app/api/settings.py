"""Runtime System Settings API."""
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.models import AuditLog, SystemSetting
from backend.app.schemas.schemas import SettingsOut, SettingsUpdate
from backend.app.recovery.executor import is_docker_available
from backend.app.core.config import config

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("", response_model=SettingsOut)
def get_settings():
    """Retrieve current runtime threshold and engine settings."""
    return SettingsOut(
        polling_interval_seconds=config.polling_interval_seconds,
        cpu_threshold_percent=config.cpu_threshold_percent,
        memory_threshold_percent=config.memory_threshold_percent,
        disk_threshold_percent=config.disk_threshold_percent,
        latency_threshold_ms=config.latency_threshold_ms,
        http_failure_threshold=config.http_failure_threshold,
        consecutive_failures_threshold=config.consecutive_failures_threshold,
        recovery_cooldown_seconds=config.recovery_cooldown_seconds,
        max_recovery_retries=config.max_recovery_retries,
        enable_ml_detection=config.enable_ml_detection,
        demo_mode=config.demo_mode,
        docker_container_name=config.docker_container_name,
        docker_available=is_docker_available(),
        test_service_url=config.test_service_url
    )

@router.put("", response_model=SettingsOut)
def update_settings(req: SettingsUpdate, db: Session = Depends(get_db)):
    """Update runtime settings with strict backend validation."""
    updated = {}

    if req.polling_interval_seconds is not None:
        config.polling_interval_seconds = req.polling_interval_seconds
        updated["polling_interval_seconds"] = req.polling_interval_seconds

    if req.cpu_threshold_percent is not None:
        config.cpu_threshold_percent = req.cpu_threshold_percent
        updated["cpu_threshold_percent"] = req.cpu_threshold_percent

    if req.memory_threshold_percent is not None:
        config.memory_threshold_percent = req.memory_threshold_percent
        updated["memory_threshold_percent"] = req.memory_threshold_percent

    if req.disk_threshold_percent is not None:
        config.disk_threshold_percent = req.disk_threshold_percent
        updated["disk_threshold_percent"] = req.disk_threshold_percent

    if req.latency_threshold_ms is not None:
        config.latency_threshold_ms = req.latency_threshold_ms
        updated["latency_threshold_ms"] = req.latency_threshold_ms

    if req.http_failure_threshold is not None:
        config.http_failure_threshold = req.http_failure_threshold
        updated["http_failure_threshold"] = req.http_failure_threshold

    if req.consecutive_failures_threshold is not None:
        config.consecutive_failures_threshold = req.consecutive_failures_threshold
        updated["consecutive_failures_threshold"] = req.consecutive_failures_threshold

    if req.recovery_cooldown_seconds is not None:
        config.recovery_cooldown_seconds = req.recovery_cooldown_seconds
        updated["recovery_cooldown_seconds"] = req.recovery_cooldown_seconds

    if req.max_recovery_retries is not None:
        config.max_recovery_retries = req.max_recovery_retries
        updated["max_recovery_retries"] = req.max_recovery_retries

    if req.enable_ml_detection is not None:
        config.enable_ml_detection = req.enable_ml_detection
        updated["enable_ml_detection"] = req.enable_ml_detection

    if req.demo_mode is not None:
        config.demo_mode = req.demo_mode
        updated["demo_mode"] = req.demo_mode

    # Record audit log
    if updated:
        audit = AuditLog(
            timestamp=datetime.now(timezone.utc),
            event_type="settings_updated",
            severity="info",
            target_id="system_config",
            actor="operator",
            details=json.dumps(updated)
        )
        db.add(audit)
        db.commit()

    return get_settings()
