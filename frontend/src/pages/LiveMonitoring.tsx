import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Cpu, Layers, HardDrive, Clock, Activity, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { MetricAreaChart } from '../components/charts/MetricAreaChart';
import { api } from '../services/api';
import { MetricsOverview, MetricHistoryPoint } from '../types';

export const LiveMonitoring: React.FC = () => {
  const { metrics, refreshOverview } = useOutletContext<{
    metrics: MetricsOverview | null;
    refreshOverview: () => void;
  }>();

  const [history, setHistory] = useState<MetricHistoryPoint[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'cpu' | 'memory' | 'disk'>('cpu');
  const [timeRange, setTimeRange] = useState<number>(60);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchHistory() {
      try {
        setIsLoading(true);
        const data = await api.getMetricsHistory(50, timeRange);
        setHistory(data);
      } catch (err) {
        console.error('Failed to fetch history', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const host = metrics?.host;

  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Format uptime helper
  const formatUptime = (seconds: number) => {
    if (!seconds) return '0s';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const metricConfig = {
    cpu: {
      key: 'cpu_percent',
      name: 'CPU Utilization',
      unit: '%',
      color: '#2563EB',
      stroke: '#1D4ED8',
      domain: [0, 100] as [number, number]
    },
    memory: {
      key: 'memory_percent',
      name: 'Memory Utilization',
      unit: '%',
      color: '#0284C7',
      stroke: '#0369A1',
      domain: [0, 100] as [number, number]
    },
    disk: {
      key: 'disk_percent',
      name: 'Storage Partition Utilization',
      unit: '%',
      color: '#6366F1',
      stroke: '#4F46E5',
      domain: [0, 100] as [number, number]
    }
  };

  const active = metricConfig[selectedMetric];

  return (
    <div className="space-y-6">
      {/* Simulation Notice Banner if host simulated */}
      {host?.is_simulated ? (
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
            <div>
              <p className="text-sm font-bold">Simulated Telemetry Active</p>
              <p className="text-xs text-purple-700">
                A demo scenario is currently overriding host metrics. Live hardware metrics are paused.
              </p>
            </div>
          </div>
          <button
            onClick={() => api.resetDemo().then(refreshOverview)}
            className="px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-xs font-semibold text-purple-700 hover:bg-purple-100 transition shadow-xs"
          >
            Reset to Real Hardware Metrics
          </button>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Real-time hardware telemetry collected directly via Python <code className="font-mono font-semibold">psutil</code>.
            </span>
          </div>
          <span className="text-[11px] font-mono text-blue-700 font-semibold bg-white px-2 py-0.5 rounded border border-blue-200">
            Sampling: Non-Blocking
          </span>
        </div>
      )}

      {/* Primary Host Resource Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CPU Detailed Card */}
        <Card
          title="Host CPU Core"
          subtitle="Kernel and user process execution"
          icon={<Cpu className="w-5 h-5" />}
          action={
            <Badge variant={host && host.cpu_percent > 85 ? 'critical' : 'healthy'}>
              {host?.cpu_percent}%
            </Badge>
          }
        >
          <div className="space-y-3">
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  host && host.cpu_percent > 85 ? 'bg-rose-500' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(100, host?.cpu_percent || 0)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Uptime: <strong className="text-slate-700">{formatUptime(host?.uptime_seconds || 0)}</strong></span>
              <span>Mode: <strong className="text-slate-700">{host?.is_simulated ? 'Simulated' : 'Real Hardware'}</strong></span>
            </div>
          </div>
        </Card>

        {/* Memory Detailed Card */}
        <Card
          title="Physical RAM"
          subtitle="Active memory allocation"
          icon={<Layers className="w-5 h-5" />}
          action={
            <Badge variant={host && host.memory_percent > 85 ? 'critical' : 'healthy'}>
              {host?.memory_percent}%
            </Badge>
          }
        >
          <div className="space-y-3">
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  host && host.memory_percent > 85 ? 'bg-amber-500' : 'bg-sky-600'
                }`}
                style={{ width: `${Math.min(100, host?.memory_percent || 0)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Used: <strong className="text-slate-700">{formatBytes(host?.memory_used_bytes || 0)}</strong></span>
              <span>Total: <strong className="text-slate-700">{formatBytes(host?.memory_total_bytes || 0)}</strong></span>
            </div>
          </div>
        </Card>

        {/* Disk Partition Card */}
        <Card
          title="Storage Partition"
          subtitle="Root filesystem blocks"
          icon={<HardDrive className="w-5 h-5" />}
          action={
            <Badge variant={host && host.disk_percent > 90 ? 'critical' : 'healthy'}>
              {host?.disk_percent}%
            </Badge>
          }
        >
          <div className="space-y-3">
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  host && host.disk_percent > 90 ? 'bg-rose-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.min(100, host?.disk_percent || 0)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Allocated: <strong className="text-slate-700">{formatBytes(host?.disk_used_bytes || 0)}</strong></span>
              <span>Capacity: <strong className="text-slate-700">{formatBytes(host?.disk_total_bytes || 0)}</strong></span>
            </div>
          </div>
        </Card>
      </div>

      {/* Historical Telemetry Chart with Selectors */}
      <Card
        title="Telemetry Trend Inspector"
        subtitle="Historical hardware performance over selected interval"
        action={
          <div className="flex items-center gap-2">
            {/* Metric Selector Buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
              <button
                onClick={() => setSelectedMetric('cpu')}
                className={`px-3 py-1 rounded-lg transition ${
                  selectedMetric === 'cpu' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                CPU
              </button>
              <button
                onClick={() => setSelectedMetric('memory')}
                className={`px-3 py-1 rounded-lg transition ${
                  selectedMetric === 'memory' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Memory
              </button>
              <button
                onClick={() => setSelectedMetric('disk')}
                className={`px-3 py-1 rounded-lg transition ${
                  selectedMetric === 'disk' ? 'bg-white text-blue-600 shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Disk
              </button>
            </div>

            {/* Time Range Select */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              aria-label="Historical time range"
              className="text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value={15}>Past 15 Minutes</option>
              <option value={60}>Past 1 Hour</option>
              <option value={360}>Past 6 Hours</option>
              <option value={1440}>Past 24 Hours</option>
            </select>
          </div>
        }
      >
        <div className="mt-2">
          <MetricAreaChart
            data={history}
            dataKey={active.key}
            name={active.name}
            unit={active.unit}
            color={active.color}
            strokeColor={active.stroke}
            domain={active.domain}
            height={320}
          />
        </div>
      </Card>
    </div>
  );
};
