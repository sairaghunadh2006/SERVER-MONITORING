import React, { useState, useEffect } from 'react';
import { FlaskConical, Play, RotateCcw, CheckCircle2, AlertTriangle, Flame, ShieldAlert, Cpu, Layers, Clock } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { useToast } from '../components/common/Toast';
import { api } from '../services/api';

export const DemoLab: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<string>('normal');
  const [isSimulatedHost, setIsSimulatedHost] = useState(false);
  const [executingScenario, setExecutingScenario] = useState<string | null>(null);

  const { addToast } = useToast();

  const loadStatus = async () => {
    try {
      const status = await api.getDemoStatus();
      setActiveScenario(status.active_scenario);
      setIsSimulatedHost(status.is_simulated_host_active);
    } catch (err) {
      console.error('Failed to load demo status', err);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleTrigger = async (scenario: string, label: string) => {
    try {
      setExecutingScenario(scenario);
      const res = await api.triggerScenario(scenario);
      setActiveScenario(scenario);
      addToast({
        type: 'info',
        title: `Injected: ${label}`,
        message: res.message || 'Scenario executed successfully.'
      });
      await loadStatus();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Scenario Failed', message: err.message });
    } finally {
      setExecutingScenario(null);
    }
  };

  const handleReset = async () => {
    try {
      setExecutingScenario('reset');
      const res = await api.resetDemo();
      setActiveScenario('normal');
      addToast({ type: 'success', title: 'Demo Reset', message: res.message });
      await loadStatus();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Reset Failed', message: err.message });
    } finally {
      setExecutingScenario(null);
    }
  };

  const scenarios = [
    {
      id: 'normal',
      title: '1. Baseline Normal Operation',
      description: 'Clears all synthetic fault injections and restores real host metrics and normal service telemetry.',
      icon: CheckCircle2,
      color: 'border-emerald-200 bg-emerald-50/30 text-emerald-800',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700'
    },
    {
      id: 'high_cpu',
      title: '2. High CPU Saturation Anomaly',
      description: 'Injects synthetic 93.4% host processor utilization, triggering CPU anomaly rule and saturation diagnosis.',
      icon: Cpu,
      color: 'border-rose-200 bg-rose-50/30 text-rose-800',
      btnColor: 'bg-rose-600 hover:bg-rose-700'
    },
    {
      id: 'high_memory',
      title: '3. Memory Pressure Anomaly',
      description: 'Injects synthetic 91.8% RAM consumption, generating memory pressure diagnosis and OOM risk alerts.',
      icon: Layers,
      color: 'border-amber-200 bg-amber-50/30 text-amber-800',
      btnColor: 'bg-amber-600 hover:bg-amber-700'
    },
    {
      id: 'slow_api',
      title: '4. Slow API Latency Spike',
      description: 'Simulates a 2250ms API delay on the Order Processing service, flagging service degradation.',
      icon: Clock,
      color: 'border-yellow-200 bg-yellow-50/30 text-yellow-800',
      btnColor: 'bg-yellow-600 hover:bg-yellow-700'
    },
    {
      id: 'repeated_500',
      title: '5. Repeated HTTP 500 Responses',
      description: 'Injects internal server errors on the Order service, generating application crash hypotheses.',
      icon: AlertTriangle,
      color: 'border-orange-200 bg-orange-50/30 text-orange-800',
      btnColor: 'bg-orange-600 hover:bg-orange-700'
    },
    {
      id: 'service_down',
      title: '6. Service Outage (Connection Refused)',
      description: 'Simulates complete microservice termination (3 consecutive failed health probes). Recommends restart.',
      icon: Flame,
      color: 'border-red-200 bg-red-50/30 text-red-800',
      btnColor: 'bg-red-600 hover:bg-red-700'
    },
    {
      id: 'successful_recovery',
      title: '7. End-to-End Autonomous Recovery',
      description: 'Triggers full workflow: Outage detected → Root Cause Diagnosed → Policy Approved → Restart → Health Verified.',
      icon: ShieldAlert,
      color: 'border-blue-200 bg-blue-50/30 text-blue-800',
      btnColor: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      id: 'failed_recovery_escalate',
      title: '8. Unrecoverable Failure & SRE Escalation',
      description: 'Demonstrates escalation policy: persistent failure exhausts retries and escalates incident to human engineers.',
      icon: RotateCcw,
      color: 'border-purple-200 bg-purple-50/30 text-purple-800',
      btnColor: 'bg-purple-600 hover:bg-purple-700'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-600/30 border border-purple-400/30 flex items-center justify-center text-purple-300">
            <FlaskConical className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight">PulseOps Demonstration Lab</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30 uppercase">
                Interactive Testing
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Inject synthetic anomalies and evaluate detection rules, root-cause hypotheses, allowlisted recoveries, and post-action health verification in real time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Current State:</span>
            <span className="font-mono font-bold text-purple-300 capitalize">{activeScenario.replace(/_/g, ' ')}</span>
          </div>
          <button
            onClick={handleReset}
            disabled={executingScenario === 'reset'}
            className="px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${executingScenario === 'reset' ? 'animate-spin' : ''}`} />
            Reset Baseline
          </button>
        </div>
      </div>

      {/* Scenario Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {scenarios.map((s) => {
          const Icon = s.icon;
          const isCurrent = activeScenario === s.id;
          const isBusy = executingScenario === s.id;

          return (
            <Card
              key={s.id}
              className={`border transition-all flex flex-col justify-between ${
                isCurrent ? 'ring-2 ring-purple-500 shadow-md' : 'hover:border-purple-200'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
                  </div>
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">{s.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">ID: {s.id}</span>
                <button
                  onClick={() => handleTrigger(s.id, s.title)}
                  disabled={isBusy}
                  className={`px-4 py-1.5 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 ${s.btnColor}`}
                >
                  <Play className={`w-3 h-3 ${isBusy ? 'animate-spin' : ''}`} />
                  {isBusy ? 'Injecting...' : 'Trigger Scenario'}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
