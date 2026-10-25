"""Audit Log Trail API."""
from typing import List, Optional
import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.models import AuditLog
from backend.app.schemas.schemas import AuditLogOut

router = APIRouter(prefix="/api/audit", tags=["Audit"])

def map_audit_to_out(log: AuditLog) -> AuditLogOut:
    try:
        details_obj = json.loads(log.details or "{}") if isinstance(log.details, str) else log.details
    except Exception:
        details_obj = {"raw": log.details}
    
    return AuditLogOut(
        id=log.id,
        timestamp=log.timestamp,
        event_type=log.event_type,
        severity=log.severity,
        target_id=log.target_id,
        actor=log.actor,
        details=details_obj
    )

@router.get("", response_model=List[AuditLogOut])
def list_audit_logs(
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(100, ge=10, le=500),
    db: Session = Depends(get_db)
):
    """Retrieve immutable chronological audit logs."""
    query = db.query(AuditLog)
    if event_type:
        query = query.filter(AuditLog.event_type == event_type)
    if severity:
        query = query.filter(AuditLog.severity == severity)
    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [map_audit_to_out(l) for l in logs]
