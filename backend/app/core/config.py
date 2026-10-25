"""Application Configuration Module."""
import os
from typing import List
from pydantic import BaseModel, Field

class AppConfig(BaseModel):
    app_name: str = "PulseOps AI-Powered Server Monitoring"
    environment: str = os.getenv("ENVIRONMENT", "development")
    host: str = os.getenv("PULSEOPS_HOST", "127.0.0.1")
    port: int = int(os.getenv("PULSEOPS_PORT", "8000"))
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./pulseops.db")
    
    # Monitoring intervals & thresholds
    polling_interval_seconds: int = Field(default=int(os.getenv("POLLING_INTERVAL_SECONDS", "5")), ge=2, le=60)
    cpu_threshold_percent: float = Field(default=float(os.getenv("CPU_THRESHOLD_PERCENT", "85.0")), ge=10.0, le=100.0)
    memory_threshold_percent: float = Field(default=float(os.getenv("MEMORY_THRESHOLD_PERCENT", "85.0")), ge=10.0, le=100.0)
    disk_threshold_percent: float = Field(default=float(os.getenv("DISK_THRESHOLD_PERCENT", "90.0")), ge=10.0, le=100.0)
    latency_threshold_ms: float = Field(default=float(os.getenv("LATENCY_THRESHOLD_MS", "1000.0")), ge=50.0, le=10000.0)
    http_failure_threshold: int = Field(default=int(os.getenv("HTTP_FAILURE_THRESHOLD", "3")), ge=1, le=20)
    consecutive_failures_threshold: int = Field(default=int(os.getenv("CONSECUTIVE_FAILURES_THRESHOLD", "3")), ge=1, le=20)
    
    # Recovery policy
    recovery_cooldown_seconds: int = Field(default=int(os.getenv("RECOVERY_COOLDOWN_SECONDS", "60")), ge=5, le=600)
    max_recovery_retries: int = Field(default=int(os.getenv("MAX_RECOVERY_RETRIES", "3")), ge=1, le=10)
    docker_container_name: str = os.getenv("DOCKER_CONTAINER_NAME", "pulseops-test-service")
    test_service_url: str = os.getenv("TEST_SERVICE_URL", "http://127.0.0.1:8001")
    
    # Features & Security
    enable_ml_detection: bool = os.getenv("ENABLE_ML_DETECTION", "true").lower() in ("true", "1", "yes")
    demo_mode: bool = os.getenv("DEMO_MODE", "true").lower() in ("true", "1", "yes")
    cors_origins: List[str] = [
        origin.strip() for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
        ).split(",") if origin.strip()
    ]
    
    # Retention
    max_metric_history_records: int = 2000

config = AppConfig()
