"""Demo Lab Scenarios API for controlled hackathon evaluation."""
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx

from backend.app.core.database import get_db
from backend.app.models.models import Incident, Service, AuditLog, ServiceMetricRecord
from backend.app.schemas.schemas import ScenarioTrigger, IncidentOut
from backend.app.monitoring.host_collector import host_collector
from backend.app.detection.engine import anomaly_engine
from backend.app.recovery.executor import recovery_executor
from backend.app.schemas.schemas import RecoveryRequest
from backend.app.core.config import config
from backend.app.core.logging_config import logger

router = APIRouter(prefix="/api/demo", tags=["Demo Lab"])

_active_scenario: str = "normal"

@router.get("/status")
def get_demo_status():
    """Get currently active demo scenario."""
    return {
        "active_scenario": _active_scenario,
        "demo_mode": config.demo_mode,
        "is_simulated_host_active": bool(host_collector._simulated_override)
    }

@router.post("/reset")
async def reset_demo(db: Session = Depends(get_db)):
    """Reset all simulated scenarios and restore normal telemetry state."""
    global _active_scenario
    _active_scenario = "normal"
    host_collector.clear_simulation()

    # Reset test service if reachable
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.post(f"{config.test_service_url}/fault/recover")
    except Exception:
        pass

    # Reset any demo service status in DB
    demo_svc = db.query(Service).filter(Service.id == "svc-order-api").first()
    if demo_svc:
        demo_svc.status = "healthy"
        demo_svc.recent_failure_count = 0
        db.commit()

    audit = AuditLog(
        timestamp=datetime.now(timezone.utc),
        event_type="demo_scenario",
        severity="info",
        target_id="demo_lab",
        actor="operator",
        details="Reset demo scenarios to Normal baseline"
    )
    db.add(audit)
    db.commit()

    return {"message": "Demo scenarios reset to normal baseline successfully."}

