import React from 'react';
import { useTranslation } from 'react-i18next';

export type ResultCardTab = 'content' | 'media' | 'repurpose' | 'publish' | 'analysis';

interface ResultCardTabBarProps {
  active: ResultCardTab;
  onChange: (tab: ResultCardTab) => void;
}

const TABS: { id: ResultCardTab; labelKey: string; fallback: string }[] = [
  { id: 'content', labelKey: 'resultCard.tabs.content', fallback: 'Treść' },
  { id: 'media', labelKey: 'resultCard.tabs.media', fallback: 'Media' },
  { id: 'repurpose', labelKey: 'resultCard.tabs.repurpose', fallback: 'Formaty' },
  { id: 'publish', labelKey: 'resultCard.tabs.publish', fallback: 'Publikacja' },
  { id: 'analysis', labelKey: 'resultCard.tabs.analysis', fallback: 'Analiza' },
];

export const ResultCardTabBar: React.FC<ResultCardTabBarProps> = ({ active, onChange }) => {
  const { t } = useTranslation();

  return (
    <nav
      className="flex gap-1 p-1 mb-6 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800"
      role="tablist"
      aria-label={t('resultCard.tabs.label', 'Sekcje wyniku')}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              isActive
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t(tab.labelKey, tab.fallback)}
          </button>
        );
      })}
    </nav>
  );
};
