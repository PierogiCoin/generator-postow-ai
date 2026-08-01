import React from 'react';
import { useTranslation } from 'react-i18next';
import { ClockIcon } from 'lucide-react';

interface ImageHistoryStripProps {
  history: string[];
  currentImageUrl: string | null;
  onRestore: (url: string) => void;
}

export const ImageHistoryStrip: React.FC<ImageHistoryStripProps> = ({
  history,
  currentImageUrl,
  onRestore,
}) => {
  const { t } = useTranslation();

  if (!history.length) return null;

  return (
    <div className="p-4 bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3">
      <div className="flex items-center gap-2">
        <ClockIcon className="w-4 h-4 text-slate-400" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {t('resultCard.visualQa.historyTitle', { count: history.length })}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {history.map((url, i) => {
          const isCurrent = url === currentImageUrl;
          const version = history.length - i;
          return (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => onRestore(url)}
              className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all group ${
                isCurrent
                  ? 'border-[var(--hero-accent)] ring-2 ring-[var(--hero-accent)]/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-[var(--hero-accent)]'
              }`}
              aria-label={t('resultCard.visualQa.restoreAria', { version })}
            >
              <img
                src={url}
                alt={t('resultCard.visualQa.versionAlt', { version })}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <span className="text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity uppercase">
                  {t('resultCard.visualQa.restore')}
                </span>
              </div>
              <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] font-bold text-center py-0.5">
                v{version}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
