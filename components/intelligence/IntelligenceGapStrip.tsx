import React from 'react';
import { Link } from 'react-router-dom';
import type { GapSlotResult } from '../../services/intelligenceService';
import { SparklesIcon } from '../icons/SparklesIcon';
import { TrendingUpIcon } from '../icons/TrendingUpIcon';

interface IntelligenceGapStripProps {
  gapSlots: GapSlotResult[];
  recommendation?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onSelectSlot?: (slot: GapSlotResult) => void;
}

export const IntelligenceGapStrip: React.FC<IntelligenceGapStripProps> = ({
  gapSlots,
  recommendation,
  isLoading,
  onRefresh,
  onSelectSlot,
}) => {
  if (isLoading) {
    return (
      <div className="mb-6 p-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 animate-pulse">
        <p className="text-sm text-cyan-600 dark:text-cyan-400 font-medium">
          Analizuję luki godzinowe vs konkurencja…
        </p>
      </div>
    );
  }

  if (gapSlots.length === 0) {
    return (
      <div className="mb-6 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <TrendingUpIcon className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Brak analizy luk godzinowych
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Dodaj konkurentów i uruchom analizę — kalendarz zaproponuje lepsze godziny slotów.
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-cyan-600 text-white hover:bg-cyan-500"
            >
              Analizuj luki
            </button>
          )}
          <Link
            to="/competitors"
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/10"
          >
            Konkurenci →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-cyan-500/8 to-indigo-500/8 relative z-10">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-cyan-500" />
          <h3 className="text-xs font-black uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
            Najlepsze godziny vs konkurencja
          </h3>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            kliknij → zastosuj w tym tygodniu
          </span>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="text-[10px] font-bold uppercase text-cyan-600 hover:underline"
          >
            Odśwież
          </button>
        )}
      </div>

      {recommendation && (
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">{recommendation}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {gapSlots.slice(0, 5).map((slot) => (
          <button
            key={`${slot.weekday}-${slot.hour}`}
            type="button"
            onClick={() => onSelectSlot?.(slot)}
            className="group px-3 py-2 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-cyan-500/30 hover:border-cyan-500 hover:bg-cyan-500/10 transition-all text-left"
            title={slot.reason}
          >
            <span className="text-sm font-black text-slate-800 dark:text-white">{slot.label}</span>
            <span className="ml-2 text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
              luka {slot.gapScore}/10
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
