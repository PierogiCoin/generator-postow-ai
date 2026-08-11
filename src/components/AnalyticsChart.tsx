import React, { Suspense, lazy } from 'react';
import type { LazyChartsSectionProps } from '@/components/charts/LazyChartsSection';

const LazyCharts = lazy(() => import('@/components/charts/LazyChartsSection'));

export const AnalyticsChart: React.FC<LazyChartsSectionProps> = (props) => {
  if (!props.data || props.data.length === 0) {
    return null;
  }

  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-white/5" />}>
      <LazyCharts {...props} />
    </Suspense>
  );
};

