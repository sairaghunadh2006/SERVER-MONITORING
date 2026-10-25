import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldAlert,
  Activity,
  Server,
  AlertTriangle,
  Flame,
  Wrench,
  History,
  Settings,
  FlaskConical,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  openIncidentsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  openIncidentsCount = 0
}) => {
  const navItems = [
    { to: '/', label: 'Overview', icon: Activity },
    { to: '/live', label: 'Live Monitoring', icon: Server },
    { to: '/services', label: 'Service Health', icon: Server },
    { to: '/anomalies', label: 'Anomaly Detection', icon: AlertTriangle },
    { to: '/incidents', label: 'Incident Center', icon: Flame, badge: openIncidentsCount > 0 ? openIncidentsCount : undefined },
    { to: '/recovery', label: 'Recovery Center', icon: Wrench },
    { to: '/history', label: 'Incident History', icon: History },
    { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/demo', label: 'Demo Lab', icon: FlaskConical, isDemo: true }
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-30 h-screen transition-all duration-300 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
      style={{ backgroundColor: '#0F172A' }}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4.5 border-b border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-base text-white tracking-tight flex items-center gap-1.5">
                PulseOps
                <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-400/30 px-1.5 py-0.2 rounded font-mono font-medium">
                  AI-CORE
                </span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Auto-Recovery Platform</span>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => {
                const baseClasses =
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group relative';
                if (isActive) {
                  return item.isDemo
                    ? `${baseClasses} bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20`
                    : `${baseClasses} bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/25`;
                }
                return item.isDemo
                  ? `${baseClasses} text-purple-300 hover:text-white hover:bg-purple-950/40 border border-purple-500/20`
                  : `${baseClasses} text-slate-400 hover:text-slate-200 hover:bg-slate-800/60`;
              }}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white shadow-xs">
                      {item.badge}
                    </span>
                  )}
                  {item.isDemo && (
                    <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-300 border border-purple-400/40 uppercase">
                      Lab
                    </span>
                  )}
                </div>
              )}
              {collapsed && item.badge !== undefined && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-slate-900" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80">
        <div
          className={`flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/40 border border-slate-700/50 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-soft-pulse shrink-0" />
          {!collapsed && (
            <div className="flex flex-col text-xs">
              <span className="font-semibold text-slate-200">Autonomous Sentinel</span>
              <span className="text-[10px] text-slate-400">Monitoring Active</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
