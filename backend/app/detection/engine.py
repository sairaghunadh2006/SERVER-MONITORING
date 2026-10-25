"""Anomaly Detection and Incident Lifecycle Coordinator."""
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import List
from sqlalchemy.orm import Session

from backend.app.models.models import Incident, Service, AuditLog, MetricRecord, ServiceMetricRecord
from backend.app.schemas.schemas import HostMetrics
from backend.app.detection.rule_detector import rule_detector, AnomalyCandidate
from backend.app.detection.ml_detector import ml_detector
from backend.app.diagnosis.analyzer import root_cause_analyzer
from backend.app.core.config import config
from backend.app.core.logging_config import logger

class AnomalyEngine:
    def process_host_telemetry(self, db: Session, host: HostMetrics) -> List[Incident]:
        """Evaluate host metrics against rules and ML model, managing incident lifecycle."""
        candidates: List[AnomalyCandidate] = rule_detector.evaluate_host_metrics(host)
        
        # ML detection if model is fit
        ml_candidates = ml_detector.evaluate(host)
        candidates.extend(ml_candidates)

        active_incidents = []
        now = datetime.now(timezone.utc)

        for cand in candidates:
            # Check for existing open/investigating/recovering incident for deduplication
            existing = (
                db.query(Incident)
                .filter(
                    Incident.metric_name == cand.metric_name,
                    Incident.service_id == None,
                    Incident.status.in_(["open", "investigating", "recovering"])
                )
                .first()
            )

            if existing:
                # Update existing incident telemetry rather than duplicating
                existing.observed_value = cand.observed_value
                evidence = existing.get_evidence()
                evidence.update(cand.evidence)
                existing.supporting_evidence = json.dumps(evidence)
                db.commit()
                active_incidents.append(existing)
            else:
                # Run root cause diagnosis
                diag = root_cause_analyzer.diagnose(
                    metric_name=cand.metric_name,
                    observed_val=cand.observed_value,
                    service_id=None,
                    host_metrics=host
                )

                inc_id = f"INC-HOST-{uuid.uuid4().hex[:6].upper()}"
                evidence_payload = {
                    **cand.evidence,
                    "hypothesis": diag.hypothesis_summary,
                    "relevant_logs": diag.relevant_logs,
                    "supporting_metrics": diag.supporting_metrics
                }

                new_inc = Incident(
                    id=inc_id,
                    title=cand.title,
                    service_id=None,
                    severity=cand.severity,
                    status="open",
                    metric_name=cand.metric_name,
                    observed_value=cand.observed_value,
                    threshold_value=cand.threshold_value,
                    detection_method=cand.detection_method,
                    description=cand.description,
                    probable_cause=diag.probable_cause,
                    confidence_score=diag.confidence_score,
                    supporting_evidence=json.dumps(evidence_payload),
                    recommended_action=diag.recommended_action,
                    recovery_state="pending_approval" if diag.recommended_action != "escalate_incident" else "escalated",
                    created_at=now
                )
                db.add(new_inc)

                # Add Audit Log
                audit = AuditLog(
                    timestamp=now,
                    event_type="incident_created",
                    severity="warning" if cand.severity in ("low", "medium") else "critical",
                    target_id=inc_id,
                    actor="anomaly_detector",
                    details=json.dumps({"metric": cand.metric_name, "value": cand.observed_value, "severity": cand.severity})
                )
                db.add(audit)
                db.commit()
                db.refresh(new_inc)
                active_incidents.append(new_inc)
                logger.warning(f"New Incident created: {inc_id} - {cand.title}")

        return active_incidents

    def process_service_telemetry(self, db: Session, service: Service, metric: ServiceMetricRecord) -> List[Incident]:
        """Evaluate service metrics against rules and handle incident transitions."""
        candidates = rule_detector.evaluate_service_metric(service, metric)
        active_incidents = []
        now = datetime.now(timezone.utc)

        for cand in candidates:
            existing = (
                db.query(Incident)
                .filter(
                    Incident.service_id == service.id,
                    Incident.metric_name == cand.metric_name,
                    Incident.status.in_(["open", "investigating", "recovering"])
                )
                .first()
            )

            if existing:
                existing.observed_value = cand.observed_value
                evidence = existing.get_evidence()
                evidence.update(cand.evidence)
                existing.supporting_evidence = json.dumps(evidence)
                db.commit()
                active_incidents.append(existing)
            else:
                diag = root_cause_analyzer.diagnose(
                    metric_name=cand.metric_name,
                    observed_val=cand.observed_value,
                    service_id=service.id,
                    host_metrics=None,
                    last_error_message=metric.error_message,
                    recent_status_code=metric.status_code
                )

                inc_id = f"INC-SVC-{uuid.uuid4().hex[:6].upper()}"
                evidence_payload = {
                    **cand.evidence,
                    "hypothesis": diag.hypothesis_summary,
                    "relevant_logs": diag.relevant_logs,
                    "supporting_metrics": diag.supporting_metrics
                }

                new_inc = Incident(
                    id=inc_id,
                    title=cand.title,
                    service_id=service.id,
                    severity=cand.severity,
                    status="open",
                    metric_name=cand.metric_name,
                    observed_value=cand.observed_value,
                    threshold_value=cand.threshold_value,
                    detection_method=cand.detection_method,
                    description=cand.description,
                    probable_cause=diag.probable_cause,
                    confidence_score=diag.confidence_score,
                    supporting_evidence=json.dumps(evidence_payload),
                    recommended_action=diag.recommended_action,
                    recovery_state="pending_approval" if diag.recommended_action != "escalate_incident" else "escalated",
                    created_at=now
                )
                db.add(new_inc)

                audit = AuditLog(
                    timestamp=now,
                    event_type="incident_created",
                    severity="critical" if cand.severity == "critical" else "warning",
                    target_id=inc_id,
                    actor="anomaly_detector",
                    details=json.dumps({"service": service.id, "metric": cand.metric_name, "severity": cand.severity})
                )
                db.add(audit)
                db.commit()
                db.refresh(new_inc)
                active_incidents.append(new_inc)
                logger.warning(f"New Service Incident created: {inc_id} - {cand.title}")

        return active_incidents

anomaly_engine = AnomalyEngine()
