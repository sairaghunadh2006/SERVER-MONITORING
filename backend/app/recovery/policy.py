"""Recovery Policy and Safety Guardrails."""
from datetime import datetime, timezone, timedelta
from typing import Tuple, Optional
from sqlalchemy.orm import Session
from backend.app.models.models import RecoveryAction, Incident
from backend.app.core.config import config

ALLOWLISTED_ACTIONS = {
    "retry_health_check",
    "restart_test_service",
    "verify_service_health",
    "escalate_incident"
}

# In-memory lock set for active recovering services
_active_recovering_services = set()

class RecoveryPolicyEngine:
    def validate_request(
        self,
        db: Session,
        incident: Incident,
        action_type: str,
        is_dry_run: bool = False
    ) -> Tuple[bool, Optional[str]]:
        """Validate an action request against safety guardrails, allowlists, and cooldowns."""
        
        # 1. Action allowlist validation
        if action_type not in ALLOWLISTED_ACTIONS:
            return False, f"Action '{action_type}' rejected: not in approved recovery allowlist."

        # 2. Concurrency Lock
        service_key = incident.service_id or "host"
        if not is_dry_run and service_key in _active_recovering_services:
            return False, f"Concurrent recovery blocked: an action is already in progress for '{service_key}'."

        # Escalate incident is always permitted
        if action_type == "escalate_incident":
            return True, None

        # 3. Maximum Retries Check
        past_attempts = (
            db.query(RecoveryAction)
            .filter(
                RecoveryAction.incident_id == incident.id,
                RecoveryAction.action_type == action_type,
                RecoveryAction.execution_status.in_(["succeeded", "failed"])
            )
            .count()
        )
        if past_attempts >= config.max_recovery_retries:
            return False, (
                f"Retry limit exceeded: maximum {config.max_recovery_retries} attempts reached for this incident. "
                f"Manual escalation required."
            )

        # 4. Cooldown Period Check
        now = datetime.now(timezone.utc)
        cooldown_cutoff = now - timedelta(seconds=config.recovery_cooldown_seconds)
        last_attempt = (
            db.query(RecoveryAction)
            .filter(
                RecoveryAction.incident_id == incident.id,
                RecoveryAction.started_at >= cooldown_cutoff
            )
            .order_by(RecoveryAction.started_at.desc())
            .first()
        )
        if last_attempt and not is_dry_run:
            seconds_left = int(config.recovery_cooldown_seconds - (now - last_attempt.started_at.replace(tzinfo=timezone.utc)).total_seconds())
            if seconds_left > 0:
                return False, f"Cooldown active: please wait {seconds_left}s before initiating another recovery."

        return True, None

    def acquire_lock(self, service_key: str):
        _active_recovering_services.add(service_key)

    def release_lock(self, service_key: str):
        _active_recovering_services.discard(service_key)

recovery_policy = RecoveryPolicyEngine()
