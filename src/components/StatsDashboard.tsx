import React from 'react';
import type { UsageStats } from '../types';
import { AnalyticsChart } from './AnalyticsChart';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { RocketIcon } from './icons/RocketIcon';
import { ClockIcon } from './icons/ClockIcon';

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
    <section className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Centrum Dowodzenia</h2>
        {hasStats && (
          <button
            onClick={onClearStats}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
            title="Wyczyść statystyki"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {!hasStats ? (
        <div className="text-center py-12 bg-white/40 dark:bg-slate-900/40 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center animate-fade-in">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
            <ChartBarIcon className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Twoje sukcesy pojawią się tutaj</p>
          <p className="text-xs text-slate-400 mt-2">Zacznij generować posty, aby zobaczyć statystyki.</p>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4">
            <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <RocketIcon className="w-32 h-32" />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80 mb-1">Całkowita Aktywność</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black">{stats.totalGenerations}</span>
                <span className="text-sm font-bold mb-2">GENERACJI</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-md">
                <SparklesIcon className="w-3 h-3" />
                AI DZIAŁA NA PEŁNYCH OBROTACH
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Oszczędzony Czas</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">~{stats.totalGenerations * 15} min</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center">
                <ClockIcon className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="space-y-8">
            <div className="p-6 bg-white/40 dark:bg-slate-950/40 rounded-[2rem] border border-white/10 backdrop-blur-md">
              <AnalyticsChart title="Dominujące Platformy" data={transformData(stats.byPlatform)} fillColor="#3b82f6" />
            </div>

            <div className="p-6 bg-white/40 dark:bg-slate-950/40 rounded-[2rem] border border-white/10 backdrop-blur-md">
              <AnalyticsChart title="Preferowany Ton" data={transformData(stats.byTone)} fillColor="#8b5cf6" />
            </div>

            <div className="p-6 bg-white/40 dark:bg-slate-950/40 rounded-[2rem] border border-white/10 backdrop-blur-md">
              <AnalyticsChart title="Modele AI" data={transformData(stats.byModel)} fillColor="#f59e0b" />
            </div>
          </div>

          <div className="p-6 bg-indigo-600/5 rounded-[2rem] border border-indigo-500/20">
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2 uppercase flex items-center gap-2">
              <SparklesIcon className="w-4 h-4" />
              Ekspercka Porada AI
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
              "Zauważyłem, że Twoje posty w tonie '{transformData(stats.byTone)[0]?.label || '...'}' generują najwięcej uwagi. Spróbuj zwiększyć częstotliwość na {transformData(stats.byPlatform)[0]?.label || '...'}."
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
