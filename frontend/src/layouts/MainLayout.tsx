import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { Header } from '../components/common/Header';
import { api } from '../services/api';
import { MetricsOverview } from '../types';

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const [dockerAvailable, setDockerAvailable] = useState(false);
  const [metrics, setMetrics] = useState<MetricsOverview | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const location = useLocation();

  // Page title mapping
  const titles: Record<string, { title: string; subtitle: string }> = {
    '/': { title: 'System Overview', subtitle: 'Live telemetry, service availability, and operational health' },
    '/live': { title: 'Live Host Telemetry', subtitle: 'Real-time CPU, memory, and disk utilization via psutil' },
    '/services': { title: 'Service Health Monitoring', subtitle: 'Monitored microservices catalog, HTTP probes, and latencies' },
    '/anomalies': { title: 'Anomaly Detection Engine', subtitle: 'Rule-based triggers and scikit-learn Isolation Forest scores' },
    '/incidents': { title: 'Incident Center', subtitle: 'Operational incidents, root-cause hypotheses, and evidence logs' },
    '/recovery': { title: 'Safe Self-Recovery Center', subtitle: 'Policy-approved remediations, dry-run simulations, and verifications' },
    '/history': { title: 'Incident & Audit History', subtitle: 'Historical timeline of detections, recovery outcomes, and audit logs' },
    '/settings': { title: 'System Settings', subtitle: 'Configurable anomaly thresholds, cooldown intervals, and retry bounds' },
    '/demo': { title: 'Demonstration Lab', subtitle: 'Controlled fault injection scenarios and self-recovery evaluations' }
  };

  const currentInfo = titles[location.pathname] || {
    title: 'PulseOps Sentinel',
    subtitle: 'Server Monitoring and Self-Recovery System'
  };

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const [health, currentMetrics] = await Promise.all([
        api.checkBackendHealth(),
        api.getMetrics()
      ]);
      setIsBackendConnected(health.status === 'ok' || health.status === 'degraded');
      setDockerAvailable(health.docker_available);
      setMetrics(currentMetrics);
    } catch (err) {
      setIsBackendConnected(false);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Safe periodic polling every 5 seconds without overlapping requests
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-[#F0F7FF] flex">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        openIncidentsCount={metrics?.open_incidents || 0}
      />

      {/* Main Container */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          collapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <Header
          title={currentInfo.title}
          subtitle={currentInfo.subtitle}
          isBackendConnected={isBackendConnected}
          dockerAvailable={dockerAvailable}
          isRefreshing={isRefreshing}
          onRefresh={fetchData}
          openIncidentsCount={metrics?.open_incidents || 0}
        />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {!isBackendConnected && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                <span className="text-sm font-semibold">
                  Backend connection unreachable at http://127.0.0.1:8000. Start backend server to restore live telemetry.
                </span>
              </div>
              <button
                onClick={fetchData}
                className="px-3 py-1 bg-white border border-rose-300 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
              >
                Retry Connection
              </button>
            </div>
          )}
          <Outlet context={{ metrics, refreshOverview: fetchData }} />
        </main>
      </div>
    </div>
  );
};
