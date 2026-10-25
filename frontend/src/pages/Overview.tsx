import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Cpu,
  Layers,
  HardDrive,
  Clock,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Flame,
  ArrowRight,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { MetricAreaChart } from '../components/charts/MetricAreaChart';
import { Sparkline } from '../components/charts/Sparkline';
import { api } from '../services/api';
import { MetricsOverview, MetricHistoryPoint, Service, Incident, RecoveryAction } from '../types';

export const Overview: React.FC = () => {
  const { metrics, refreshOverview } = useOutletContext<{
    metrics: MetricsOverview | null;
    refreshOverview: () => void;
  }>();

  const [history, setHistory] = useState<MetricHistoryPoint[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [recentRecoveries, setRecentRecoveries] = useState<RecoveryAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [hist, svcs, incs, recs] = await Promise.all([
          api.getMetricsHistory(30, 60),
          api.getServices(),
          api.getIncidents({ limit: 5 } as any),
          api.getRecoveries()
        ]);
        setHistory(hist);
        setServices(svcs);
        setRecentIncidents(incs.slice(0, 5));
        setRecentRecoveries(recs.slice(0, 5));
      } catch (err) {
        console.error('Failed to load overview data', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const cpuTrend = history.map((h) => h.cpu_percent);
  const memTrend = history.map((h) => h.memory_percent);
  const latencyTrend = history.map((h) => h.avg_latency_ms);
  const errorTrend = history.map((h) => h.error_rate_percent);

  const host = metrics?.host;

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. CPU Card */}
        <Card className="hover:border-blue-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CPU Usage</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {host?.cpu_percent ?? 0}%
            </span>
            <Badge variant={host && host.cpu_percent > 85 ? 'critical' : 'healthy'}>
              {host && host.cpu_percent > 85 ? 'Elevated' : 'Normal'}
            </Badge>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <Sparkline data={cpuTrend} color="#2563EB" />
            {host?.is_simulated && (
              <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                Simulated
              </span>
            )}
          </div>
        </Card>

        {/* 2. Memory Card */}
        <Card className="hover:border-blue-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Memory</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {host?.memory_percent ?? 0}%
            </span>
            <Badge variant={host && host.memory_percent > 85 ? 'critical' : 'healthy'}>
              {host && host.memory_percent > 85 ? 'High' : 'Optimal'}
            </Badge>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <Sparkline data={memTrend} color="#1D4ED8" />
            <span className="text-[11px] text-slate-400">
              {host ? `${Math.round(host.memory_used_bytes / (1024 * 1024 * 1024))}GB used` : ''}
            </span>
          </div>
        </Card>

        {/* 3. Disk Card */}
        <Card className="hover:border-blue-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Disk Capacity</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {host?.disk_percent ?? 0}%
            </span>
            <Badge variant={host && host.disk_percent > 90 ? 'critical' : 'healthy'}>
              {host && host.disk_percent > 90 ? 'Critical' : 'Healthy'}
            </Badge>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Primary Root Partition</span>
            <span className="text-[11px] font-medium text-slate-600">
              {host ? `${Math.round(host.disk_used_bytes / (1024 ** 3))}GB` : ''}
            </span>
          </div>
        </Card>

        {/* 4. API Latency Card */}
        <Card className="hover:border-blue-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Latency</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {metrics?.avg_latency_ms ?? 0} <span className="text-sm font-normal text-slate-500">ms</span>
            </span>
            <Badge variant={metrics && metrics.avg_latency_ms > 1000 ? 'degraded' : 'healthy'}>
              {metrics && metrics.avg_latency_ms > 1000 ? 'Slow' : 'Fast'}
            </Badge>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <Sparkline data={latencyTrend} color="#38BDF8" />
            <span className="text-[11px] text-slate-400">5m rolling avg</span>
          </div>
        </Card>

        {/* 5. HTTP Error Rate Card */}
        <Card className="hover:border-blue-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Error Rate</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {metrics?.http_error_rate_percent ?? 0}%
            </span>
            <Badge variant={metrics && metrics.http_error_rate_percent > 5 ? 'critical' : 'healthy'}>
              {metrics && metrics.http_error_rate_percent > 5 ? 'High Errors' : 'Nominal'}
            </Badge>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <Sparkline data={errorTrend} color="#DC2626" />
            <span className="text-[11px] text-slate-400">HTTP 5xx / Timeouts</span>
          </div>
        </Card>

        {/* 6. Healthy Services Card */}
        <Card className="hover:border-blue-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Microservices</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {metrics?.healthy_services ?? 0}
              <span className="text-sm font-normal text-slate-400">/{metrics?.total_services ?? 0}</span>
            </span>
            <Badge variant={metrics && metrics.unhealthy_services > 0 ? 'degraded' : 'healthy'}>
              {metrics && metrics.unhealthy_services > 0 ? `${metrics.unhealthy_services} Impacted` : 'All Green'}
            </Badge>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Automated Probes</span>
            <Link to="/services" className="text-blue-600 font-semibold hover:underline flex items-center gap-0.5">
              Inspect <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="CPU Utilization Over Time" subtitle="Real-time Host processor usage percentage">
          <MetricAreaChart
            data={history}
            dataKey="cpu_percent"
            name="CPU Usage"
            unit="%"
            color="#2563EB"
            strokeColor="#1D4ED8"
            domain={[0, 100]}
          />
        </Card>

        <Card title="API Response Latency Over Time" subtitle="HTTP health-probe response latency in milliseconds">
          <MetricAreaChart
            data={history}
            dataKey="avg_latency_ms"
            name="Latency"
            unit="ms"
            color="#38BDF8"
            strokeColor="#0284C7"
          />
        </Card>
      </div>

      {/* Monitored Services Table & Incident Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Monitored Services Catalog (2 cols on xl) */}
        <div className="xl:col-span-2">
          <Card
            title="Monitored Services Catalog"
            subtitle="Registered endpoints with active HTTP health checks"
            action={
              <Link to="/services" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View all services <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Service Name</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Latency</th>
                    <th className="pb-3">Failures</th>
                    <th className="pb-3 text-right">Endpoint URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {services.map((svc) => (
                    <tr key={svc.id} className="hover:bg-blue-50/40 transition">
                      <td className="py-3 font-semibold text-slate-800">
                        {svc.name}
                        <div className="text-[11px] font-normal text-slate-400">{svc.id}</div>
                      </td>
                      <td className="py-3">
                        <Badge variant={svc.status as any}>{svc.status}</Badge>
                      </td>
                      <td className="py-3 font-mono font-medium text-slate-700">
                        {Math.round(svc.last_response_time_ms)}ms
                      </td>
                      <td className="py-3">
                        <span className={svc.recent_failure_count > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                          {svc.recent_failure_count}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono text-[11px] text-slate-500 truncate max-w-xs">
                        {svc.health_url}
                      </td>
                    </tr>
                  ))}
                  {services.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No services registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Live Incident & Recovery Feed */}
        <div className="space-y-6">
          <Card
            title="Recent Incidents"
            subtitle="Anomalies flagged by rule engine or ML model"
            action={
              <Link to="/incidents" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            <div className="space-y-3">
              {recentIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className="p-3 rounded-xl border border-slate-100 hover:border-blue-200 transition bg-slate-50/50 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={inc.severity}>{inc.severity}</Badge>
                      <span className="text-[10px] text-slate-400 font-mono">{inc.id}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mt-1 truncate">{inc.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{inc.probable_cause}</p>
                  </div>
                  <Badge variant={inc.status as any}>{inc.status}</Badge>
                </div>
              ))}
              {recentIncidents.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  All systems operational. No active incidents.
                </div>
              )}
            </div>
          </Card>

          <Card
            title="Latest Recovery Operations"
            subtitle="Audit log of automated policy actions"
            action={
              <Link to="/recovery" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                Recovery Center <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            <div className="space-y-2.5">
              {recentRecoveries.map((rec) => (
                <div key={rec.id} className="p-2.5 rounded-lg border border-slate-100 text-xs bg-white">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 font-mono text-[11px]">{rec.action_type}</span>
                    <Badge variant={rec.execution_status === 'succeeded' ? 'healthy' : 'critical'}>
                      {rec.execution_status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{rec.output_message}</p>
                </div>
              ))}
              {recentRecoveries.length === 0 && (
                <div className="py-4 text-center text-slate-400 text-xs">
                  No recovery actions executed yet.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
