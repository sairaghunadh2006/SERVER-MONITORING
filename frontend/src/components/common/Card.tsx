import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  icon,
  action
}) => {
  return (
    <div className={`pulse-card p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-blue-50/80">
          <div className="flex items-center gap-2.5">
            {icon && <div className="text-blue-600">{icon}</div>}
            <div>
              {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
