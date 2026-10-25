"""Safe Recovery Execution Service."""
import json
import uuid
import subprocess
import shutil
from datetime import datetime, timezone
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session
import httpx

from backend.app.models.models import Incident, RecoveryAction, AuditLog, Service
from backend.app.schemas.schemas import RecoveryRequest, RecoveryOut
from backend.app.recovery.policy import recovery_policy
from backend.app.recovery.verifier import verifier
from backend.app.monitoring.host_collector import host_collector
from backend.app.core.config import config
from backend.app.core.logging_config import logger

def is_docker_available() -> bool:
    """Check if docker CLI is accessible on PATH."""
    return shutil.which("docker") is not None

class RecoveryExecutor:
    async def execute_recovery(
        self,
        db: Session,
        incident: Incident,
        req: RecoveryRequest
    ) -> Tuple[bool, str, RecoveryAction]:
        """Execute a validated self-recovery action following strict safety policies."""
        
        # 1. Policy & safety check
        valid, err_reason = recovery_policy.validate_request(db, incident, req.action_type, req.is_dry_run)
        if not valid:
            action_id = f"REC-REJECT-{uuid.uuid4().hex[:6].upper()}"
            rejection_rec = RecoveryAction(
                id=action_id,
                incident_id=incident.id,
                service_id=incident.service_id,
                action_type=req.action_type,
                is_simulated=False,
                requested_by=req.requested_by,
                execution_status="failed",
                pre_recovery_state=json.dumps({"incident_status": incident.status}),
                post_recovery_state=json.dumps({}),
                verification_passed=False,
                output_message=err_reason or "Policy validation failed",
                started_at=datetime.now(timezone.utc),
                completed_at=datetime.now(timezone.utc)
            )
            db.add(rejection_rec)
            db.commit()
            return False, err_reason or "Action rejected by policy", rejection_rec

        service_key = incident.service_id or "host"
        recovery_policy.acquire_lock(service_key)
        
        action_id = f"REC-{uuid.uuid4().hex[:6].upper()}"
        now = datetime.now(timezone.utc)

        # Snapshot pre-recovery state
        pre_state = {
            "incident_status": incident.status,
            "metric_name": incident.metric_name,
            "observed_value": incident.observed_value,
            "service_id": incident.service_id,
            "is_dry_run": req.is_dry_run
        }

        # 2. Dry run handling
        if req.is_dry_run:
            recovery_policy.release_lock(service_key)
            action_rec = RecoveryAction(
                id=action_id,
                incident_id=incident.id,
                service_id=incident.service_id,
                action_type=req.action_type,
                is_simulated=True,
                requested_by=req.requested_by,
                execution_status="succeeded",
                pre_recovery_state=json.dumps(pre_state),
                post_recovery_state=json.dumps({"dry_run": True, "predicted_outcome": "Action policy validated; execution bypassed."}),
                verification_passed=True,
                output_message=f"Dry run simulated successfully for action '{req.action_type}'. No system state was modified.",
                started_at=now,
                completed_at=datetime.now(timezone.utc)
            )
            db.add(action_rec)
            db.commit()
            return True, action_rec.output_message, action_rec

        # 3. Real or simulated execution
        incident.status = "recovering"
        incident.recovery_state = "in_progress"
        db.commit()

        is_simulated = False
        exec_message = ""
        docker_available = is_docker_available()

        try:
            if req.action_type == "escalate_incident":
                incident.status = "unresolved"
                incident.recovery_state = "escalated"
                exec_message = "Incident escalated for human engineer review and operational intervention."
                verification_passed = False
                post_evidence = {"escalated": True, "reason": req.override_reason or "Automated recovery bypassed or limits reached"}

            elif req.action_type == "restart_test_service":
                # Real docker container restart or local test service reset
                if docker_available and config.docker_container_name:
                    try:
                        logger.info(f"Executing docker restart on container {config.docker_container_name}")
                        res = subprocess.run(
                            ["docker", "restart", config.docker_container_name],
                            capture_output=True,
                            text=True,
                            timeout=20
                        )
                        if res.returncode == 0:
                            exec_message = f"Docker container '{config.docker_container_name}' restarted successfully."
                            is_simulated = False
                        else:
                            exec_message = f"Docker restart failed: {res.stderr.strip()}"
                            is_simulated = False
                    except Exception as e:
                        exec_message = f"Docker execution error: {str(e)}"
                        is_simulated = False
                else:
                    # Docker is not present: clearly labelled local test service / simulated recovery workflow
                    is_simulated = True
                    # If local test service URL is configured, call its /fault/recover endpoint
                    recovered_via_http = False
                    try:
                        async with httpx.AsyncClient(timeout=3.0) as client:
                            resp = await client.post(f"{config.test_service_url}/fault/recover")
                            if resp.status_code == 200:
                                recovered_via_http = True
                    except Exception:
                        pass
                    
                    if recovered_via_http:
                        exec_message = f"Controlled test-service reset executed via HTTP fault-recovery endpoint (Docker unavailable in environment)."
                    else:
                        exec_message = f"Simulated container restart executed (Docker CLI not installed/available on host)."

            elif req.action_type in ("retry_health_check", "verify_service_health"):
                exec_message = "Triggered verification probes to re-evaluate service endpoint health."
                # Clear host simulated overrides if host incident
                if not incident.service_id:
                    host_collector.clear_simulation()
            else:
                exec_message = f"Executed {req.action_type}."

            # 4. Mandatory post-action health verification
            if req.action_type != "escalate_incident":
                if incident.service_id:
                    svc = db.query(Service).filter(Service.id == incident.service_id).first()
                    if svc:
                        verification_passed, post_evidence, verif_msg = await verifier.verify_service(db, svc)
                        exec_message += f" {verif_msg}"
                    else:
                        verification_passed = False
                        post_evidence = {"error": "Associated service record not found"}
                else:
                    # Host metric verification
                    verification_passed, post_evidence, verif_msg = await verifier.verify_host(incident.metric_name)
                    exec_message += f" {verif_msg}"

                # 5. Incident state transition based on verification
                if verification_passed:
                    incident.status = "recovered"
                    incident.recovery_state = "verified"
                    incident.resolved_at = datetime.now(timezone.utc)
                else:
                    incident.status = "unresolved"
                    incident.recovery_state = "escalated"
            else:
                verification_passed = False

            # Create recovery record
            completed_time = datetime.now(timezone.utc)
            action_rec = RecoveryAction(
                id=action_id,
                incident_id=incident.id,
                service_id=incident.service_id,
                action_type=req.action_type,
                is_simulated=is_simulated,
                requested_by=req.requested_by,
                execution_status="succeeded" if verification_passed else ("escalated" if req.action_type == "escalate_incident" else "failed"),
                pre_recovery_state=json.dumps(pre_state),
                post_recovery_state=json.dumps(post_evidence),
                verification_passed=verification_passed,
                output_message=exec_message,
                started_at=now,
                completed_at=completed_time
            )
            db.add(action_rec)

            # Audit log
            audit = AuditLog(
                timestamp=completed_time,
                event_type="recovery_executed",
                severity="info" if verification_passed else "warning",
                target_id=action_id,
                actor=req.requested_by,
                details=json.dumps({
                    "incident_id": incident.id,
                    "action": req.action_type,
                    "passed": verification_passed,
                    "is_simulated": is_simulated
                })
            )
            db.add(audit)
            db.commit()

            return verification_passed, exec_message, action_rec

        finally:
            recovery_policy.release_lock(service_key)

recovery_executor = RecoveryExecutor()
