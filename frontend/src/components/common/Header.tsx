import React from 'react';
import { RefreshCw, Bell, Radio, CheckCircle2, AlertOctagon, Box } from 'lucide-react';
import { Badge } from './Badge';

interface HeaderProps {
  title: string;
  subtitle?: string;
  isBackendConnected: boolean;
  dockerAvailable: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  openIncidentsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  isBackendConnected,
  dockerAvailable,
  isRefreshing,
  onRefresh,
  openIncidentsCount
}) => {
  return (
    <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-blue-100/80 px-6 flex items-center justify-between shadow-xs">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>

      {/* Status Indicators & Controls */}
      <div className="flex items-center gap-3">
        {/* Backend Connection Badge */}
        {isBackendConnected ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-soft-pulse" />
            Live Engine
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Backend Offline
          </div>
        )}

        {/* Docker Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
          <Box className="w-3.5 h-3.5 text-blue-500" />
          <span>Docker: {dockerAvailable ? 'Available' : 'Simulated'}</span>
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50/80 border border-slate-200 transition flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
          title="Refresh metrics immediately"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          <span className="hidden md:inline">Refresh</span>
        </button>

        {/* Incidents Indicator */}
        <div className="relative">
          <div className="p-2 rounded-xl text-slate-600 bg-slate-50 border border-slate-200 flex items-center justify-center">
            <Bell className="w-4 h-4 text-slate-600" />
          </div>
          {openIncidentsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center shadow-xs">
              {openIncidentsCount}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
