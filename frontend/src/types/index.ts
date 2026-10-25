export interface HostMetrics {
  timestamp: string;
  cpu_percent: number;
  memory_percent: number;
  memory_used_bytes: number;
  memory_total_bytes: number;
  disk_percent: number;
  disk_used_bytes: number;
  disk_total_bytes: number;
  uptime_seconds: number;
  is_simulated: boolean;
}

export interface MetricsOverview {
  host: HostMetrics;
  avg_latency_ms: number;
  http_error_rate_percent: number;
  total_services: number;
  healthy_services: number;
  unhealthy_services: number;
  open_incidents: number;
  active_recovery: string | null;
}

export interface MetricHistoryPoint {
  timestamp: string;
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  avg_latency_ms: number;
  error_rate_percent: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  health_url: string;
  enabled: boolean;
  status: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
  last_check_time: string | null;
  last_response_time_ms: number;
  recent_failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  title: string;
  service_id: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'recovering' | 'recovered' | 'unresolved';
  metric_name: string;
  observed_value: number;
  threshold_value: number;
  detection_method: 'rule_based' | 'machine_learning';
  description: string;
  probable_cause: string;
  confidence_score: number;
  supporting_evidence: Record<string, any>;
  recommended_action: string;
  recovery_state: 'idle' | 'pending_approval' | 'in_progress' | 'verified' | 'escalated';
  created_at: string;
  resolved_at: string | null;
  acknowledged_at: string | null;
}

export interface RecoveryAction {
  id: string;
  incident_id: string;
  service_id: string | null;
  action_type: string;
  is_simulated: boolean;
  requested_by: string;
  execution_status: 'pending' | 'running' | 'succeeded' | 'failed' | 'escalated';
  pre_recovery_state: Record<string, any>;
  post_recovery_state: Record<string, any>;
  verification_passed: boolean | null;
  output_message: string;
  started_at: string;
  completed_at: string | null;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  target_id: string | null;
  actor: string;
  details: Record<string, any> | string;
}

export interface SystemSettings {
  polling_interval_seconds: number;
  cpu_threshold_percent: number;
  memory_threshold_percent: number;
  disk_threshold_percent: number;
  latency_threshold_ms: number;
  http_failure_threshold: number;
  consecutive_failures_threshold: number;
  recovery_cooldown_seconds: number;
  max_recovery_retries: number;
  enable_ml_detection: boolean;
  demo_mode: boolean;
  docker_container_name: string;
  docker_available: boolean;
  test_service_url: string;
}
