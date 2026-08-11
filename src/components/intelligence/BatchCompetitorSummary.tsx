import React from 'react';
import type { IntelligenceSource } from '../../services/intelligenceService';
import { UsersIcon } from '../icons/UsersIcon';

export type BatchCompetitorResult = {
  timingGaps?: string[];
  contentGaps?: string[];
  sharedPeakTimes?: string[];
  sharedQuietTimes?: string[];
  opportunities?: string[];
  recommendation?: string;
  perCompetitor?: { handle: string; summary: string; topWeakness?: string }[];
};

interface BatchCompetitorSummaryProps {
  batch: BatchCompetitorResult;
  sources?: IntelligenceSource[];
  analyzedAt?: string;
}

export const BatchCompetitorSummary: React.FC<BatchCompetitorSummaryProps> = ({
  batch,
  sources,
  analyzedAt,
}) => {
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <UsersIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h2 className="font-bold text-slate-900 dark:text-white">Porównanie grupy konkurentów</h2>
        {analyzedAt && (
          <span className="text-xs text-slate-400 ml-auto">
            {new Date(analyzedAt).toLocaleString('pl-PL')}
          </span>
        )}
      </div>

      {batch.recommendation && (
        <p className="text-sm text-indigo-900 dark:text-indigo-200 bg-white/50 dark:bg-slate-900/40 rounded-xl p-3">
          {batch.recommendation}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(batch.timingGaps?.length ?? 0) > 0 && (
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-cyan-600 mb-2">
              Luki godzinowe
            </h3>
            <ul className="space-y-1">
              {batch.timingGaps!.slice(0, 6).map((g) => (
                <li key={g} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
                  <span className="text-cyan-500">🎯</span>
                  {g}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(batch.contentGaps?.length ?? 0) > 0 && (
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 mb-2">
              Luki treści
            </h3>
            <ul className="space-y-1">
              {batch.contentGaps!.slice(0, 6).map((g) => (
                <li key={g} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
                  <span className="text-amber-500">💡</span>
                  {g}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {((batch.sharedPeakTimes?.length ?? 0) > 0 || (batch.sharedQuietTimes?.length ?? 0) > 0) && (
        <div className="flex flex-wrap gap-4 text-sm">
          {batch.sharedPeakTimes && batch.sharedPeakTimes.length > 0 && (
            <div>
              <span className="font-bold text-red-600 dark:text-red-400">Szczyty konkurencji: </span>
              <span className="text-slate-600 dark:text-slate-400">{batch.sharedPeakTimes.join(', ')}</span>
            </div>
          )}
          {batch.sharedQuietTimes && batch.sharedQuietTimes.length > 0 && (
            <div>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Cisza u konkurencji: </span>
              <span className="text-slate-600 dark:text-slate-400">{batch.sharedQuietTimes.join(', ')}</span>
            </div>
          )}
        </div>
      )}

      {(batch.perCompetitor?.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-indigo-200/50 dark:border-indigo-800/50">
          {batch.perCompetitor!.map((c) => (
            <div key={c.handle} className="text-xs bg-white/40 dark:bg-slate-900/40 rounded-lg p-2">
              <span className="font-bold text-slate-800 dark:text-white">@{c.handle}</span>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">{c.summary}</p>
              {c.topWeakness && (
                <p className="text-red-500/80 mt-0.5">Słabość: {c.topWeakness}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {(sources?.length ?? 0) > 0 && (
        <p className="text-[10px] text-slate-400 pt-1">
          Źródła: {sources!.slice(0, 4).map((s) => s.title).join(' · ')}
        </p>
      )}
    </div>
  );
};
