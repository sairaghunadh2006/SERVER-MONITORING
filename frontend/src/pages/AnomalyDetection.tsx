import React, { useState, useEffect } from 'react';
import { AlertTriangle, Brain, Filter, CheckCircle, Info, ArrowRight } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { api } from '../services/api';
import { Incident } from '../types';

export const AnomalyDetection: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnomalies() {
      try {
        setIsLoading(true);
        const data = await api.getIncidents();
        setIncidents(data);
      } catch (err) {
        console.error('Failed to fetch anomalies', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnomalies();
    const interval = setInterval(fetchAnomalies, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = incidents.filter((inc) => {
    if (filterMethod !== 'all' && inc.detection_method !== filterMethod) return false;
    if (filterSeverity !== 'all' && inc.severity !== filterSeverity) return false;
    return true;
  });

  const ruleCount = incidents.filter((i) => i.detection_method === 'rule_based').length;
  const mlCount = incidents.filter((i) => i.detection_method === 'machine_learning').length;

  return (
    <div className="space-y-6">
      {/* Engine Status & Architecture Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Deterministic Engine</span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">Threshold & Rule Heuristics</h3>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-indigo-50 flex items-center justify-between text-xs">
            <span className="text-slate-500">Active Rule Detections:</span>
            <span className="font-bold text-indigo-700">{ruleCount} anomalies</span>
          </div>
        </Card>

        <Card className="border-purple-100 bg-gradient-to-br from-white to-purple-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase">Modular AI / ML</span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">scikit-learn Isolation Forest</h3>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-purple-50 flex items-center justify-between text-xs">
            <span className="text-slate-500">Multivariate ML Detections:</span>
            <span className="font-bold text-purple-700">{mlCount} anomalies</span>
          </div>
        </Card>

        <Card className="border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase">State Deduplication</span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">Alert Fatigue Suppression</h3>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-emerald-50 flex items-center justify-between text-xs">
            <span className="text-slate-500">Duplicate Alert Prevention:</span>
            <span className="font-bold text-emerald-700">Active</span>
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-blue-100 shadow-xs">
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-700">Filter Detections:</span>

          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 bg-white"
          >
            <option value="all">All Methods</option>
            <option value="rule_based">Rule-Based Only</option>
            <option value="machine_learning">Machine Learning Only</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 bg-white"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <span className="text-xs text-slate-500">
          Showing <strong>{filtered.length}</strong> of {incidents.length} recorded anomalies
        </span>
      </div>

      {/* Anomaly Feed Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Anomaly Identifier</th>
                <th className="pb-3">Detection Model</th>
                <th className="pb-3">Observed Value</th>
                <th className="pb-3">Threshold</th>
                <th className="pb-3">Severity</th>
                <th className="pb-3">Probable Cause</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((inc) => (
                <tr key={inc.id} className="hover:bg-blue-50/40 transition">
                  <td className="py-3 font-semibold text-slate-900">
                    {inc.title}
                    <div className="text-[11px] font-mono text-slate-400">{inc.id}</div>
                  </td>
                  <td className="py-3">
                    <Badge variant={inc.detection_method}>
                      {inc.detection_method === 'rule_based' ? 'Rule Heuristics' : 'Isolation Forest'}
                    </Badge>
                  </td>
                  <td className="py-3 font-mono font-bold text-slate-800">
                    {inc.observed_value}
                  </td>
                  <td className="py-3 font-mono text-slate-500">
                    {inc.threshold_value}
                  </td>
                  <td className="py-3">
                    <Badge variant={inc.severity}>{inc.severity}</Badge>
                  </td>
                  <td className="py-3 text-slate-600 max-w-xs truncate" title={inc.probable_cause}>
                    {inc.probable_cause}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => setSelectedIncident(inc)}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                    >
                      Inspect Evidence
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No anomalies matching current criteria. All telemetry within safe baselines.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Anomaly Evidence Modal */}
      {selectedIncident && (
        <Modal
          isOpen={!!selectedIncident}
          onClose={() => setSelectedIncident(null)}
          title={`Evidence Dossier: ${selectedIncident.title}`}
          subtitle={`Detected via ${selectedIncident.detection_method} at ${new Date(selectedIncident.created_at).toLocaleString()}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 font-semibold block mb-1">Diagnostic Hypothesis:</span>
              <p className="text-slate-800 font-medium leading-relaxed">{selectedIncident.probable_cause}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 block">Confidence Score</span>
                <span className="text-base font-bold text-blue-700 mt-1 block">
                  {Math.round(selectedIncident.confidence_score * 100)}%
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 block">Recommended Action</span>
                <span className="text-sm font-mono font-bold text-slate-800 mt-1 block">
                  {selectedIncident.recommended_action}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-600 font-semibold block mb-1.5">Supporting Evidence Snapshot:</span>
              <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-48">
                {JSON.stringify(selectedIncident.supporting_evidence, null, 2)}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
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
