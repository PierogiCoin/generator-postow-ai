import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AnalyticsChartProps {
  data: { label: string; value: number }[];
  title: string;
  fillColor: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        padding: '0.5rem',
        backgroundColor: 'var(--tooltip-bg)',
        border: '1px solid var(--tooltip-border)',
        borderRadius: '0.375rem',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      }}>
        <p style={{ fontWeight: 'bold', color: 'var(--tooltip-text)' }}>{`${label}`}</p>
        <p style={{ fontSize: '0.875rem', color: '#3b82f6' }}>{`Liczba generacji: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ data, title, fillColor }) => {
  if (!data || data.length === 0) {
    return null;
  }

  const labelAngle = data.length > 5 ? -35 : 0;
  const textAnchor = data.length > 5 ? 'end' : 'middle';

  return (
    <div>
      <h4 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-4">{title}</h4>
      <div style={{ width: '100%', height: 250 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 20,
              left: -10,
              bottom: labelAngle === 0 ? 5 : 35,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke)" />
            <XAxis 
              dataKey="label" 
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} 
              angle={labelAngle}
              textAnchor={textAnchor}
              height={labelAngle === 0 ? 15 : 40}
              interval={0}
            />
            <YAxis allowDecimals={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
            <Tooltip {...({ content: <CustomTooltip />, cursor: { fill: 'rgba(100, 116, 139, 0.1)' } } as any)} />
            <Bar {...({ dataKey: 'value', fill: fillColor, radius: [4, 4, 0, 0] } as any)} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
