import React from 'react';
import type { UsageStats } from '../types';
import { AnalyticsChart } from './AnalyticsChart';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { TrashIcon } from './icons/TrashIcon';

interface StatsDashboardProps {
  stats: UsageStats | null;
  onClearStats: () => void;
}

const transformData = (data: Record<string, number> | undefined) => {
    if (!data) return [];
    return Object.entries(data)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
};


export const StatsDashboard: React.FC<StatsDashboardProps> = ({ stats, onClearStats }) => {
  const hasStats = stats && stats.totalGenerations > 0;

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Statystyki</h2>
        {hasStats && (
          <button
            onClick={onClearStats}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center gap-1"
            title="Wyczyść statystyki"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {!hasStats ? (
        <div className="text-center py-6 text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center h-full">
            <ChartBarIcon className="w-10 h-10 mb-2"/>
            <p className="text-sm">Statystyki pojawią się tutaj.</p>
        </div>
      ) : (
        <div className="space-y-6">
            <div className="text-center">
                <p className="text-slate-500 dark:text-slate-400 text-sm">Całkowita liczba generacji</p>
                <p className="text-4xl font-bold text-slate-900 dark:text-white">{stats.totalGenerations}</p>
            </div>
            <div className="grid grid-cols-1 gap-8">
                <AnalyticsChart title="Wg platformy" data={transformData(stats.byPlatform)} fillColor="#3b82f6" />
                <AnalyticsChart title="Wg tonu" data={transformData(stats.byTone)} fillColor="#8b5cf6" />
                <AnalyticsChart title="Wg typu treści" data={transformData(stats.byContentType)} fillColor="#10b981" />
                <AnalyticsChart title="Wg modelu AI" data={transformData(stats.byModel)} fillColor="#f59e0b" />
            </div>
        </div>
      )}
    </section>
  );
};
