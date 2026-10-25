"""Test API endpoints using FastAPI TestClient with lifespan context."""
import os
os.environ["TESTING"] = "1"
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_api_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("ok", "degraded")
    assert "version" in data
    assert "database" in data

def test_api_metrics_endpoint(client):
    res = client.get("/api/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "host" in data
    assert "avg_latency_ms" in data
    assert "total_services" in data
    assert data["host"]["cpu_percent"] >= 0.0

def test_api_services_endpoint(client):
    res = client.get("/api/services")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(s["id"] == "svc-order-api" for s in data)

def test_api_settings_update_validation(client):
    # Valid update
    res = client.put("/api/settings", json={"cpu_threshold_percent": 88.0})
    assert res.status_code == 200
    assert res.json()["cpu_threshold_percent"] == 88.0

    # Invalid range rejection (< 10 or > 100)
    res_bad = client.put("/api/settings", json={"cpu_threshold_percent": 150.0})
    assert res_bad.status_code == 422

def test_api_demo_scenarios(client):
    # Trigger High CPU scenario
    res = client.post("/api/demo/scenario", json={"scenario": "high_cpu"})
    assert res.status_code == 200
    data = res.json()
    assert data["scenario"] == "high_cpu"

    # Reset demo
    res_reset = client.post("/api/demo/reset")
    assert res_reset.status_code == 200
