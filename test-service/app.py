"""Dedicated Test Microservice for PulseOps Monitoring and Recovery."""
import asyncio
import time
from fastapi import FastAPI, Response, status

app = FastAPI(title="PulseOps Mock Target Service", version="1.0.0")

# Controllable fault states
_fault_state = {
    "is_crashed": False,
    "error_500": False,
    "latency_delay_seconds": 0.0,
    "call_count": 0
}

@app.get("/health")
async def health_check():
    _fault_state["call_count"] += 1

    if _fault_state["is_crashed"]:
        return Response(
            content='{"status": "crashed", "detail": "Service unavailable: process down"}',
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            media_type="application/json"
        )

    if _fault_state["error_500"]:
        return Response(
            content='{"status": "error", "detail": "Internal Server Error in database driver"}',
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            media_type="application/json"
        )

    if _fault_state["latency_delay_seconds"] > 0:
        await asyncio.sleep(_fault_state["latency_delay_seconds"])

    return {
        "status": "healthy",
        "service": "pulseops-test-service",
        "latency_simulated_seconds": _fault_state["latency_delay_seconds"],
        "timestamp": time.time()
    }

@app.get("/auth/health")
async def auth_health():
    return {"status": "healthy", "service": "auth-service", "version": "1.0.0"}

@app.get("/inventory/health")
async def inventory_health():
    return {"status": "healthy", "service": "inventory-service", "version": "1.0.0"}

@app.post("/fault/latency")
def set_latency_fault(delay_ms: float = 2000.0):
    _fault_state["latency_delay_seconds"] = delay_ms / 1000.0
    return {"message": f"Latency fault set to {delay_ms}ms", "fault_state": _fault_state}

@app.post("/fault/error500")
def set_error_fault():
    _fault_state["error_500"] = True
    return {"message": "HTTP 500 error fault activated", "fault_state": _fault_state}

@app.post("/fault/crash")
def set_crash_fault():
    _fault_state["is_crashed"] = True
    return {"message": "Service crash simulated (HTTP 503)", "fault_state": _fault_state}

@app.post("/fault/recover")
def recover_faults():
    _fault_state["is_crashed"] = False
    _fault_state["error_500"] = False
    _fault_state["latency_delay_seconds"] = 0.0
    return {"message": "All faults cleared. Service recovered to healthy state.", "fault_state": _fault_state}

@app.get("/status")
def get_service_status():
    return {"service": "pulseops-test-service", "fault_state": _fault_state}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
