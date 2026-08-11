import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ContentInventoryReview } from '../../types';

interface ContentInventoryPreviewProps {
  review: ContentInventoryReview;
  compact?: boolean;
}

export const ContentInventoryPreview: React.FC<ContentInventoryPreviewProps> = ({
  review,
  compact = false,
}) => {
  const { t } = useTranslation();

  const STATUS_LABELS: Record<string, string> = {
    published: t('inventory.status.published', 'Opublikowane'),
    scheduled: t('inventory.status.scheduled', 'Zaplanowane'),
    planned: t('inventory.status.planned', 'W kalendarzu'),
    generated: t('inventory.status.generated', 'Wygenerowane'),
    saved: t('inventory.status.saved', 'Ulubione'),
  };

  if (review.totalCount === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-sm text-slate-500">
        {t('inventory.empty', 'Brak wcześniejszych treści — strategia zostanie zbudowana od zera.')}
      </div>
    );
  }

  return (
    <div className="p-5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
          {t('inventory.title', 'Przegląd Twoich treści')}
        </h3>
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
          {t('inventory.itemCount', { count: review.totalCount, defaultValue: `${review.totalCount} pozycji` })}
          {review.upcomingScheduled > 0 && ` · ${t('inventory.inQueue', { count: review.upcomingScheduled, defaultValue: `${review.upcomingScheduled} w kolejce` })}`}
        </span>
      </div>

      {!compact && review.topPerformers.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase text-emerald-600 mb-1">{t('inventory.whatWorked', 'Co działało')}</p>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            {review.topPerformers.map((tp, i) => (
              <li key={`top-${i}`} className="line-clamp-1">• {tp}</li>
            ))}
          </ul>
        </div>
      )}

      {review.coverageGaps.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase text-amber-600 mb-1">{t('inventory.gapsToFill', 'Luki do uzupełnienia')}</p>
          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            {review.coverageGaps.map((g, i) => (
              <li key={`gap-${i}`}>• {g}</li>
            ))}
          </ul>
        </div>
      )}

      {!compact && (
        <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
          {review.items.slice(0, 12).map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2 text-xs p-2 bg-white dark:bg-slate-800/50 rounded-lg"
            >
              <span className="shrink-0 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[9px] font-bold uppercase">
                {STATUS_LABELS[item.status] || item.status}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">{item.topic}</p>
                <p className="text-slate-500">
                  {item.platform && `${item.platform} · `}
                  {item.date || '—'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
