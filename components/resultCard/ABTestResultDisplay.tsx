import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { GenerationResult, PostPerformanceData, FormData } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { useAppHandlers } from '../../hooks/useAppHandlers';
import { BeakerIcon } from '../icons/BeakerIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { TrophyIcon } from '../icons/TrophyIcon';
import { TrendingUpIcon } from '../icons/TrendingUpIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { HeartIcon } from '../icons/HeartIcon';
import { ChatBubbleIcon } from '../icons/ChatBubbleIcon';
import { ShareIcon } from '../icons/ShareIcon';
import { PostPreview } from '../PostPreview';
import { ModernButton } from '../ui/ModernButton';
import { ModernCard } from '../ui/ModernCard';

export const ABTestResultDisplay: React.FC<{ result: GenerationResult; onUpdateResult: (r: GenerationResult) => void, onOpenCreativeStudio: () => void }> = ({ result: initialResultData, onUpdateResult, onOpenCreativeStudio }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const notificationSystem = useNotifications();
    const appHandlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification);

    // Using local state to manage the result within this component for immediate feedback
    const [resultData, setResultData] = useState(initialResultData);

    useEffect(() => {
        setResultData(initialResultData);
    }, [initialResultData]);

    const handleSimulateResults = () => {
        const updatedVariants = resultData.variants?.map(variant => ({
            ...variant,
            performance: {
                reach: Math.floor(Math.random() * 8000) + 2000,
                likes: Math.floor(Math.random() * 800) + 100,
                comments: Math.floor(Math.random() * 150) + 20,
                shares: Math.floor(Math.random() * 80) + 10,
            },
        }));

        if (updatedVariants) {
            const newResult = { ...resultData, variants: updatedVariants };
            setResultData(newResult);
            onUpdateResult(newResult); // Propagate to global store
        }
    };

    const handleDeclareWinner = (winnerId: string) => {
        const newResult = { ...resultData, winnerVariantId: winnerId };
        setResultData(newResult);
        onUpdateResult(newResult); // Propagate to global store
    };

    const getPerformanceScore = (p?: PostPerformanceData) => !p ? 0 : p.reach * 0.1 + p.likes + p.comments * 2 + p.shares * 3;

    const scores = resultData.variants?.map(v => getPerformanceScore(v.performance)) ?? [0, 0];
    const hasPerformanceData = scores[0] > 0 || scores[1] > 0;
    const potentialWinnerId = hasPerformanceData && scores[0] !== scores[1] ? (scores[0] > scores[1] ? resultData.variants![0].id : resultData.variants![1].id) : null;

    return (
        <div className="space-y-10 animate-fade-in">
            <div className="relative p-10 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 overflow-hidden text-center">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <BeakerIcon className="w-32 h-32 text-purple-600" />
                </div>
                <div className="relative z-10 space-y-4">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-3 tracking-tight uppercase">
                        <BeakerIcon className="w-8 h-8 text-purple-500" />
                        Analiza Porównawcza A/B
                    </h3>
                    <p className="max-w-xl mx-auto text-slate-500 dark:text-slate-400 font-medium">Testujemy dwa warianty Twojej treści, aby sprawdzić, który z nich osiągnie najlepsze rezultaty u odbiorców.</p>
                    {!hasPerformanceData && (
                        <div className="pt-4">
                            <ModernButton onClick={handleSimulateResults} variant="gradient" icon={<SparklesIcon className="w-5 h-5" />}>
                                Symuluj wyniki organiczne
                            </ModernButton>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8 min-w-0">
                {resultData.variants?.map((variant, index) => {
                    const isWinner = resultData.winnerVariantId === variant.id;
                    const isPotentialWinner = !resultData.winnerVariantId && potentialWinnerId === variant.id;

                    return (
                        <ModernCard
                            key={variant.id}
                            className={`p-1 relative overflow-hidden transition-all duration-500 h-full flex flex-col min-w-0 ${isWinner ? 'ring-4 ring-amber-400 dark:ring-amber-500 shadow-2xl shadow-amber-500/20 scale-[1.02] z-10' : isPotentialWinner ? 'ring-2 ring-blue-500/50' : ''}`}
                        >
                            <div className="p-6 pb-2 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${index === 0 ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'}`}>
                                        {String.fromCharCode(65 + index)}
                                    </div>
                                    <span className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">Wariant {String.fromCharCode(65 + index)}</span>
                                </div>
                                {isWinner && (
                                    <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800/50 animate-bounce">
                                        <TrophyIcon className="w-4 h-4 text-amber-500" />
                                        <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">Zwycięzca</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 flex-grow min-w-0 overflow-hidden">
                                {variant.imageUrl && (
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <button
                                            onClick={onOpenCreativeStudio}
                                            className="p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 text-blue-600 hover:scale-110 transition-all flex items-center gap-2 font-bold text-xs"
                                        >
                                            <SparklesIcon className="w-4 h-4" />
                                            MAGIC DESIGN
                                        </button>
                                    </div>
                                )}
                                <PostPreview
                                    result={variant}
                                    formData={{ ...resultData.metadata, platform: resultData.platform } as unknown as FormData}
                                    onUpdateResult={() => { }}
                                    onAIAssistantAction={() => { }}
                                    isAssistantLoading={false}
                                />
                            </div>

                            {variant.performance && (
                                <div className="m-4 mt-0 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 group/stats">
                                    <div className="flex items-center justify-between mb-6">
                                        <h5 className="font-black text-[10px] uppercase tracking-widest text-slate-400">Prognozowana Wydajność</h5>
                                        <TrendingUpIcon className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        {[
                                            { icon: EyeIcon, label: 'Zasięg', value: variant.performance.reach, color: 'text-blue-500' },
                                            { icon: HeartIcon, label: 'Lubi to', value: variant.performance.likes, color: 'text-rose-500' },
                                            { icon: ChatBubbleIcon, label: 'Koment.', value: variant.performance.comments, color: 'text-emerald-500' },
                                            { icon: ShareIcon, label: 'Udostępn.', value: variant.performance.shares, color: 'text-orange-500' },
                                        ].map(({ icon: Icon, label, value, color }) => (
                                            <div key={label} className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                    <Icon className={`w-3 h-3 ${color}`} />
                                                    {label}
                                                </div>
                                                <div className="text-xl font-black text-slate-800 dark:text-slate-200">{value.toLocaleString('pl-PL')}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-8">
                                        <ModernButton
                                            onClick={() => handleDeclareWinner(variant.id)}
                                            variant={isWinner ? 'primary' : 'secondary'}
                                            size="sm"
                                            fullWidth
                                            disabled={isWinner}
                                            icon={<TrophyIcon className="w-4 h-4" />}
                                        >
                                            {isWinner ? 'Mój Wybór' : 'Ustaw jako zwycięzcę'}
                                        </ModernButton>
                                    </div>
                                </div>
                            )}
                        </ModernCard>
                    );
                })}
            </div>
        </div>
    );
};
