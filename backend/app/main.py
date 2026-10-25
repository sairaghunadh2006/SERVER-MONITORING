import os
import asyncio
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.app.core.config import config
from backend.app.core.database import engine, Base, SessionLocal
from backend.app.core.logging_config import logger
from backend.app.models.models import Service, MetricRecord, AuditLog
from backend.app.monitoring.host_collector import host_collector
from backend.app.monitoring.service_monitor import service_monitor
from backend.app.detection.engine import anomaly_engine
from backend.app.detection.ml_detector import ml_detector

from backend.app.api.health import router as health_router
from backend.app.api.metrics import router as metrics_router
from backend.app.api.services import router as services_router
from backend.app.api.incidents import router as incidents_router
from backend.app.api.recoveries import router as recoveries_router
from backend.app.api.audit import router as audit_router
from backend.app.api.settings import router as settings_router
from backend.app.api.demo import router as demo_router

# Initialize Database Schema
Base.metadata.create_all(bind=engine)

def seed_initial_data():
    """Seed initial demo services and baseline settings."""
    db: Session = SessionLocal()
    try:
        existing = db.query(Service).all()
        if not existing:
            default_services = [
                Service(
                    id="svc-order-api",
                    name="Order Processing API",
                    description="Primary checkout, billing and fulfillment microservice",
                    health_url=f"{config.test_service_url}/health",
                    enabled=True,
                    status="healthy",
                    last_response_time_ms=42.0,
                    recent_failure_count=0
                ),
                Service(
                    id="svc-auth-api",
                    name="Identity & Access Service",
                    description="OAuth2 and user authentication token provider",
                    health_url=f"{config.test_service_url}/auth/health",
                    enabled=True,
                    status="healthy",
                    last_response_time_ms=28.5,
                    recent_failure_count=0
                ),
                Service(
                    id="svc-inventory-api",
                    name="Inventory Tracking Service",
                    description="Real-time stock warehouse catalog queries",
                    health_url=f"{config.test_service_url}/inventory/health",
                    enabled=True,
                    status="healthy",
                    last_response_time_ms=35.0,
                    recent_failure_count=0
                )
            ]
            db.add_all(default_services)

            # Audit log for seed
            db.add(AuditLog(
                timestamp=datetime.now(timezone.utc),
                event_type="system_startup",
                severity="info",
                target_id="system",
                actor="system",
                details="Seeded default microservices and initialized database schema."
            ))
            db.commit()
            logger.info("Default microservices seeded.")
    finally:
        db.close()

# Background monitoring loop
_monitoring_task = None
_should_run_monitor = True

async def monitoring_worker():
    """Continuous background loop for host and service telemetry collection."""
    logger.info(f"Starting PulseOps monitoring worker (interval: {config.polling_interval_seconds}s)")
    while _should_run_monitor:
        try:
            db: Session = SessionLocal()
            try:
                # 1. Collect Host Metrics
                host = host_collector.collect()
                rec = MetricRecord(
                    timestamp=host.timestamp,
                    cpu_percent=host.cpu_percent,
                    memory_percent=host.memory_percent,
                    memory_used_bytes=host.memory_used_bytes,
                    memory_total_bytes=host.memory_total_bytes,
                    disk_percent=host.disk_percent,
                    disk_used_bytes=host.disk_used_bytes,
                    disk_total_bytes=host.disk_total_bytes,
                    uptime_seconds=host.uptime_seconds,
                    is_simulated=host.is_simulated
                )
                db.add(rec)
                db.commit()

                # 2. Evaluate Host Anomaly Detection
                anomaly_engine.process_host_telemetry(db, host)

                # 3. Poll Registered Services
                await service_monitor.check_all_active_services(db)

                # 4. Periodically fit ML detector
                ml_detector.fit_if_needed(db)

                # 5. Bound metric history to prevent unbounded database growth
                total_records = db.query(MetricRecord).count()
                if total_records > config.max_metric_history_records:
                    oldest_id = db.query(MetricRecord.id).order_by(MetricRecord.timestamp.asc()).first()
                    if oldest_id:
                        db.query(MetricRecord).filter(MetricRecord.id <= oldest_id[0] + 50).delete()
                        db.commit()

            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error in monitoring loop: {e}")

        await asyncio.sleep(config.polling_interval_seconds)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _monitoring_task, _should_run_monitor
    seed_initial_data()
    _should_run_monitor = True
    if os.getenv("TESTING") != "1":
        _monitoring_task = asyncio.create_task(monitoring_worker())
        logger.info("PulseOps background monitoring worker started.")
    else:
        logger.info("PulseOps background monitoring worker skipped in test mode.")
    yield
    _should_run_monitor = False
    if _monitoring_task and not _monitoring_task.done():
        _monitoring_task.cancel()
    logger.info("PulseOps lifespan exited.")

app = FastAPI(
    title="PulseOps API",
    description="Autonomous Server Monitoring and Self-Recovery System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins if config.cors_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(health_router)
app.include_router(metrics_router)
app.include_router(services_router)
app.include_router(incidents_router)
app.include_router(recoveries_router)
app.include_router(audit_router)
app.include_router(settings_router)
app.include_router(demo_router)

@app.get("/")
def root():
    return {
        "name": "PulseOps AI-Powered Server Monitoring and Self-Recovery System",
        "docs_url": "/docs",
        "health_url": "/api/health",
        "status": "operational"
    }
