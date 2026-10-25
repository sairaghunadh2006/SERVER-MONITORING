"""Health and System Status API."""
import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.recovery.executor import is_docker_available
from backend.app.schemas.schemas import HealthResponse

router = APIRouter(prefix="/api/health", tags=["Health"])

START_TIME = time.time()

@router.get("", response_model=HealthResponse)
def get_system_health(db: Session = Depends(get_db)):
    """Return health status of PulseOps backend, database connectivity, and Docker engine."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    return HealthResponse(
        status="ok" if db_status == "connected" else "degraded",
        version="1.0.0",
        timestamp=datetime.now(timezone.utc),
        uptime_seconds=round(time.time() - START_TIME, 1),
        database=db_status,
        docker_available=is_docker_available()
    )
