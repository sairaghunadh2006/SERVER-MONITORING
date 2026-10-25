import React, { useState, useEffect } from 'react';
import { History, Search, Filter, ShieldAlert, CheckCircle2, XCircle, ArrowUpRight } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { api } from '../services/api';
import { AuditLog, Incident } from '../types';

export const IncidentHistory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'incidents' | 'audit'>('incidents');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        setIsLoading(true);
        const [incs, logs] = await Promise.all([
          api.getIncidents(),
          api.getAuditLogs()
        ]);
        setIncidents(incs);
        setAuditLogs(logs);
      } catch (err) {
        console.error('Failed to load history', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, []);

  const filteredIncidents = incidents.filter((inc) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inc.title.toLowerCase().includes(q) ||
      inc.id.toLowerCase().includes(q) ||
      (inc.service_id && inc.service_id.toLowerCase().includes(q)) ||
      inc.probable_cause.toLowerCase().includes(q)
    );
  });

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const detailsStr = typeof log.details === 'string' ? log.details : JSON.stringify(log.details);
    return (
      log.event_type.toLowerCase().includes(q) ||
      log.actor.toLowerCase().includes(q) ||
      detailsStr.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Search and Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-xl border border-blue-100 shadow-xs">
        {/* Tab Buttons */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab('incidents')}
            className={`px-4 py-1.5 rounded-lg transition ${
              activeTab === 'incidents' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            Resolved Incidents Archive ({incidents.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-1.5 rounded-lg transition ${
              activeTab === 'audit' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            System Audit Trail ({auditLogs.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search archive and audit records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none focus:ring-0 text-slate-800 placeholder-slate-400 text-xs"
          />
        </div>
      </div>

      {/* Incidents Archive Tab */}
      {activeTab === 'incidents' ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Incident ID</th>
                  <th className="pb-3">Title & Summary</th>
                  <th className="pb-3">Target</th>
                  <th className="pb-3">Severity</th>
                  <th className="pb-3">Detection</th>
                  <th className="pb-3">Final Outcome</th>
                  <th className="pb-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIncidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-blue-50/40 transition">
                    <td className="py-3 font-mono font-bold text-slate-800">
                      {inc.id}
                      <div className="text-[10px] font-normal text-slate-400">
                        {new Date(inc.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3">
                      <p className="font-semibold text-slate-900">{inc.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1 max-w-sm">{inc.probable_cause}</p>
                    </td>
                    <td className="py-3 font-mono text-slate-600">{inc.service_id || 'Host'}</td>
                    <td className="py-3">
                      <Badge variant={inc.severity}>{inc.severity}</Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={inc.detection_method}>{inc.detection_method}</Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={inc.status as any}>{inc.status}</Badge>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setSelectedIncident(inc)}
                        className="px-2.5 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg font-semibold transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredIncidents.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No archived incidents match your query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Audit Trail Tab */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Event Type</th>
                  <th className="pb-3">Severity</th>
                  <th className="pb-3">Actor</th>
                  <th className="pb-3">Target Ref</th>
                  <th className="pb-3">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/40 transition">
                    <td className="py-3 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 font-mono font-semibold text-slate-800">
                      {log.event_type}
                    </td>
                    <td className="py-3">
                      <Badge variant={log.severity === 'critical' ? 'critical' : log.severity === 'warning' ? 'high' : 'healthy'}>
                        {log.severity}
                      </Badge>
                    </td>
                    <td className="py-3 font-medium text-slate-700">{log.actor}</td>
                    <td className="py-3 font-mono text-slate-500">{log.target_id || '-'}</td>
                    <td className="py-3 font-mono text-[11px] text-slate-600 max-w-md truncate">
                      {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
                {filteredAuditLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No audit events recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <Modal
          isOpen={!!selectedIncident}
          onClose={() => setSelectedIncident(null)}
          title={`Archive Record: ${selectedIncident.id}`}
          subtitle={selectedIncident.title}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-slate-500 font-semibold block">Probable Cause Diagnosis:</span>
              <p className="text-slate-800 font-medium leading-relaxed">{selectedIncident.probable_cause}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 block">Created At</span>
                <span className="font-semibold text-slate-800 mt-1 block">
                  {new Date(selectedIncident.created_at).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 block">Resolved At</span>
                <span className="font-semibold text-slate-800 mt-1 block">
                  {selectedIncident.resolved_at ? new Date(selectedIncident.resolved_at).toLocaleString() : 'Unresolved'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-600 font-semibold block mb-1">Raw Telemetry Snapshot</span>
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] max-h-40 overflow-y-auto">
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
