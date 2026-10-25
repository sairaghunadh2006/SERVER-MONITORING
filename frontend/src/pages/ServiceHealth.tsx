import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Trash2, ExternalLink, Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { api } from '../services/api';
import { Service } from '../types';

export const ServiceHealth: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // New service form state
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('http://127.0.0.1:8001/health');
  const [formDesc, setFormDesc] = useState('');
  const [formError, setFormError] = useState('');

  const { addToast } = useToast();

  const loadServices = async () => {
    try {
      setIsLoading(true);
      const data = await api.getServices();
      setServices(data);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to load services', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
    const interval = setInterval(loadServices, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckNow = async (id: string) => {
    try {
      setCheckingId(id);
      const updated = await api.checkServiceNow(id);
      setServices((prev) => prev.map((s) => (s.id === id ? updated : s)));
      addToast({
        type: updated.status === 'healthy' ? 'success' : 'warning',
        title: `Probed ${updated.name}`,
        message: `Status: ${updated.status} (${Math.round(updated.last_response_time_ms)}ms)`
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Probe failed', message: err.message });
    } finally {
      setCheckingId(null);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const created = await api.registerService({
        id: formId.trim().toLowerCase(),
        name: formName.trim(),
        health_url: formUrl.trim(),
        description: formDesc.trim()
      });
      setServices((prev) => [...prev, created]);
      setIsRegisterOpen(false);
      setFormId('');
      setFormName('');
      setFormDesc('');
      addToast({ type: 'success', title: 'Service Registered', message: `${created.name} added to monitoring catalog.` });
    } catch (err: any) {
      setFormError(err.message || 'Validation error while registering service');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to unregister ${name}?`)) return;
    try {
      await api.deleteService(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
      addToast({ type: 'info', title: 'Service Removed', message: `${name} has been unregistered.` });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Delete failed', message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Service Inventory & Probes</h2>
          <p className="text-xs text-slate-500">Continuous HTTP health validation against local test endpoints</p>
        </div>
        <button
          onClick={() => setIsRegisterOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Register Microservice
        </button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {services.map((svc) => (
          <Card key={svc.id} className="hover:border-blue-300 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{svc.name}</h3>
                  <span className="text-[11px] font-mono text-slate-400">{svc.id}</span>
                </div>
                <Badge variant={svc.status as any}>{svc.status}</Badge>
              </div>

              <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                {svc.description || 'No description provided.'}
              </p>

              <div className="mt-4 p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Endpoint:</span>
                  <span className="font-mono text-[11px] text-slate-700 truncate max-w-[170px]" title={svc.health_url}>
                    {svc.health_url}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Last Response:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {Math.round(svc.last_response_time_ms)} ms
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Failures:</span>
                  <span className={svc.recent_failure_count > 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                    {svc.recent_failure_count} consecutive
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => handleCheckNow(svc.id)}
                disabled={checkingId === svc.id}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingId === svc.id ? 'animate-spin' : ''}`} />
                Check Now
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedService(svc)}
                  className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-medium transition"
                >
                  Inspect
                </button>
                <button
                  onClick={() => handleDelete(svc.id, svc.name)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Remove Service"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Register Service Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Register Monitored Service"
        subtitle="Add a microservice health endpoint to the autonomous polling schedule"
      >
        <form onSubmit={handleRegister} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
              {formError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Service Identifier (slug)</label>
            <input
              type="text"
              required
              placeholder="svc-payment-gateway"
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Display Name</label>
            <input
              type="text"
              required
              placeholder="Payment Gateway Service"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Health Check URL</label>
            <input
              type="url"
              required
              placeholder="http://127.0.0.1:8001/health"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Safety notice: Only approved local and container test endpoints (localhost, 127.0.0.1, test-service) are permitted.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="Payment tokenization and settlement worker"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRegisterOpen(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
            >
              Register Service
            </button>
          </div>
        </form>
      </Modal>

      {/* Service Details Modal */}
      {selectedService && (
        <Modal
          isOpen={!!selectedService}
          onClose={() => setSelectedService(null)}
          title={selectedService.name}
          subtitle={`Telemetry & Configuration for ${selectedService.id}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 block">Status</span>
                <div className="mt-1">
                  <Badge variant={selectedService.status as any}>{selectedService.status}</Badge>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 block">Response Latency</span>
                <span className="text-base font-bold text-slate-900 mt-1 block">
                  {Math.round(selectedService.last_response_time_ms)} ms
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Target Endpoint:</span>
                <span className="font-mono text-slate-800">{selectedService.health_url}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Consecutive Failures:</span>
                <span className="font-bold text-slate-800">{selectedService.recent_failure_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Registered At:</span>
                <span className="text-slate-800">{new Date(selectedService.created_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedService(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
