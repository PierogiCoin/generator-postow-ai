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
        return null; // or a loading skeleton
    }

    return (
        <div className="p-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl">
             <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                <SparklesIcon className="w-6 h-6 text-blue-500" />
                {t('dashboard.weeklySummary.title')}
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">{summary}</p>
        </div>
    );
};
