import React, { useState, useEffect } from 'react';
import { Flame, CheckCircle, ShieldAlert, ArrowRight, Search, Filter, Wrench, Eye, Check } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { api } from '../services/api';
import { Incident, RecoveryAction } from '../types';

export const IncidentCenter: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);

  const { addToast } = useToast();

  const loadIncidents = async () => {
    try {
      setIsLoading(true);
      const data = await api.getIncidents();
      setIncidents(data);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Failed to load incidents', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
    const interval = setInterval(loadIncidents, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (id: string) => {
    try {
      const updated = await api.acknowledgeIncident(id);
      setIncidents((prev) => prev.map((i) => (i.id === id ? updated : i)));
      if (selectedIncident?.id === id) setSelectedIncident(updated);
      addToast({ type: 'success', title: 'Incident Acknowledged', message: 'Status transitioned to Investigating.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Acknowledge failed', message: err.message });
    }
  };

  const handleExecuteRecovery = async (incident: Incident, isDryRun = false) => {
    try {
      setIsRecovering(true);
      const action = await api.triggerRecovery(incident.id, incident.recommended_action, isDryRun);
      
      addToast({
        type: action.verification_passed ? 'success' : 'warning',
        title: action.verification_passed ? 'Recovery Verified' : 'Recovery Incomplete',
        message: action.output_message
      });

      // Reload incident
      const refreshed = await api.getIncident(incident.id);
      setIncidents((prev) => prev.map((i) => (i.id === incident.id ? refreshed : i)));
      setSelectedIncident(refreshed);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Recovery Execution Failed', message: err.message });
    } finally {
      setIsRecovering(false);
    }
  };

  const filtered = incidents.filter((inc) => {
    if (statusFilter !== 'all' && inc.status !== statusFilter) return false;
    if (severityFilter !== 'all' && inc.severity !== severityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        inc.title.toLowerCase().includes(q) ||
        inc.id.toLowerCase().includes(q) ||
        (inc.service_id && inc.service_id.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl border border-blue-100 shadow-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by incident ID, title, or service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs text-slate-800 placeholder-slate-400 border-none focus:ring-0 bg-transparent"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white"
          >
            <option value="all">All States</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="recovering">Recovering</option>
            <option value="recovered">Recovered</option>
            <option value="unresolved">Unresolved</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 bg-white"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Incident ID</th>
                <th className="pb-3">Severity</th>
                <th className="pb-3">Title & Diagnosis</th>
                <th className="pb-3">Target</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Recovery Policy</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((inc) => (
                <tr key={inc.id} className="hover:bg-blue-50/40 transition">
                  <td className="py-3 font-mono font-bold text-slate-800">
                    {inc.id}
                    <div className="text-[10px] font-normal text-slate-400">
                      {new Date(inc.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="py-3">
                    <Badge variant={inc.severity}>{inc.severity}</Badge>
                  </td>
                  <td className="py-3">
                    <p className="font-semibold text-slate-900">{inc.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 max-w-sm">{inc.probable_cause}</p>
                  </td>
                  <td className="py-3 font-mono text-slate-600">
                    {inc.service_id || 'Host System'}
                  </td>
                  <td className="py-3">
                    <Badge variant={inc.status as any}>{inc.status}</Badge>
                  </td>
                  <td className="py-3">
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {inc.recommended_action}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {inc.status === 'open' && (
                        <button
                          onClick={() => handleAcknowledge(inc.id)}
                          className="px-2 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded text-xs font-medium transition"
                          title="Acknowledge"
                        >
                          Ack
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedIncident(inc)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs transition"
                      >
                        Manage
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No incidents matching selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Incident Details & Remediation Modal */}
      {selectedIncident && (
        <Modal
          isOpen={!!selectedIncident}
          onClose={() => setSelectedIncident(null)}
          title={`Incident Dossier: ${selectedIncident.id}`}
          subtitle={selectedIncident.title}
          maxWidth="xl"
        >
          <div className="space-y-4 text-xs">
            {/* Severity and Status Badges */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2">
                <Badge variant={selectedIncident.severity}>{selectedIncident.severity} Severity</Badge>
                <Badge variant={selectedIncident.status as any}>State: {selectedIncident.status}</Badge>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">
                Detected: {new Date(selectedIncident.created_at).toLocaleString()}
              </span>
            </div>

            {/* Root Cause Diagnosis Hypothesis */}
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
              <h4 className="font-bold text-blue-900 text-xs uppercase tracking-wider mb-1">
                Root-Cause Hypothesis & Evidence
              </h4>
              <p className="text-slate-800 font-medium leading-relaxed">{selectedIncident.probable_cause}</p>
              <div className="mt-2 text-slate-600 text-[11px] flex items-center gap-3">
                <span>Confidence: <strong>{Math.round(selectedIncident.confidence_score * 100)}%</strong></span>
                <span>Detection: <strong>{selectedIncident.detection_method}</strong></span>
                <span>Observed: <strong>{selectedIncident.observed_value}</strong></span>
                <span>Threshold: <strong>{selectedIncident.threshold_value}</strong></span>
              </div>
            </div>

            {/* Telemetry and Log Evidence */}
            <div>
              <h4 className="font-bold text-slate-700 mb-1.5">Supporting Diagnostic Telemetry</h4>
              <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] max-h-36 overflow-y-auto">
                {JSON.stringify(selectedIncident.supporting_evidence, null, 2)}
              </pre>
            </div>

            {/* Recommended Action Card */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                  Policy-Approved Recovery Action
                </span>
                <span className="text-sm font-bold font-mono text-emerald-950 mt-0.5 block">
                  {selectedIncident.recommended_action}
                </span>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Enforces pre-validation, container safety policy, and post-action verification.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleExecuteRecovery(selectedIncident, true)}
                disabled={isRecovering}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition disabled:opacity-50"
              >
                Run Dry-Run Check
              </button>

              <div className="flex items-center gap-2">
                {selectedIncident.status === 'open' && (
                  <button
                    type="button"
                    onClick={() => handleAcknowledge(selectedIncident.id)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold transition"
                  >
                    Acknowledge
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleExecuteRecovery(selectedIncident, false)}
                  disabled={isRecovering || selectedIncident.status === 'recovered'}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Wrench className="w-4 h-4" />
                  {isRecovering ? 'Executing Recovery...' : 'Execute Recovery'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
