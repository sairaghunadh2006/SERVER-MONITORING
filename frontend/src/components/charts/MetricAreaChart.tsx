import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface MetricAreaChartProps {
  data: any[];
  dataKey: string;
  name: string;
  unit?: string;
  color?: string;
  strokeColor?: string;
  height?: number;
  domain?: [number | string, number | string];
}

export const MetricAreaChart: React.FC<MetricAreaChartProps> = ({
  data,
  dataKey,
  name,
  unit = '',
  color = '#2563EB',
  strokeColor = '#1D4ED8',
  height = 240,
  domain = [0, 'auto']
}) => {
  const gradientId = `gradient-${dataKey}-${Math.random().toString(36).substring(2, 7)}`;

  // Format timestamp for display
  const formattedData = data.map((d) => {
    let timeLabel = '';
    if (d.timestamp) {
      const dt = new Date(d.timestamp);
      timeLabel = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    return {
      ...d,
      timeLabel
    };
  });

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey="timeLabel"
            tick={{ fontSize: 11, fill: '#64748B' }}
            stroke="#CBD5E1"
            tickLine={false}
          />
          <YAxis
            domain={domain}
            tick={{ fontSize: 11, fill: '#64748B' }}
            stroke="#CBD5E1"
            tickLine={false}
            unit={unit ? ` ${unit}` : ''}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              borderRadius: '0.75rem',
              border: '1px solid #DBEAFE',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              fontSize: '12px'
            }}
            formatter={(value: any) => [`${value}${unit}`, name]}
            labelFormatter={(label) => `Time: ${label}`}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={strokeColor}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
