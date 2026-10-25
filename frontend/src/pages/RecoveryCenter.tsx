import React, { useState, useEffect } from 'react';
import { Wrench, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Play, RotateCcw, Clock, ArrowRight } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { api } from '../services/api';
import { RecoveryAction, Incident } from '../types';

export const RecoveryCenter: React.FC = () => {
  const [recoveries, setRecoveries] = useState<RecoveryAction[]>([]);
  const [incidentsAwaiting, setIncidentsAwaiting] = useState<Incident[]>([]);
  const [selectedRecovery, setSelectedRecovery] = useState<RecoveryAction[] | null>(null);
  const [confirmModalIncident, setConfirmModalIncident] = useState<Incident | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isDryRun, setIsDryRun] = useState(false);

  const { addToast } = useToast();

  const loadData = async () => {
    try {
      const [recs, incs] = await Promise.all([
        api.getRecoveries(),
        api.getIncidents({ status: 'open' })
      ]);
      setRecoveries(recs);
      // Filter open incidents that have recommended recovery action
      setIncidentsAwaiting(incs.filter((i) => i.status !== 'recovered'));
    } catch (err: any) {
      console.error('Failed to load recovery data', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConfirmRecovery = async () => {
    if (!confirmModalIncident) return;
    try {
      setIsExecuting(true);
      const action = await api.triggerRecovery(
        confirmModalIncident.id,
        confirmModalIncident.recommended_action,
        isDryRun
      );

      addToast({
        type: action.verification_passed ? 'success' : 'warning',
        title: action.verification_passed ? 'Recovery Verified' : 'Action Incomplete',
        message: action.output_message
      });

      setConfirmModalIncident(null);
      await loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Recovery Execution Rejected', message: err.message });
    } finally {
      setIsExecuting(false);
    }
  };

  const succeededCount = recoveries.filter((r) => r.execution_status === 'succeeded').length;
  const failedCount = recoveries.filter((r) => r.execution_status === 'failed' || r.execution_status === 'escalated').length;

  return (
    <div className="space-y-6">
      {/* Recovery Safety Governance Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900 to-slate-900 text-white shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-300">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight">Self-Recovery Safety Policy Enforcement</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Allowlisted actions only • Cooldown guardrails active • Docker test container isolated • Mandatory post-action health verification
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 text-xs">
          <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 font-mono">
            Mode: Fail-Closed
          </span>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-amber-100">
          <span className="text-xs font-semibold text-slate-500 uppercase">Pending Approval</span>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            {incidentsAwaiting.length}
          </div>
          <span className="text-[11px] text-slate-400">Awaiting operator sign-off</span>
        </Card>

        <Card className="border-emerald-100">
          <span className="text-xs font-semibold text-slate-500 uppercase">Verified Succeeded</span>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {succeededCount}
          </div>
          <span className="text-[11px] text-slate-400">Post-check health validated</span>
        </Card>

        <Card className="border-rose-100">
          <span className="text-xs font-semibold text-slate-500 uppercase">Failed / Escalated</span>
          <div className="mt-2 text-2xl font-bold text-rose-600">
            {failedCount}
          </div>
          <span className="text-[11px] text-slate-400">Escalated to human SRE</span>
        </Card>

        <Card className="border-blue-100">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Executions</span>
          <div className="mt-2 text-2xl font-bold text-blue-600">
            {recoveries.length}
          </div>
          <span className="text-[11px] text-slate-400">Complete audit trail logged</span>
        </Card>
      </div>

      {/* Pending Actions Recommendations */}
      <Card
        title="Pending Recovery Recommendations"
        subtitle="Autonomous policy engine proposals awaiting operator review"
      >
        <div className="space-y-3">
          {incidentsAwaiting.map((inc) => (
            <div
              key={inc.id}
              className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 bg-white transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={inc.severity}>{inc.severity}</Badge>
                  <span className="font-mono text-xs font-bold text-slate-800">{inc.id}</span>
                  <span className="text-xs text-slate-400">• Target: {inc.service_id || 'Host'}</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-900">{inc.title}</h4>
                <p className="text-xs text-slate-600">{inc.probable_cause}</p>
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span className="text-slate-500">Proposed Allowlisted Action:</span>
                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {inc.recommended_action}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setConfirmModalIncident(inc);
                    setIsDryRun(true);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Dry-Run
                </button>
                <button
                  onClick={() => {
                    setConfirmModalIncident(inc);
                    setIsDryRun(false);
                  }}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" /> Approve & Execute
                </button>
              </div>
            </div>
          ))}
          {incidentsAwaiting.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              No pending recovery recommendations. All services are healthy.
            </div>
          )}
        </div>
      </Card>

      {/* Execution Audit History */}
      <Card
        title="Recovery Execution Audit Trail"
        subtitle="Chronological log of verified self-recovery attempts and outcomes"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Action ID</th>
                <th className="pb-3">Incident Ref</th>
                <th className="pb-3">Action Type</th>
                <th className="pb-3">Execution Status</th>
                <th className="pb-3">Health Verification</th>
                <th className="pb-3">Mode</th>
                <th className="pb-3">Completed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recoveries.map((rec) => (
                <tr key={rec.id} className="hover:bg-blue-50/40 transition">
                  <td className="py-3 font-mono font-bold text-slate-800">{rec.id}</td>
                  <td className="py-3 font-mono text-slate-500">{rec.incident_id}</td>
                  <td className="py-3 font-mono font-semibold text-slate-800">{rec.action_type}</td>
                  <td className="py-3">
                    <Badge variant={rec.execution_status === 'succeeded' ? 'healthy' : 'critical'}>
                      {rec.execution_status}
                    </Badge>
                  </td>
                  <td className="py-3">
                    {rec.verification_passed === true ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Passed
                      </span>
                    ) : rec.verification_passed === false ? (
                      <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                        <XCircle className="w-4 h-4 text-rose-500" /> Failed
                      </span>
                    ) : (
                      <span className="text-slate-400">N/A</span>
                    )}
                  </td>
                  <td className="py-3">
                    <Badge variant={rec.is_simulated ? 'simulated' : 'real'}>
                      {rec.is_simulated ? 'Simulated' : 'Real Target'}
                    </Badge>
                  </td>
                  <td className="py-3 text-slate-500">
                    {rec.completed_at ? new Date(rec.completed_at).toLocaleTimeString() : 'In Progress'}
                  </td>
                </tr>
              ))}
              {recoveries.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No recovery operations have been recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confirmation & Safety Check Dialog */}
      {confirmModalIncident && (
        <Modal
          isOpen={!!confirmModalIncident}
          onClose={() => setConfirmModalIncident(null)}
          title={isDryRun ? 'Confirm Dry-Run Verification' : 'Explicit Operator Recovery Confirmation'}
          subtitle={`Remediating ${confirmModalIncident.id} (${confirmModalIncident.title})`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Safety Boundary Notice:
              </span>
              <p>
                This operation will execute <strong>{confirmModalIncident.recommended_action}</strong> targeting{' '}
                <strong>{confirmModalIncident.service_id || 'host environment'}</strong>.
              </p>
              {!isDryRun && (
                <p className="text-[11px] text-amber-800">
                  Target container: <code>pulseops-test-service</code>. Arbitrary host commands are strictly blocked.
                </p>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Action Type:</span>
                <span className="font-mono font-bold text-slate-900">{confirmModalIncident.recommended_action}</span>
              </div>
              <div className="flex justify-between">
                <span>Execution Mode:</span>
                <span className="font-bold text-slate-900">{isDryRun ? 'Dry-Run (Safe Simulation)' : 'Real Execution'}</span>
              </div>
              <div className="flex justify-between">
                <span>Post-Action Health Probe:</span>
                <span className="text-emerald-700 font-semibold">Mandatory 2-Probe Verification</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModalIncident(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRecovery}
                disabled={isExecuting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isExecuting ? 'Processing...' : isDryRun ? 'Run Dry-Run' : 'Confirm & Execute'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
