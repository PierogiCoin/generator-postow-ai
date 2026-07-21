import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDataStore } from '../stores/dataStore';
import { SparklesIcon } from './icons/SparklesIcon';

export const WeeklySummary: React.FC = () => {
    const { history } = useDataStore();
    const { t } = useTranslation();
    const [summary, setSummary] = useState<string | null>(null);

    useEffect(() => {
        if (history.length < 3) {
            setSummary(t('dashboard.weeklySummary.start'));
            return;
        }
        
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentHistory = history.filter(item => item.timestamp > oneWeekAgo);

        if (recentHistory.length < 2) {
            setSummary(t('dashboard.weeklySummary.start'));
            return;
        }
        
        const platformCounts = recentHistory.reduce((acc, item) => {
            acc[item.formData.platform] = (acc[item.formData.platform] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const toneCounts = recentHistory.reduce((acc, item) => {
            acc[item.formData.tone] = (acc[item.formData.tone] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const mostUsedPlatform = Object.keys(platformCounts).reduce((a, b) => platformCounts[a] > platformCounts[b] ? a : b);
        const mostUsedTone = Object.keys(toneCounts).reduce((a, b) => toneCounts[a] > toneCounts[b] ? a : b);

        setSummary(t('dashboard.weeklySummary.summary', { platform: mostUsedPlatform, tone: t(`enums.Tone.${mostUsedTone}`).toLowerCase() }));

    }, [history, t]);

    if (!summary) {
        return null;
    }

    return (
        <div
          className="p-5 sm:p-6 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f1c2e]"
          style={{ boxShadow: 'inset 3px 0 0 0 var(--hero-accent)' }}
        >
             <h3 className="font-display text-lg font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                <SparklesIcon className="w-5 h-5 shrink-0" style={{ color: 'var(--hero-accent)' }} />
                {t('dashboard.weeklySummary.title')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{summary}</p>
        </div>
    );
};
