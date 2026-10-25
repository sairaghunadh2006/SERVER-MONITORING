import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, Box, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import { Card } from '../components/common/Card';
import { useToast } from '../components/common/Toast';
import { api } from '../services/api';
import { SystemSettings } from '../types';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [form, setForm] = useState<Partial<SystemSettings>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { addToast } = useToast();

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      setForm(data);
      setHasChanges(false);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to load settings', message: err.message });
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (key: keyof SystemSettings, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      setHasChanges(true);
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const updated = await api.updateSettings(form);
      setSettings(updated);
      setForm(updated);
      setHasChanges(false);
      addToast({
        type: 'success',
        title: 'Settings Saved',
        message: 'Runtime thresholds and recovery policies have been updated.'
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Save Failed', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="py-16 text-center text-slate-400 text-xs">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
        Loading system configuration...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {/* Changes Banner */}
      {hasChanges && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>You have unsaved configuration changes. Click Save to apply changes to the live engine.</span>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition"
          >
            {isSaving ? 'Saving...' : 'Apply Now'}
          </button>
        </div>
      )}

      {/* Monitoring & Polling Rates */}
      <Card
        title="Telemetry Collection & Polling Intervals"
        subtitle="Sampling rates for host psutil metrics and microservice HTTP health checks"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Active Polling Interval (seconds)
            </label>
            <input
              type="number"
              min={2}
              max={60}
              value={form.polling_interval_seconds ?? 5}
              onChange={(e) => handleChange('polling_interval_seconds', Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">Recommended: 5s. Valid range: 2 - 60 seconds.</p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Target Test Service Endpoint
            </label>
            <input
              type="text"
              disabled
              value={settings.test_service_url}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 font-mono text-xs cursor-not-allowed"
            />
            <p className="text-[11px] text-slate-400 mt-1">Configured in backend environment (.env).</p>
          </div>
        </div>
      </Card>

      {/* Anomaly Detection Thresholds */}
      <Card
        title="Anomaly Detection Thresholds"
        subtitle="Configurable boundaries that trigger operational incidents and root-cause diagnoses"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div>
            <div className="flex justify-between mb-1">
              <label className="font-semibold text-slate-700">CPU Usage Critical Threshold</label>
              <span className="font-mono font-bold text-blue-600">{form.cpu_threshold_percent}%</span>
            </div>
            <input
              type="range"
              min={30}
              max={99}
              step={1}
              value={form.cpu_threshold_percent ?? 85}
              onChange={(e) => handleChange('cpu_threshold_percent', Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">Triggers high CPU incident above {form.cpu_threshold_percent}%.</p>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="font-semibold text-slate-700">Memory Usage Critical Threshold</label>
              <span className="font-mono font-bold text-blue-600">{form.memory_threshold_percent}%</span>
            </div>
            <input
              type="range"
              min={30}
              max={99}
              step={1}
              value={form.memory_threshold_percent ?? 85}
              onChange={(e) => handleChange('memory_threshold_percent', Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">Triggers memory exhaustion warning above {form.memory_threshold_percent}%.</p>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="font-semibold text-slate-700">API Latency Degradation Threshold</label>
              <span className="font-mono font-bold text-blue-600">{form.latency_threshold_ms} ms</span>
            </div>
            <input
              type="range"
              min={100}
              max={5000}
              step={50}
              value={form.latency_threshold_ms ?? 1000}
              onChange={(e) => handleChange('latency_threshold_ms', Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">Responses slower than {form.latency_threshold_ms}ms flagged as degraded.</p>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <label className="font-semibold text-slate-700">Consecutive Health Check Failures</label>
              <span className="font-mono font-bold text-blue-600">{form.consecutive_failures_threshold} checks</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={form.consecutive_failures_threshold ?? 3}
              onChange={(e) => handleChange('consecutive_failures_threshold', Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">Service marked unavailable after {form.consecutive_failures_threshold} failures.</p>
          </div>
        </div>
      </Card>

      {/* Recovery Policy & Guardrails */}
      <Card
        title="Self-Recovery Policy & Guardrails"
        subtitle="Safety cooldowns and maximum retry constraints to prevent cascade loops"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Recovery Action Cooldown (seconds)
            </label>
            <input
              type="number"
              min={5}
              max={600}
              value={form.recovery_cooldown_seconds ?? 60}
              onChange={(e) => handleChange('recovery_cooldown_seconds', Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-xs"
            />
            <p className="text-[11px] text-slate-400 mt-1">Minimum wait between automated recovery operations on same service.</p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Max Recovery Retry Limit
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={form.max_recovery_retries ?? 3}
              onChange={(e) => handleChange('max_recovery_retries', Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-xs"
            />
            <p className="text-[11px] text-slate-400 mt-1">Escalates to human SRE when retry count exceeds this limit.</p>
          </div>
        </div>
      </Card>

      {/* Feature Toggles & Docker Environment */}
      <Card title="Feature Toggles & Infrastructure Detection">
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <span className="font-bold text-slate-800 block">scikit-learn Isolation Forest ML Anomaly Engine</span>
              <p className="text-slate-500 mt-0.5">Enables multivariate machine-learning outlier analysis.</p>
            </div>
            <input
              type="checkbox"
              checked={form.enable_ml_detection ?? true}
              onChange={(e) => handleChange('enable_ml_detection', e.target.checked)}
              className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <span className="font-bold text-slate-800 block">Demo Lab Mode</span>
              <p className="text-slate-500 mt-0.5">Allows manual injection of synthetic fault scenarios.</p>
            </div>
            <input
              type="checkbox"
              checked={form.demo_mode ?? true}
              onChange={(e) => handleChange('demo_mode', e.target.checked)}
              className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-blue-900">
            <div className="flex items-center gap-2.5">
              <Box className="w-5 h-5 text-blue-600" />
              <div>
                <span className="font-bold block">Docker Host Integration</span>
                <span className="text-[11px] text-blue-700">
                  Target container: <code>{settings.docker_container_name}</code>
                </span>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                settings.docker_available
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {settings.docker_available ? 'Docker Detected' : 'Local Process Mode'}
            </span>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving || !hasChanges}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving Settings...' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
};
