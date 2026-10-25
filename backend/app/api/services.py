"""Service Management and Health Check API."""
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.models import Service, AuditLog
from backend.app.schemas.schemas import ServiceOut, ServiceCreate, ServiceUpdate
from backend.app.monitoring.http_collector import is_safe_url
from backend.app.monitoring.service_monitor import service_monitor

router = APIRouter(prefix="/api/services", tags=["Services"])

@router.get("", response_model=List[ServiceOut])
def list_services(db: Session = Depends(get_db)):
    """List all registered microservices and their current health status."""
    return db.query(Service).order_by(Service.name.asc()).all()

@router.get("/{service_id}", response_model=ServiceOut)
def get_service(service_id: str, db: Session = Depends(get_db)):
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    return svc

@router.post("", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
def register_service(req: ServiceCreate, db: Session = Depends(get_db)):
    """Register a new service with safety URL validation."""
    if not is_safe_url(req.health_url):
        raise HTTPException(
            status_code=400,
            detail="Health check URL is not permitted. Only approved local test service endpoints are allowed."
        )

    existing = db.query(Service).filter(Service.id == req.id).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Service ID '{req.id}' is already registered.")

    now = datetime.now(timezone.utc)
    new_svc = Service(
        id=req.id,
        name=req.name,
        description=req.description or "",
        health_url=req.health_url,
        enabled=req.enabled,
        status="unknown",
        created_at=now,
        updated_at=now
    )
    db.add(new_svc)

    audit = AuditLog(
        timestamp=now,
        event_type="service_registered",
        severity="info",
        target_id=req.id,
        actor="operator",
        details=f"Registered service {req.name} ({req.health_url})"
    )
    db.add(audit)
    db.commit()
    db.refresh(new_svc)
    return new_svc

@router.put("/{service_id}", response_model=ServiceOut)
def update_service(service_id: str, req: ServiceUpdate, db: Session = Depends(get_db)):
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")

    if req.health_url is not None:
        if not is_safe_url(req.health_url):
            raise HTTPException(status_code=400, detail="Health check URL not permitted.")
        svc.health_url = req.health_url

    if req.name is not None:
        svc.name = req.name
    if req.description is not None:
        svc.description = req.description
    if req.enabled is not None:
        svc.enabled = req.enabled

    svc.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(svc)
    return svc

@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(service_id: str, db: Session = Depends(get_db)):
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    db.delete(svc)
    db.commit()
    return None

@router.post("/{service_id}/check", response_model=ServiceOut)
async def check_service_now(service_id: str, db: Session = Depends(get_db)):
    """Trigger an immediate on-demand health check for a specific service."""
    svc = db.query(Service).filter(Service.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    await service_monitor.check_service(db, svc)
    return svc
