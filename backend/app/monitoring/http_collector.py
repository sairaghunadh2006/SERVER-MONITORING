"""HTTP Health Check Collector with safe URL validation and timeouts."""
import time
from urllib.parse import urlparse
from datetime import datetime, timezone
import httpx
from backend.app.schemas.schemas import ServiceMetrics

ALLOWED_HOSTS = {
    "localhost",
    "127.0.0.1",
    "::1",
    "0.0.0.0",
    "test-service",
    "pulseops-test-service",
}

def is_safe_url(url: str) -> bool:
    """Validate that URL points only to approved local or container test services."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = (parsed.hostname or "").lower()
        if not hostname:
            return False
        if hostname in ALLOWED_HOSTS:
            return True
        # Reject private cloud metadata IP (169.254.169.254) and other arbitrary hosts
        return False
    except Exception:
        return False

class HTTPHealthCollector:
    def __init__(self, timeout_seconds: float = 3.0):
        self.timeout = timeout_seconds

    async def check_endpoint(self, service_id: str, url: str) -> ServiceMetrics:
        """Perform an HTTP health check safely with timing and error handling."""
        now = datetime.now(timezone.utc)
        
        if not is_safe_url(url):
            return ServiceMetrics(
                timestamp=now,
                service_id=service_id,
                status_code=None,
                response_time_ms=0.0,
                is_success=False,
                error_message="Access denied: URL host is not in the approved local/test service allowlist.",
                is_simulated=False
            )

        start = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                elapsed_ms = (time.perf_counter() - start) * 1000.0
                
                is_ok = 200 <= response.status_code < 400
                err_msg = None if is_ok else f"HTTP Status {response.status_code}"
                
                return ServiceMetrics(
                    timestamp=now,
                    service_id=service_id,
                    status_code=response.status_code,
                    response_time_ms=round(elapsed_ms, 2),
                    is_success=is_ok,
                    error_message=err_msg,
                    is_simulated=False
                )
        except httpx.TimeoutException:
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            return ServiceMetrics(
                timestamp=now,
                service_id=service_id,
                status_code=None,
                response_time_ms=round(elapsed_ms, 2),
                is_success=False,
                error_message=f"Request timed out after {self.timeout}s",
                is_simulated=False
            )
        except httpx.RequestError as e:
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            return ServiceMetrics(
                timestamp=now,
                service_id=service_id,
                status_code=None,
                response_time_ms=round(elapsed_ms, 2),
                is_success=False,
                error_message=f"Connection failed: {str(e)[:120]}",
                is_simulated=False
            )
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            return ServiceMetrics(
                timestamp=now,
                service_id=service_id,
                status_code=None,
                response_time_ms=round(elapsed_ms, 2),
                is_success=False,
                error_message=f"Unexpected error: {str(e)[:120]}",
                is_simulated=False
            )

http_collector = HTTPHealthCollector()
