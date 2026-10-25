import React from 'react';

export type BadgeVariant =
  | 'healthy'
  | 'degraded'
  | 'unavailable'
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'open'
  | 'investigating'
  | 'recovering'
  | 'recovered'
  | 'unresolved'
  | 'rule_based'
  | 'machine_learning'
  | 'simulated'
  | 'real'
  | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; dotColor: string; border: string }> = {
  healthy: { bg: 'bg-emerald-50', text: 'text-emerald-700', dotColor: 'bg-emerald-500', border: 'border-emerald-200' },
  degraded: { bg: 'bg-amber-50', text: 'text-amber-700', dotColor: 'bg-amber-500', border: 'border-amber-200' },
  unavailable: { bg: 'bg-rose-50', text: 'text-rose-700', dotColor: 'bg-rose-500', border: 'border-rose-200' },
  critical: { bg: 'bg-red-50', text: 'text-red-700', dotColor: 'bg-red-600', border: 'border-red-200' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', dotColor: 'bg-orange-500', border: 'border-orange-200' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-800', dotColor: 'bg-yellow-500', border: 'border-yellow-200' },
  low: { bg: 'bg-blue-50', text: 'text-blue-700', dotColor: 'bg-blue-500', border: 'border-blue-200' },
  open: { bg: 'bg-rose-50', text: 'text-rose-700', dotColor: 'bg-rose-500', border: 'border-rose-200' },
  investigating: { bg: 'bg-amber-50', text: 'text-amber-800', dotColor: 'bg-amber-500', border: 'border-amber-200' },
  recovering: { bg: 'bg-sky-50', text: 'text-sky-700', dotColor: 'bg-sky-500', border: 'border-sky-200' },
  recovered: { bg: 'bg-emerald-50', text: 'text-emerald-700', dotColor: 'bg-emerald-500', border: 'border-emerald-200' },
  unresolved: { bg: 'bg-slate-100', text: 'text-slate-700', dotColor: 'bg-slate-500', border: 'border-slate-200' },
  rule_based: { bg: 'bg-indigo-50', text: 'text-indigo-700', dotColor: 'bg-indigo-500', border: 'border-indigo-200' },
  machine_learning: { bg: 'bg-purple-50', text: 'text-purple-700', dotColor: 'bg-purple-600', border: 'border-purple-200' },
  simulated: { bg: 'bg-purple-50', text: 'text-purple-700', dotColor: 'bg-purple-500', border: 'border-purple-300' },
  real: { bg: 'bg-blue-50', text: 'text-blue-700', dotColor: 'bg-blue-600', border: 'border-blue-200' },
  neutral: { bg: 'bg-slate-50', text: 'text-slate-600', dotColor: 'bg-slate-400', border: 'border-slate-200' }
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, className = '', dot = true }) => {
  const style = variantStyles[variant] || variantStyles.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${style.dotColor}`} />}
      {children}
    </span>
  );
};
