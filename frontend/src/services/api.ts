import {
  MetricsOverview,
  MetricHistoryPoint,
  Service,
  Incident,
  RecoveryAction,
  AuditLog,
  SystemSettings
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errMsg = `Request failed: HTTP ${res.status}`;
      try {
        const errObj = await res.json();
        errMsg = errObj.detail || errMsg;
      } catch {
        // ignore json parse error
      }
      throw new Error(errMsg);
    }

    if (res.status === 204) {
      return null as unknown as T;
    }

    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out while contacting backend API (8s limit).');
    }
    throw err;
  }
}

export const api = {
  // Health
  checkBackendHealth: () => fetchJson<{ status: string; version: string; database: string; docker_available: boolean }>('/api/health'),

  // Metrics
  getMetrics: () => fetchJson<MetricsOverview>('/api/metrics'),
  getMetricsHistory: (limit = 40, rangeMinutes = 60) =>
    fetchJson<MetricHistoryPoint[]>(`/api/metrics/history?limit=${limit}&range_minutes=${rangeMinutes}`),

  // Services
  getServices: () => fetchJson<Service[]>('/api/services'),
  getService: (id: string) => fetchJson<Service>(`/api/services/${id}`),
  registerService: (data: { id: string; name: string; health_url: string; description?: string }) =>
    fetchJson<Service>('/api/services', { method: 'POST', body: JSON.stringify(data) }),
  checkServiceNow: (id: string) =>
    fetchJson<Service>(`/api/services/${id}/check`, { method: 'POST' }),
  deleteService: (id: string) =>
    fetchJson<void>(`/api/services/${id}`, { method: 'DELETE' }),

  // Incidents
  getIncidents: (filters?: { status?: string; severity?: string; service_id?: string; detection_method?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.service_id) params.append('service_id', filters.service_id);
    if (filters?.detection_method) params.append('detection_method', filters.detection_method);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<Incident[]>(`/api/incidents${qs}`);
  },
  getIncident: (id: string) => fetchJson<Incident>(`/api/incidents/${id}`),
  acknowledgeIncident: (id: string, actor = 'operator') =>
    fetchJson<Incident>(`/api/incidents/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ acknowledged_by: actor })
    }),
  triggerRecovery: (incidentId: string, actionType: string, isDryRun = false, reason?: string) =>
    fetchJson<RecoveryAction>(`/api/incidents/${incidentId}/recover`, {
      method: 'POST',
      body: JSON.stringify({
        action_type: actionType,
        is_dry_run: isDryRun,
        requested_by: 'pulseops_dashboard',
        override_reason: reason
      })
    }),

  // Recovery Center
  getRecoveries: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return fetchJson<RecoveryAction[]>(`/api/recoveries${qs}`);
  },
  getRecovery: (id: string) => fetchJson<RecoveryAction>(`/api/recoveries/${id}`),

  // Audit Logs
  getAuditLogs: (eventType?: string, severity?: string) => {
    const params = new URLSearchParams();
    if (eventType) params.append('event_type', eventType);
    if (severity) params.append('severity', severity);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<AuditLog[]>(`/api/audit${qs}`);
  },

  // Settings
  getSettings: () => fetchJson<SystemSettings>('/api/settings'),
  updateSettings: (settings: Partial<SystemSettings>) =>
    fetchJson<SystemSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    }),

  // Demo Lab
  getDemoStatus: () => fetchJson<{ active_scenario: string; demo_mode: boolean; is_simulated_host_active: boolean }>('/api/demo/status'),
  triggerScenario: (scenario: string) =>
    fetchJson<any>('/api/demo/scenario', {
      method: 'POST',
      body: JSON.stringify({ scenario })
    }),
  resetDemo: () => fetchJson<{ message: string }>('/api/demo/reset', { method: 'POST' })
};
