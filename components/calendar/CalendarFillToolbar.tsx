import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { ModernButton } from '../ui/ModernButton';
import { Platform } from '../../types';
import {
  CADENCE_PRESETS,
  type CadencePresetId,
} from '../../services/calendarCadenceService';
import { PLATFORMS } from '../../constants';

interface CalendarFillToolbarProps {
  presetId: CadencePresetId;
  weekTheme: string;
  platform: Platform;
  isFilling: boolean;
  /** Zakres widocznego tygodnia — fill zawsze dotyczy tego zakresu */
  weekRangeLabel?: string;
  onPresetChange: (id: CadencePresetId) => void;
  onThemeChange: (theme: string) => void;
  onPlatformChange: (platform: Platform) => void;
  onFillWeek: () => void;
  onOpenBulkQueue?: () => void;
  bulkQueueCount?: number;
}

export const CalendarFillToolbar: React.FC<CalendarFillToolbarProps> = ({
  presetId,
  weekTheme,
  platform,
  isFilling,
  weekRangeLabel,
  onPresetChange,
  onThemeChange,
  onPlatformChange,
  onFillWeek,
  onOpenBulkQueue,
  bulkQueueCount = 0,
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 640 : true
  );

  return (
    <div className="mb-6 p-4 md:p-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 relative z-10">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left sm:cursor-default"
        aria-expanded={isExpanded}
      >
        <div>
          <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white">
            {t('calendar.fill.title', 'Wypełnij kalendarz')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {weekRangeLabel
              ? t('calendar.fill.subtitleRange', 'AI uzupełni widoczny tydzień ({{range}}) slotami — posty i rolki.', {
                  range: weekRangeLabel,
                })
              : t('calendar.fill.subtitle', 'Wybierz szablon cadence i AI uzupełni tydzień slotami (posty + rolki).')}
          </p>
        </div>
        <ChevronDownIcon className={`w-5 h-5 shrink-0 text-slate-400 transition-transform sm:hidden ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 ${isExpanded ? '' : 'hidden sm:grid'}`}>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {t('calendar.cadence.label', 'Szablon cadence')}
          </label>
          <select
            value={presetId}
            onChange={(e) => onPresetChange(e.target.value as CadencePresetId)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm font-semibold"
          >
            {(Object.keys(CADENCE_PRESETS) as CadencePresetId[]).map((id) => (
              <option key={id} value={id}>
                {t(CADENCE_PRESETS[id].labelKey, id)}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-500 leading-snug">
            {t(CADENCE_PRESETS[presetId].descriptionKey, '')}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {t('calendar.fill.weekTheme', 'Temat tygodnia')}
          </label>
          <input
            type="text"
            value={weekTheme}
            onChange={(e) => onThemeChange(e.target.value)}
            placeholder={t('calendar.fill.weekThemePlaceholder', 'np. Letnia kolekcja 2025')}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {t('form.platform.label', 'Platforma')}
          </label>
          <select
            value={platform}
            onChange={(e) => onPlatformChange(e.target.value as Platform)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-sm font-semibold"
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 justify-end">
          <ModernButton
            type="button"
            variant="gradient"
            fullWidth
            disabled={isFilling || !weekTheme.trim()}
            onClick={onFillWeek}
            icon={<SparklesIcon className="w-5 h-5" />}
          >
            {isFilling
              ? t('calendar.fill.filling', 'Generowanie…')
              : weekRangeLabel
                ? t('calendar.fill.fillThisWeek', 'Wypełnij ten tydzień')
                : t('calendar.fill.fillWeek', 'Wypełnij tydzień')}
          </ModernButton>
          {onOpenBulkQueue && (
            <ModernButton
              type="button"
              variant="outline"
              fullWidth
              onClick={onOpenBulkQueue}
              disabled={bulkQueueCount === 0}
            >
              {t('calendar.bulk.open', 'Kolejka publikacji')}
              {bulkQueueCount > 0 ? ` (${bulkQueueCount})` : ''}
            </ModernButton>
          )}
        </div>
      </div>
    </div>
  );
};
