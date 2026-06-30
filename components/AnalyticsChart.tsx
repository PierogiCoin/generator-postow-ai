import React, { Suspense, lazy } from 'react';
import type { AnalyticsChartProps } from './AnalyticsChartCore';

const AnalyticsChartCore = lazy(() => import('./AnalyticsChartCore'));

export const ChartSkeleton: React.FC<{ title?: string }> = ({ title }) => (
  <div>
    {title && (
      <h4 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-4">{title}</h4>
    )}
    <div className="h-[250px] w-full rounded-xl bg-slate-100 dark:bg-slate-800/80 animate-pulse border border-slate-200/50 dark:border-slate-700/50" />
  </div>
);

export const AnalyticsChart: React.FC<AnalyticsChartProps> = (props) => {
  if (!props.data || props.data.length === 0) {
    return null;
  }

  return (
    <Suspense fallback={<ChartSkeleton title={props.title} />}>
      <AnalyticsChartCore {...props} />
    </Suspense>
  );
};
