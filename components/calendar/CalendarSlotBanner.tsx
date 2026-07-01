import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CalendarSlotContext } from '../../types';
import { slotTypeBadge } from '../../services/calendarCadenceService';
import { CalendarIcon } from '../icons/CalendarIcon';
import { SparklesIcon } from '../icons/SparklesIcon';

interface CalendarSlotBannerProps {
  slot: CalendarSlotContext;
  batchIndex?: number;
  batchTotal?: number;
  onGenerate?: () => void;
  isGenerating?: boolean;
}

export const CalendarSlotBanner: React.FC<CalendarSlotBannerProps> = ({
  slot,
  batchIndex,
  batchTotal,
  onGenerate,
  isGenerating,
}) => {
  const { t } = useTranslation();
  const dateLabel = new Date(`${slot.date}T12:00:00`).toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="mb-4 p-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 dark:bg-cyan-500/5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
            {batchTotal && batchTotal > 1
              ? t('calendar.slot.batchLabel', 'Batch dnia {{current}}/{{total}}', {
                  current: batchIndex ?? 1,
                  total: batchTotal,
                })
              : t('calendar.slot.bannerLabel', 'Generowanie ze slotu kalendarza')}
          </p>
          <p className="mt-1 font-bold text-slate-900 dark:text-white truncate">
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
              <span className="px-1.5 py-0.5 rounded-full bg-white/60 dark:bg-slate-900/50 text-[10px] font-bold uppercase">
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
        {onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-sm font-bold transition-colors"
          >
            <SparklesIcon className="w-4 h-4" />
            {isGenerating
              ? t('common.generating', 'Generowanie...')
              : t('calendar.slot.generateNow', 'Generuj teraz')}
          </button>
        )}
      </div>
    </div>
  );
};
