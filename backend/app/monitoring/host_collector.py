"""Real Host Metrics Collector using psutil with safe non-blocking calls."""
import time
from datetime import datetime, timezone
import psutil
from backend.app.schemas.schemas import HostMetrics

class HostMetricsCollector:
    def __init__(self):
        # Warm up psutil cpu measurement
        try:
            psutil.cpu_percent(interval=None)
        except Exception:
            pass
        self._simulated_override: dict = {}

    def set_simulation(self, cpu: float = None, memory: float = None, disk: float = None):
        """Used strictly in Demo Lab when testing simulated scenarios."""
        self._simulated_override = {}
        if cpu is not None:
            self._simulated_override["cpu"] = cpu
        if memory is not None:
            self._simulated_override["memory"] = memory
        if disk is not None:
            self._simulated_override["disk"] = disk

    def clear_simulation(self):
        self._simulated_override = {}

    def collect(self) -> HostMetrics:
        """Collect host metrics safely. Non-blocking."""
        now = datetime.now(timezone.utc)
        try:
            # interval=None ensures non-blocking return of recent CPU utilization
            cpu_val = psutil.cpu_percent(interval=None)
            mem = psutil.virtual_memory()
            
            # Platform independent disk root
            disk_path = "C:\\" if psutil.WINDOWS else "/"
            try:
                disk = psutil.disk_usage(disk_path)
            except Exception:
                disk = psutil.disk_usage(".")

            boot_time = psutil.boot_time()
            uptime = max(0.0, time.time() - boot_time)

            is_sim = bool(self._simulated_override)
            final_cpu = self._simulated_override.get("cpu", cpu_val)
            final_mem = self._simulated_override.get("memory", mem.percent)
            final_disk = self._simulated_override.get("disk", disk.percent)

            return HostMetrics(
                timestamp=now,
                cpu_percent=round(float(final_cpu), 1),
                memory_percent=round(float(final_mem), 1),
                memory_used_bytes=int(mem.used),
                memory_total_bytes=int(mem.total),
                disk_percent=round(float(final_disk), 1),
                disk_used_bytes=int(disk.used),
                disk_total_bytes=int(disk.total),
                uptime_seconds=round(uptime, 1),
                is_simulated=is_sim
            )
        except Exception as e:
            # Fail gracefully with fallback metrics
            return HostMetrics(
                timestamp=now,
                cpu_percent=0.0,
                memory_percent=0.0,
                memory_used_bytes=0,
                memory_total_bytes=0,
                disk_percent=0.0,
                disk_used_bytes=0,
                disk_total_bytes=0,
                uptime_seconds=0.0,
                is_simulated=False
            )

host_collector = HostMetricsCollector()
