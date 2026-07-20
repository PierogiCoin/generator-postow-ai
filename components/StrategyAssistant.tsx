import React, { useState, useEffect } from 'react';
import { useGenerationStore } from '../stores/generationStore';
import { useDataStore } from '../stores/dataStore';
import { SparklesIcon } from './icons/SparklesIcon';
import { BulbIcon } from './icons/BulbIcon';
import { useTranslation } from 'react-i18next';
import { GenerationType } from '../types';

export const StrategyAssistant: React.FC = () => {
    const { t } = useTranslation();
    const { result, lastFormData } = useGenerationStore();
    const { history } = useDataStore();
    const [tips, setTips] = useState<{ id: string; text: string; category: string }[]>([]);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        const newTips: { id: string; text: string; category: string }[] = [];
        const text = result?.postText || '';
        const topic = lastFormData?.topic || '';
        const cleanTopic = topic.replace(/<[^>]*>?/gm, '').trim();

        if (cleanTopic.length > 0 && cleanTopic.length < 20) {
            newTips.push({
                id: '1',
                category: 'Hook',
                text: t(
                    'strategyAssistant.tips.shortTopic',
                    'Twój temat jest krótki. Dodaj haczyk emocjonalny, aby zwiększyć klikalność.'
                ),
            });
        }

        if (text.length > 0) {
            if (!text.includes('?') && !text.includes('!')) {
                newTips.push({
                    id: '2',
                    category: 'Engagement',
                    text: t(
                        'strategyAssistant.tips.question',
                        'Dodaj pytanie na końcu, aby zachęcić odbiorców do komentowania.'
                    ),
                });
            }
            if (text.length > 500) {
                newTips.push({
                    id: '3',
                    category: 'Readability',
                    text: t(
                        'strategyAssistant.tips.longPost',
                        'Post jest dość długi — wypunktowania poprawią czytelność.'
                    ),
                });
            }
            if (
                !text.toLowerCase().includes('kliknij') &&
                !text.toLowerCase().includes('sprawdź') &&
                !text.toLowerCase().includes('zobacz')
            ) {
                newTips.push({
                    id: '4',
                    category: 'CTA',
                    text: t(
                        'strategyAssistant.tips.cta',
                        'Brakuje jasnego wezwania do działania (CTA).'
                    ),
                });
            }
        } else if (cleanTopic.length > 10) {
            newTips.push({
                id: '5',
                category: 'Strategy',
                text: t(
                    'strategyAssistant.tips.abTest',
                    'Świetny temat — spróbuj A/B Test, żeby porównać dwa podejścia.'
                ),
            });
        }

        if (history && history.length > 3) {
            const recentTypes = history.slice(0, 5).map((h) => h.formData?.generationType).filter(Boolean);
            const isHeavyOnImages = recentTypes.filter((type) => type === GenerationType.PostWithImage).length >= 4;
            if (isHeavyOnImages) {
                newTips.push({
                    id: '6',
                    category: 'Content Mix',
                    text: t(
                        'strategyAssistant.tips.contentMix',
                        'Ostatnio dominują posty z grafiką — urozmać feed wideo lub story.'
                    ),
                });
            }
        }

        setTips(newTips);
        setExpanded(false);
    }, [result, lastFormData, history, t]);

    if (tips.length === 0) return null;

    const visibleTips = expanded ? tips : tips.slice(0, 1);

    return (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] dark:bg-cyan-500/[0.08] p-3.5 sm:p-4 animate-fade-in">
            <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-cyan-600 rounded-lg text-white shrink-0">
                        <BulbIcon className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-cyan-800 dark:text-cyan-300 truncate">
                        {t('strategyAssistant.title', 'Wskazówka strategii')}
                    </h3>
                    {tips.length > 1 && (
                        <span className="text-[10px] font-bold text-cyan-700/70 dark:text-cyan-400/70 shrink-0">
                            {tips.length}
                        </span>
                    )}
                </div>
                <SparklesIcon className="w-3.5 h-3.5 text-cyan-600/70 shrink-0" />
            </div>

            <div className="space-y-2.5">
                {visibleTips.map((tip) => (
                    <div key={tip.id}>
                        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-700/70 dark:text-cyan-400/70">
                            {tip.category}
                        </span>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed mt-0.5">
                            {tip.text}
                        </p>
                    </div>
                ))}
            </div>

            {tips.length > 1 && (
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-3 text-[11px] font-bold text-cyan-700 dark:text-cyan-400 hover:underline"
                >
                    {expanded
                        ? t('strategyAssistant.showLess', 'Pokaż mniej')
                        : t('strategyAssistant.showMore', 'Pokaż {{count}} więcej', { count: tips.length - 1 })}
                </button>
            )}
        </div>
    );
};
