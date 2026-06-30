import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GenerationResult, FormData } from '../../types';
import { useNotifications } from '../../hooks/useNotifications';
import { useAppHandlers } from '../../hooks/useAppHandlers';
import { useGenerationStore } from '../../stores/generationStore';
import { LayersIcon } from '../icons/LayersIcon';
import { TrendingUpIcon } from '../icons/TrendingUpIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { RocketLaunchIcon } from '../icons/RocketLaunchIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ModernButton } from '../ui/ModernButton';

interface ResultMoreMenuProps {
  result: GenerationResult;
  formData: FormData;
  onOpenCreativeStudio: () => void;
}

export const ResultMoreMenu: React.FC<ResultMoreMenuProps> = ({
  result,
  formData,
  onOpenCreativeStudio,
}) => {
  const { t } = useTranslation();
  const notificationSystem = useNotifications();
  const appHandlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification);
  const { isRepurposing, isPredictingPerformance, isAnalyzingSEO } = useGenerationStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const items = [
    {
      id: 'repurpose',
      label: t('resultCard.more.repurpose', 'Przetwórz'),
      icon: LayersIcon,
      disabled: isRepurposing,
      onClick: () => appHandlers.handleOpenRepurposeModal(result),
    },
    {
      id: 'predict',
      label: t('resultCard.more.predict', 'Prognozuj'),
      icon: TrendingUpIcon,
      disabled: isPredictingPerformance,
      onClick: () => appHandlers.handlePredictPerformance(),
    },
    {
      id: 'seo',
      label: t('resultCard.more.seo', 'Analiza SEO'),
      icon: SearchIcon,
      disabled: isAnalyzingSEO,
      onClick: () => appHandlers.handleAnalyzeSEO(),
    },
    {
      id: 'publish',
      label: t('resultCard.more.publish', 'Publikuj teraz'),
      icon: RocketLaunchIcon,
      onClick: () => appHandlers.handlePublishNow(result, formData.platform),
    },
    ...(result.imageUrl
      ? [
          {
            id: 'magic-design',
            label: t('resultCard.more.magicDesign', 'Magic Design'),
            icon: SparklesIcon,
            onClick: onOpenCreativeStudio,
          },
        ]
      : []),
  ];

  return (
    <div className="relative" ref={ref}>
      <ModernButton
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="min-w-[88px]"
      >
        {t('resultCard.more.label', 'Więcej')}
        <svg
          className={`w-4 h-4 ml-1 inline transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </ModernButton>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1"
          role="menu"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                <Icon className="w-4 h-4 text-slate-500 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
