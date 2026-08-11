import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CalendarSlotContext } from '../../types';
import { slotTypeBadge } from '../../services/calendarCadenceService';
import { CalendarIcon } from '../icons/CalendarIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { XMarkIcon } from '../icons/XMarkIcon';

interface CalendarSlotBannerProps {
  slot: CalendarSlotContext;
  batchIndex?: number;
  batchTotal?: number;
  onGenerate?: () => void;
  onCancelBatch?: () => void;
  isGenerating?: boolean;
}

export const CalendarSlotBanner: React.FC<CalendarSlotBannerProps> = ({
  slot,
  batchIndex,
  batchTotal,
  onGenerate,
  onCancelBatch,
  isGenerating,
}) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-GB' : 'pl-PL';
  const dateLabel = new Date(`${slot.date}T12:00:00`).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const isBatch = Boolean(batchTotal && batchTotal > 1);

  return (
    <div className="mb-4 p-4 rounded-lg border border-[var(--hero-accent)]/30 bg-[var(--hero-accent-soft)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--hero-accent)]">
            {isBatch
              ? t('calendar.slot.batchLabel', 'Batch dnia {{current}}/{{total}}', {
                  current: batchIndex ?? 1,
                  total: batchTotal,
                })
              : t('calendar.slot.bannerLabel', 'Generowanie ze slotu kalendarza')}
          </p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white truncate">
            <span className="mr-1.5">{slotTypeBadge(slot.slotType)}</span>
            {slot.topic}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
            <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
            <span>
              {dateLabel}
              {slot.time ? ` · ${slot.time}` : ''}
            </span>
            {slot.contentIntent && (
              <span className="px-1.5 py-0.5 rounded-md bg-white/60 dark:bg-[#071018]/50 text-[10px] font-semibold uppercase">
                {slot.contentIntent}
              </span>
            )}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t(
              'calendar.slot.bannerHint',
              'Po wygenerowaniu treść przejdzie bramę jakości (auto-poprawka do 2×), potem trafi do zaplanowanych publikacji.'
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          {onCancelBatch && isBatch && (
            <button
              type="button"
              onClick={onCancelBatch}
              disabled={isGenerating}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-white/60 dark:hover:bg-white/5 disabled:opacity-60 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
              {t('calendar.slot.cancelBatch', 'Anuluj batch')}
            </button>
          )}
          {onGenerate && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold hover:brightness-110 disabled:opacity-60 transition-all"
              style={{ backgroundColor: 'var(--hero-accent)' }}
            >
              <SparklesIcon className="w-4 h-4" />
              {isGenerating
                ? t('common.generating', 'Generowanie...')
                : t('calendar.slot.generateNow', 'Generuj teraz')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
