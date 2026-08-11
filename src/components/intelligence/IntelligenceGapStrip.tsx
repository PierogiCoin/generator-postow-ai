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
      <div className="mb-6 p-4 rounded-lg border border-[var(--hero-accent)]/25 bg-[var(--hero-accent-soft)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="h-3 w-40 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="px-3 py-2 rounded-lg bg-white/50 dark:bg-[#071018]/40 border border-slate-200/50 dark:border-white/5 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (gapSlots.length === 0) {
    return (
      <div className="mb-6 p-4 rounded-lg border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <TrendingUpIcon className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
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
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white hover:brightness-110"
              style={{ backgroundColor: 'var(--hero-accent)' }}
            >
              Analizuj luki
            </button>
          )}
          <Link
            to="/competitors"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--hero-accent)]/40 text-[var(--hero-accent)] hover:bg-[var(--hero-accent-soft)]"
          >
            Konkurenci →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 rounded-lg border border-[var(--hero-accent)]/25 bg-[var(--hero-accent-soft)] relative z-10">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-4 h-4 text-[var(--hero-accent)]" />
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--hero-accent)]">
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
            className="text-[10px] font-semibold uppercase text-[var(--hero-accent)] hover:underline"
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
            className="group px-3 py-2 rounded-lg bg-white/70 dark:bg-[#071018]/60 border border-[var(--hero-accent)]/30 hover:border-[var(--hero-accent)] hover:bg-[var(--hero-accent-soft)] transition-colors text-left"
            title={slot.reason}
          >
            <span className="text-sm font-bold text-slate-800 dark:text-white">{slot.label}</span>
            <span className="ml-2 text-[10px] font-semibold text-[var(--hero-accent)]">
              luka {slot.gapScore}/10
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
