import React from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '../icons/XMarkIcon';
import type { DayAudit } from '../../services/calendarCadenceService';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CalendarIcon } from '../icons/CalendarIcon';

interface DayAuditPanelProps {
  audit: DayAudit;
  dateLabel: string;
  generateGapCount: number;
  onClose: () => void;
  onFillMissing: () => void;
  onGenerateAll: () => void;
  isFilling: boolean;
  isGenerating: boolean;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30';
  return 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30';
}

export const DayAuditPanel: React.FC<DayAuditPanelProps> = ({
  audit,
  dateLabel,
  generateGapCount,
  onClose,
  onFillMissing,
  onGenerateAll,
  isFilling,
  isGenerating,
}) => {
  const { t } = useTranslation();
  const hasGaps =
    audit.slotsFilled.post < audit.slotsTarget.post ||
    audit.slotsFilled.reel < audit.slotsTarget.reel ||
    audit.slotsFilled.story < audit.slotsTarget.story;
  const busy = isFilling || isGenerating;

  return (
    <div
      className="absolute inset-0 bg-black/45 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-premium rounded-2xl border border-white/10 shadow-2xl p-5 w-full max-w-md relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>

        <h4 className="font-bold text-lg text-slate-900 dark:text-white pr-8">
          {t('calendar.audit.title', 'Audyt dnia')}: {dateLabel}
        </h4>

        <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${scoreColor(audit.score)}`}>
          {t('calendar.audit.score', 'Wynik')}: {audit.score}/100
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          {(['post', 'reel', 'story'] as const).map((type) => (
            <div key={type} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
              <p className="font-black uppercase text-slate-500 text-[9px]">{type}</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white">
                {audit.slotsFilled[type]}/{audit.slotsTarget[type]}
              </p>
            </div>
          ))}
        </div>

        {audit.issues.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-sm text-red-600 dark:text-red-400">
            {audit.issues.map((issue) => (
              <li key={issue}>• {issue}</li>
            ))}
          </ul>
        )}

        {audit.tips.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            {audit.tips.map((tip) => (
              <li key={tip}>💡 {tip}</li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {hasGaps && (
            <button
              type="button"
              disabled={busy}
              onClick={onFillMissing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm font-bold transition disabled:opacity-50 border border-slate-200 dark:border-slate-700"
            >
              <SparklesIcon className="w-4 h-4 text-cyan-500" />
              {isFilling
                ? t('calendar.audit.filling', 'Uzupełnianie…')
                : t('calendar.audit.fillMissing', 'Uzupełnij brakujące sloty')}
            </button>
          )}

          {generateGapCount > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={onGenerateAll}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
            >
              <CalendarIcon className="w-4 h-4" />
              {isGenerating
                ? t('calendar.audit.generatingAll', 'Uruchamianie…')
                : t('calendar.audit.generateAll', 'Generuj wszystkie braki ({{count}})', {
                    count: generateGapCount,
                  })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
