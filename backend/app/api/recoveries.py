"""Recovery Audit and Action History API."""
from typing import List, Optional
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.models import RecoveryAction
from backend.app.schemas.schemas import RecoveryOut

router = APIRouter(prefix="/api/recoveries", tags=["Recoveries"])

def map_recovery_to_out(rec: RecoveryAction) -> RecoveryOut:
    return RecoveryOut(
        id=rec.id,
        incident_id=rec.incident_id,
        service_id=rec.service_id,
        action_type=rec.action_type,
        is_simulated=rec.is_simulated,
        requested_by=rec.requested_by,
        execution_status=rec.execution_status,
        pre_recovery_state=json.loads(rec.pre_recovery_state or "{}"),
        post_recovery_state=json.loads(rec.post_recovery_state or "{}"),
        verification_passed=rec.verification_passed,
        output_message=rec.output_message or "",
        started_at=rec.started_at,
        completed_at=rec.completed_at
    )

@router.get("", response_model=List[RecoveryOut])
def list_recoveries(
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Retrieve history of recovery actions, before-and-after states, and verifications."""
    query = db.query(RecoveryAction)
    if status:
        query = query.filter(RecoveryAction.execution_status == status)
    actions = query.order_by(RecoveryAction.started_at.desc()).limit(limit).all()
    return [map_recovery_to_out(r) for r in actions]

@router.get("/{recovery_id}", response_model=RecoveryOut)
def get_recovery(recovery_id: str, db: Session = Depends(get_db)):
    rec = db.query(RecoveryAction).filter(RecoveryAction.id == recovery_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recovery action not found")
    return map_recovery_to_out(rec)
