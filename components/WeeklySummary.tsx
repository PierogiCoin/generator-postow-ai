import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDataStore } from '../stores/dataStore';
import { SparklesIcon } from './icons/SparklesIcon';
import { ArrowRight } from 'lucide-react';

export const WeeklySummary: React.FC = () => {
    const { history } = useDataStore();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [summary, setSummary] = useState<string | null>(null);
    const [isEmpty, setIsEmpty] = useState(false);

    useEffect(() => {
        if (history.length < 3) {
            setIsEmpty(true);
            setSummary(null);
            return;
        }

        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recentHistory = history.filter(item => item.timestamp > oneWeekAgo);

        if (recentHistory.length < 2) {
            setIsEmpty(true);
            setSummary(null);
            return;
        }

        setIsEmpty(false);

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

    if (isEmpty) {
        return (
            <div className="p-6 rounded-3xl border border-white/5 bg-white/[0.03] backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <SparklesIcon className="w-4 h-4 text-emerald-400/60" style={{}} />
                    </div>
                    <h3 className="font-bold text-base text-white tracking-tight">Podsumowanie tygodnia</h3>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                    Wygeneruj pierwszy post, aby zobaczyć statystyki tygodnia.
                </p>
                <button
                    type="button"
                    onClick={() => navigate('/generator')}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                    Generuj post <ArrowRight className="w-3.5 h-3.5" />
                </button>
            </div>
        );
    }

    if (!summary) return null;

    return (
        <div
            className="p-5 sm:p-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl"
            style={{ boxShadow: 'inset 3px 0 0 0 rgba(16,185,129,0.5), 0 8px 32px rgba(0,0,0,0.36)' }}
        >
            <h3 className="font-bold text-lg text-white tracking-tight flex items-center gap-2 mb-2">
                <SparklesIcon className="w-5 h-5 shrink-0 text-emerald-400" style={{}} />
                Podsumowanie tygodnia
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
        </div>
    );
};

