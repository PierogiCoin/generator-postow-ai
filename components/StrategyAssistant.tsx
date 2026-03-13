import React, { useState, useEffect } from 'react';
import { useGenerationStore } from '../stores/generationStore';
import { useDataStore } from '../stores/dataStore';
import { SparklesIcon } from './icons/SparklesIcon';
import { BulbIcon } from './icons/BulbIcon';
import { RocketLaunchIcon } from './icons/RocketLaunchIcon';
import { useTranslation } from 'react-i18next';
import { GenerationType } from '../types'; // Import GenerationType

export const StrategyAssistant: React.FC = () => {
    const { t } = useTranslation();
    const { result, lastFormData } = useGenerationStore();
    const { history } = useDataStore();
    const [tips, setTips] = useState<{ id: string; text: string; category: string }[]>([]);
    
    useEffect(() => {
        // Simple heuristic-based strategy tips
        const newTips = [];
        const text = result?.postText || "";
        const topic = lastFormData?.topic || "";
        const cleanTopic = topic.replace(/<[^>]*>?/gm, '').trim();

        if (cleanTopic.length > 0 && cleanTopic.length < 20) {
            newTips.push({ id: '1', category: 'Hook', text: 'Twój temat jest krótki. Dodaj do niego "haczyk" emocjonalny, aby zwiększyć klikalność.' });
        }

        if (text.length > 0) {
            if (!text.includes('?') && !text.includes('!')) {
                newTips.push({ id: '2', category: 'Engagement', text: 'Dodaj pytanie na końcu, aby zachęcić odbiorców do komentowania.' });
            }
            if (text.length > 500) {
                newTips.push({ id: '3', category: 'Readability', text: 'Twój post jest dość długi. Upewnij się, że używasz wypunktowań dla lepszej czytelności.' });
            }
            if (!text.toLowerCase().includes('kliknij') && !text.toLowerCase().includes('sprawdź') && !text.toLowerCase().includes('zobacz')) {
                newTips.push({ id: '4', category: 'CTA', text: 'Brakuje jasnego wezwania do działania (CTA). Powiedz ludziom, co mają zrobić po przeczytaniu.' });
            }
        } else if (cleanTopic.length > 10) {
            newTips.push({ id: '5', category: 'Strategy', text: 'Świetny temat! Spróbuj wygenerować post w formacie "A/B Test", aby sprawdzić dwa różne podejścia.' });
        }

        // Content Mix Analysis
        if (history && history.length > 3) {
            const recentTypes = history.slice(0, 5).map(h => h.formData?.generationType).filter(Boolean);
            const isHeavyOnImages = recentTypes.filter(t => t === GenerationType.PostWithImage).length >= 4;
            if (isHeavyOnImages) {
                newTips.push({ id: '6', category: 'Content Mix', text: 'Ostatnio dodawałeś głównie posty z obrazami. Może tym razem spróbujesz Video Story, aby urozmaicić feed?' });
            }
        }

        setTips(newTips);
    }, [result, lastFormData, history]);

    if (tips.length === 0) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-3xl p-6 shadow-sm animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-600 rounded-xl text-white">
                    <BulbIcon className="w-5 h-5" />
                </div>
                <h3 className="font-black text-sm uppercase tracking-wider text-indigo-900 dark:text-indigo-300">Asystent Strategii</h3>
            </div>
            
            <div className="space-y-4">
                {tips.map((tip) => (
                    <div key={tip.id} className="flex gap-4 group">
                        <div className="flex-shrink-0 mt-1">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 group-hover:scale-150 transition-transform"></div>
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500/70 block mb-1">{tip.category}</span>
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{tip.text}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-6 border-t border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400">Te wskazówki są generowane na bieżąco na podstawie Twojej treści i historii.</p>
                <div className="flex items-center gap-1 text-indigo-600">
                    <SparklesIcon className="w-3 h-3 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">AI Live</span>
                </div>
            </div>
        </div>
    );
};