@router.post("/scenario")
async def trigger_scenario(req: ScenarioTrigger, db: Session = Depends(get_db)):
    """Trigger a specific demo scenario for verification and testing."""
    global _active_scenario
    scenario = req.scenario.lower()
    _active_scenario = scenario
    now = datetime.now(timezone.utc)

    # 1. Normal Operation
    if scenario == "normal":
        await reset_demo(db)
        return {"scenario": "normal", "message": "Baseline normal telemetry active."}

    # 2. High CPU Anomaly
    elif scenario == "high_cpu":
        host_collector.set_simulation(cpu=93.4)
        host = host_collector.collect()
        incidents = anomaly_engine.process_host_telemetry(db, host)
        return {
            "scenario": "high_cpu",
            "message": "Simulated High CPU anomaly (93.4%) injected on Host. Incident generated.",
            "incidents_created": len(incidents)
        }

    # 3. High Memory Anomaly
    elif scenario == "high_memory":
        host_collector.set_simulation(memory=91.8)
        host = host_collector.collect()
        incidents = anomaly_engine.process_host_telemetry(db, host)
        return {
            "scenario": "high_memory",
            "message": "Simulated High Memory anomaly (91.8%) injected on Host. Incident generated.",
            "incidents_created": len(incidents)
        }

    # 4. Slow API Response
    elif scenario == "slow_api":
        # Call test service fault endpoint if reachable
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                await client.post(f"{config.test_service_url}/fault/latency", params={"delay_ms": 2200})
        except Exception:
            pass

        # Also register immediate service metric record
        demo_svc = db.query(Service).filter(Service.id == "svc-order-api").first()
        if not demo_svc:
            demo_svc = Service(
                id="svc-order-api",
                name="Order Processing Service",
                description="Core payment and order fulfillment service",
                health_url=f"{config.test_service_url}/health",
                enabled=True,
                status="degraded",
                last_response_time_ms=2250.0,
                recent_failure_count=0
            )
            db.add(demo_svc)
            db.commit()

        demo_svc.last_response_time_ms = 2250.0
        demo_svc.status = "degraded"
        rec = ServiceMetricRecord(
            service_id=demo_svc.id,
            timestamp=now,
            status_code=200,
            response_time_ms=2250.0,
            is_success=True,
            is_simulated=True
        )
        db.add(rec)
        db.commit()
        incidents = anomaly_engine.process_service_telemetry(db, demo_svc, rec)
        return {
            "scenario": "slow_api",
            "message": "Simulated latency spike (2250ms) injected. Incident generated.",
            "incidents_created": len(incidents)
        }

    # 5. Repeated HTTP 500 Responses
    elif scenario == "repeated_500":
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                await client.post(f"{config.test_service_url}/fault/error500")
        except Exception:
            pass

        demo_svc = db.query(Service).filter(Service.id == "svc-order-api").first()
        if demo_svc:
            demo_svc.status = "degraded"
            rec = ServiceMetricRecord(
                service_id=demo_svc.id,
                timestamp=now,
                status_code=500,
                response_time_ms=180.0,
                is_success=False,
                error_message="HTTP 500 Internal Server Error in payment gateway",
                is_simulated=True
            )
            db.add(rec)
            db.commit()
            incidents = anomaly_engine.process_service_telemetry(db, demo_svc, rec)
            return {
                "scenario": "repeated_500",
                "message": "HTTP 500 Server Error simulated on Order API. Incident generated.",
                "incidents_created": len(incidents)
            }

    # 6. Service Unavailable
    elif scenario == "service_down":
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                await client.post(f"{config.test_service_url}/fault/crash")
        except Exception:
            pass

        demo_svc = db.query(Service).filter(Service.id == "svc-order-api").first()
        if demo_svc:
            demo_svc.status = "unavailable"
            demo_svc.recent_failure_count = 3
            rec = ServiceMetricRecord(
                service_id=demo_svc.id,
                timestamp=now,
                status_code=None,
                response_time_ms=3000.0,
                is_success=False,
                error_message="Connection refused: Service process down",
                is_simulated=True
            )
            db.add(rec)
            db.commit()
            incidents = anomaly_engine.process_service_telemetry(db, demo_svc, rec)
            return {
                "scenario": "service_down",
                "message": "Critical outage simulated: Service unavailable (3 consecutive failures). Incident generated.",
                "incidents_created": len(incidents)
            }

    # 7. End-to-End Successful Recovery
    elif scenario == "successful_recovery":
        # Create an outage incident, then execute recovery, then verify pass
        demo_svc = db.query(Service).filter(Service.id == "svc-order-api").first()
        if demo_svc:
            demo_svc.status = "unavailable"
            demo_svc.recent_failure_count = 3
            rec = ServiceMetricRecord(
                service_id=demo_svc.id,
                timestamp=now,
                status_code=None,
                response_time_ms=0.0,
                is_success=False,
                error_message="Service container crashed",
                is_simulated=True
            )
            db.add(rec)
            db.commit()
            incidents = anomaly_engine.process_service_telemetry(db, demo_svc, rec)
            if incidents:
                inc = incidents[0]
                passed, msg, rec_act = await recovery_executor.execute_recovery(
                    db,
                    inc,
                    RecoveryRequest(action_type="restart_test_service", requested_by="demo_operator")
                )
                return {
                    "scenario": "successful_recovery",
                    "incident_id": inc.id,
                    "recovery_id": rec_act.id,
                    "verified": passed,
                    "message": f"End-to-end recovery executed: {msg}"
                }

    # 8. Failed Recovery and Escalation
    elif scenario == "failed_recovery_escalate":
        demo_svc = db.query(Service).filter(Service.id == "svc-order-api").first()
        if demo_svc:
            demo_svc.status = "unavailable"
            rec = ServiceMetricRecord(
                service_id=demo_svc.id,
                timestamp=now,
                status_code=503,
                response_time_ms=0.0,
                is_success=False,
                error_message="Service unrecoverable - persistent corrupt state",
                is_simulated=True
            )
            db.add(rec)
            db.commit()
            incidents = anomaly_engine.process_service_telemetry(db, demo_svc, rec)
            if incidents:
                inc = incidents[0]
                # Escalate directly
                passed, msg, rec_act = await recovery_executor.execute_recovery(
                    db,
                    inc,
                    RecoveryRequest(
                        action_type="escalate_incident",
                        requested_by="demo_operator",
                        override_reason="Critical corruption detected; automated actions exhausted."
                    )
                )
                return {
                    "scenario": "failed_recovery_escalate",
                    "incident_id": inc.id,
                    "status": inc.status,
                    "recovery_state": inc.recovery_state,
                    "message": f"Escalation executed: {msg}"
                }

    raise HTTPException(status_code=400, detail=f"Unknown scenario '{req.scenario}'")
