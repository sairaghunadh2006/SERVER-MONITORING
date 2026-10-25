"""Incident Management and Recovery Execution API."""
from typing import List, Optional
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.models import Incident, RecoveryAction, AuditLog
from backend.app.schemas.schemas import IncidentOut, IncidentAcknowledge, RecoveryRequest, RecoveryOut
from backend.app.recovery.executor import recovery_executor

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])

def map_incident_to_out(inc: Incident) -> IncidentOut:
    return IncidentOut(
        id=inc.id,
        title=inc.title,
        service_id=inc.service_id,
        severity=inc.severity,
        status=inc.status,
        metric_name=inc.metric_name,
        observed_value=inc.observed_value,
        threshold_value=inc.threshold_value,
        detection_method=inc.detection_method,
        description=inc.description,
        probable_cause=inc.probable_cause,
        confidence_score=inc.confidence_score,
        supporting_evidence=inc.get_evidence(),
        recommended_action=inc.recommended_action,
        recovery_state=inc.recovery_state,
        created_at=inc.created_at,
        resolved_at=inc.resolved_at,
        acknowledged_at=inc.acknowledged_at
    )

@router.get("", response_model=List[IncidentOut])
def list_incidents(
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = None,
    service_id: Optional[str] = None,
    detection_method: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Retrieve operational incidents with multi-parameter filtering."""
    query = db.query(Incident)

    if status_filter:
        query = query.filter(Incident.status == status_filter)
    if severity:
        query = query.filter(Incident.severity == severity)
    if service_id:
        query = query.filter(Incident.service_id == service_id)
    if detection_method:
        query = query.filter(Incident.detection_method == detection_method)

    incidents = query.order_by(Incident.created_at.desc()).limit(limit).all()
    return [map_incident_to_out(inc) for inc in incidents]

@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    """Retrieve full incident details including telemetry evidence and diagnosis."""
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return map_incident_to_out(inc)

@router.post("/{incident_id}/acknowledge", response_model=IncidentOut)
def acknowledge_incident(
    incident_id: str,
    req: IncidentAcknowledge,
    db: Session = Depends(get_db)
):
    """Acknowledge an incident and transition state to investigating."""
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    inc.acknowledged_at = datetime.now(timezone.utc)
    if inc.status == "open":
        inc.status = "investigating"
    
    audit = AuditLog(
        timestamp=datetime.now(timezone.utc),
        event_type="incident_acknowledged",
        severity="info",
        target_id=incident_id,
        actor=req.acknowledged_by,
        details=f"Incident acknowledged by {req.acknowledged_by}"
    )
    db.add(audit)
    db.commit()
    db.refresh(inc)
    return map_incident_to_out(inc)

@router.post("/{incident_id}/recover", response_model=RecoveryOut)
async def trigger_recovery(
    incident_id: str,
    req: RecoveryRequest,
    db: Session = Depends(get_db)
):
    """Initiate an allowlisted, safe self-recovery operation for an active incident."""
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    passed, message, action_rec = await recovery_executor.execute_recovery(db, inc, req)
    
    # Map to schema
    pre = json.loads(action_rec.pre_recovery_state or "{}")
    post = json.loads(action_rec.post_recovery_state or "{}")

    return RecoveryOut(
        id=action_rec.id,
        incident_id=action_rec.incident_id,
        service_id=action_rec.service_id,
        action_type=action_rec.action_type,
        is_simulated=action_rec.is_simulated,
        requested_by=action_rec.requested_by,
        execution_status=action_rec.execution_status,
        pre_recovery_state=pre,
        post_recovery_state=post,
        verification_passed=action_rec.verification_passed,
        output_message=action_rec.output_message,
        started_at=action_rec.started_at,
        completed_at=action_rec.completed_at
    )
