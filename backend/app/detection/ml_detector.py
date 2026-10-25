"""Modular Machine Learning Anomaly Detector using scikit-learn Isolation Forest."""
from typing import List, Optional
import numpy as np
from sqlalchemy.orm import Session
from backend.app.models.models import MetricRecord
from backend.app.schemas.schemas import HostMetrics
from backend.app.detection.rule_detector import AnomalyCandidate
from backend.app.core.config import config
from backend.app.core.logging_config import logger

try:
    from sklearn.ensemble import IsolationForest
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

class MLAnomalyDetector:
    def __init__(self):
        self.min_samples = 20
        self.model: Optional[Any] = None
        self.is_trained = False
        self.last_trained_sample_count = 0

    def fit_if_needed(self, db: Session):
        """Train IsolationForest if sufficient history exists and feature enabled."""
        if not SKLEARN_AVAILABLE or not config.enable_ml_detection:
            return

        recent_records = (
            db.query(MetricRecord)
            .order_by(MetricRecord.timestamp.desc())
            .limit(100)
            .all()
        )
        if len(recent_records) < self.min_samples:
            self.is_trained = False
            return

        # Prepare feature matrix: [cpu, memory, disk]
        data = np.array([
            [r.cpu_percent, r.memory_percent, r.disk_percent]
            for r in recent_records
        ], dtype=np.float32)

        try:
            clf = IsolationForest(
                n_estimators=50,
                contamination=0.05,
                random_state=42
            )
            clf.fit(data)
            self.model = clf
            self.is_trained = True
            self.last_trained_sample_count = len(recent_records)
        except Exception as e:
            logger.warning(f"Failed to fit IsolationForest: {e}")
            self.is_trained = False

    def evaluate(self, host: HostMetrics) -> List[AnomalyCandidate]:
        """Detect multivariate anomalies using the trained model."""
        if not self.is_trained or self.model is None or not config.enable_ml_detection:
            return []

        features = np.array([[host.cpu_percent, host.memory_percent, host.disk_percent]], dtype=np.float32)
        try:
            # -1 for anomaly, 1 for inlier
            prediction = self.model.predict(features)[0]
            if prediction == -1:
                # Calculate outlier anomaly score (lower is more anomalous)
                score = float(self.model.decision_function(features)[0])
                prob = max(0.5, min(0.99, round(0.5 - score, 2)))
                return [
                    AnomalyCandidate(
                        metric_name="multivariate_host_telemetry",
                        service_id=None,
                        observed_value=round(prob, 2),
                        threshold_value=0.5,
                        severity="medium",
                        title="Multivariate Host Metric Anomaly (Isolation Forest)",
                        description=(
                            f"The scikit-learn Isolation Forest model flagged an unusual joint distribution "
                            f"between CPU ({host.cpu_percent}%), RAM ({host.memory_percent}%), and Disk ({host.disk_percent}%)."
                        ),
                        evidence={
                            "anomaly_score": round(score, 4),
                            "confidence_probability": prob,
                            "training_samples": self.last_trained_sample_count,
                            "features": {
                                "cpu_percent": host.cpu_percent,
                                "memory_percent": host.memory_percent,
                                "disk_percent": host.disk_percent
                            }
                        },
                        detection_method="machine_learning"
                    )
                ]
        except Exception as e:
            logger.warning(f"ML evaluation error: {e}")

        return []

ml_detector = MLAnomalyDetector()
