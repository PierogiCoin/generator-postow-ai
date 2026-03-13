import { CreativeCanvas } from './ui/CreativeCanvas';
import { StreamingText } from './ui/StreamingText';
import { suggestImageLayouts } from '../services/mediaService';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { useTranslation } from 'react-i18next';
import type { GenerationResult, IdeaResult, VideoScript, SentimentAnalysisResult, FormData, AppError, SEOAnalysisResult, UserPlan, User, AIAssistantAction, CampaignHistoryItem, FavoritePost, TeamMemberRole, PostApprovalStatus, PerformancePrediction, PredictionTip, PostPerformanceData } from '../types';
import { Tone, UserPlan as UserPlanEnum, GenerationType } from '../types';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { MusicNoteIcon } from './icons/MusicNoteIcon';
import { BulbIcon } from './icons/BulbIcon';
import { PostIcon } from './icons/PostIcon';
import { MegaphoneIcon } from './icons/MegaphoneIcon';
import { FilmIcon } from './icons/FilmIcon';
import { PostPreview } from './PostPreview';
import { ErrorDisplay } from './ErrorDisplay';
import { StarIcon } from './icons/StarIcon';
import { SentimentDisplay } from './SentimentDisplay';
import { SEOAnalysisDisplay } from './SEOAnalysisDisplay';
import { BeakerIcon } from './icons/BeakerIcon';
import { RefreshCwIcon } from './icons/RefreshCwIcon';
import { VisualStudioModal } from './VisualStudioModal';
import { SearchIcon } from './icons/SearchIcon';
import { InteractiveEditor } from './ai/InteractiveEditor';
import { LayersIcon } from './icons/LayersIcon';
import { Collaboration } from './Collaboration';
import { CheckIcon } from './icons/CheckIcon';
import { SpeakerWaveIcon } from './icons/SpeakerWaveIcon';
import { StopCircleIcon } from './icons/StopCircleIcon';
import { CameraIcon } from './icons/CameraIcon';
import { ClockIcon } from './icons/ClockIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import { EyeIcon } from './icons/EyeIcon';
import { HeartIcon } from './icons/HeartIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { ShareIcon } from './icons/ShareIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { RocketLaunchIcon } from './icons/RocketLaunchIcon';
import { PhoneMockup } from './PhoneMockup';
import { Smartphone } from 'lucide-react';

import { useGenerationStore } from '../stores/generationStore';
import { useDataStore } from '../stores/dataStore';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { useAuth } from '../contexts/AuthContext';
// FIX: Add missing import for useNotifications hook.
import { useNotifications } from '../hooks/useNotifications';
import { Spinner, ProgressBar, SkeletonCard } from './ui/LoadingStates';
import { ModernButton } from './ui/ModernButton';
import { ModernInput } from './ui/ModernInput';
import { ModernCard } from './ui/ModernCard';


interface ResultCardProps {
    historyResult?: GenerationResult | null;
}

const VIDEO_GENERATION_STEPS = [
    "Tworzenie scenariusza wideo...",
    "Inicjowanie generowania wideo...",
    "Analizowanie monitu...",
    "Alokowanie zasobów GPU...",
    "Rozpoczynanie procesu renderowania...",
    "Generowanie klatek początkowych...",
    "Komponowanie sceny...",
    "Stosowanie stylu wizualnego...",
    "Renderowanie klatek pośrednich...",
    "Dodawanie szczegółów i tekstur...",
    "Finalizowanie sekwencji wideo...",
    "Prawie gotowe, przeprowadzanie ostatecznych sprawdzeń...",
    "Wideo wygenerowane pomyślnie!",
];

const STANDARD_GENERATION_STEP_KEYS = [
    'progress.streaming_text',
    'progress.generating_details',
    'progress.analyzing_content',
    'progress.finalizing'
];

const LoadingState: React.FC<{ progressMessage: string | null }> = ({ progressMessage }) => {
    const { t } = useTranslation();

    let progress = 0;
    let displayMessage = progressMessage;
    let showProgressBar = false;

    const isVideoGeneration = progressMessage && VIDEO_GENERATION_STEPS.includes(progressMessage);
    const isStandardGeneration = progressMessage && STANDARD_GENERATION_STEP_KEYS.includes(progressMessage);

    if (isVideoGeneration) {
        const stepIndex = VIDEO_GENERATION_STEPS.indexOf(progressMessage);
        progress = Math.round(((stepIndex + 1) / VIDEO_GENERATION_STEPS.length) * 100);
        showProgressBar = true;
    } else if (isStandardGeneration) {
        const stepIndex = STANDARD_GENERATION_STEP_KEYS.indexOf(progressMessage);
        progress = Math.round(((stepIndex + 1) / STANDARD_GENERATION_STEP_KEYS.length) * 100);
        displayMessage = t(progressMessage); // Przetłumacz klucz
        showProgressBar = true;
    } else if (!progressMessage) {
        displayMessage = t('resultCard.pleaseWait');
    }

    return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-full space-y-8 animate-fade-in">
            <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                <Spinner size="lg" className="relative z-10" />
                <SparklesIcon className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-bounce" />
            </div>

            <div className="space-y-4 max-w-sm relative z-10">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{displayMessage}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">To może potrwać do kilkunastu sekund. Nasza AI właśnie tworzy dla Ciebie unikalną treść.</p>

                {showProgressBar && (
                    <ProgressBar
                        progress={progress}
                        className="mt-6"
                        showPercentage={true}
                    />
                )}
            </div>
        </div>
    );
};

const ReadyState: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-full space-y-6 animate-fade-in">
            <div className="w-20 h-20 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 rounded-3xl flex items-center justify-center relative">
                <SparklesIcon className="w-10 h-10 text-blue-500 animate-pulse" />
                <div className="absolute -inset-2 bg-gradient-to-tr from-purple-500/10 to-blue-500/10 blur-xl rounded-full" />
            </div>
            <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{t('resultCard.ready.title')}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xs">{t('resultCard.ready.subtitle')}</p>
            </div>
        </div>
    );
};

const PerformancePredictionDisplay: React.FC<{ result: PerformancePrediction | null; isLoading: boolean }> = ({ result, isLoading }) => {
    const { t } = useTranslation();
    const { isPredictingPerformance } = useGenerationStore();

    if (isLoading || isPredictingPerformance) return <SkeletonCard />;
    if (!result) return null;

    const metrics = [
        { label: 'Zasięg (Reach)', value: result.reach.score, text: result.reach.label, color: 'from-blue-400 to-indigo-600' },
        { label: 'Zaangażowanie', value: result.engagement.score, text: result.engagement.label, color: 'from-pink-400 to-rose-600' },
        { label: 'Viralowość', value: result.virality.score, text: result.virality.label, color: 'from-amber-400 to-orange-600' }
    ];

    return (
        <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/10 p-8 space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                        <TrendingUpIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Prognoza Wyników AI</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest">Analiza prawdopodobieństwa sukcesu</p>
                    </div>
                </div>
                <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest">
                    Alpha v0.1
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {metrics.map((m, i) => (
                    <div key={i} className="relative group">
                        <div className="flex justify-between items-end mb-3">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{m.label}</span>
                            <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{m.value}%</span>
                        </div>
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-1 shadow-inner">
                            <div
                                className={`h-full rounded-full bg-gradient-to-r ${m.color} transition-all duration-1000 ease-out shadow-lg`}
                                style={{ width: `${m.value}%` }}
                            />
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${m.color}`} />
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{m.text}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-4">
                    <h5 className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                        <SparklesIcon className="w-4 h-4 text-amber-500" />
                        Wskazówki Optymalizacyjne
                    </h5>
                    <div className="space-y-3">
                        {result.tips.map((tip, idx) => (
                            <div key={idx} className="flex gap-4 p-4 bg-white/50 dark:bg-slate-800/30 rounded-2xl border border-white/10">
                                <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase self-start ${tip.impact === 'High' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {tip.impact}
                                </span>
                                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{tip.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <h5 className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest">
                        <BulbIcon className="w-4 h-4 text-blue-500" />
                        Głębokie Insights
                    </h5>
                    <div className="space-y-3">
                        {result.insights.map((ins, idx) => (
                            <div key={idx} className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/30 dark:border-blue-800/20">
                                <p className="text-xs text-blue-800 dark:text-blue-300 font-medium flex gap-3">
                                    <span className="text-blue-500">•</span>
                                    {ins.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ABTestResultDisplay: React.FC<{ result: GenerationResult; onUpdateResult: (r: GenerationResult) => void, onOpenCreativeStudio: () => void }> = ({ result: initialResultData, onUpdateResult, onOpenCreativeStudio }) => {
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

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {resultData.variants?.map((variant, index) => {
                    const isWinner = resultData.winnerVariantId === variant.id;
                    const isPotentialWinner = !resultData.winnerVariantId && potentialWinnerId === variant.id;

                    return (
                        <ModernCard
                            key={variant.id}
                            className={`p-1 relative overflow-hidden transition-all duration-500 h-full flex flex-col ${isWinner ? 'ring-4 ring-amber-400 dark:ring-amber-500 shadow-2xl shadow-amber-500/20 scale-105 z-10' : isPotentialWinner ? 'ring-2 ring-blue-500/50' : ''}`}
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

                            <div className="p-4 flex-grow">
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
                                    formData={{ ...resultData.metadata, platform: resultData.platform } as any}
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

const ResultActions: React.FC<{
    result: GenerationResult;
    formData: FormData;
    onCopy: () => void;
    isCopied: boolean;
    onOpenCreativeStudio: () => void;
}> = ({ result, formData, onCopy, isCopied, onOpenCreativeStudio }) => {
    const { user } = useAuth();
    const notificationSystem = useNotifications();
    const appHandlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification);
    const { isRepurposing, isPredictingPerformance, isRegenerating, isAnalyzingSEO } = useGenerationStore();
    const { favorites } = useDataStore();

    const isFavorite = favorites.some(fav => fav.result.id === result.id);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pt-8 border-t border-slate-200 dark:border-slate-800">
            <ModernButton
                onClick={onCopy}
                variant="secondary"
                size="sm"
                fullWidth
                icon={isCopied ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
            >
                {isCopied ? 'Skopiowano!' : 'Kopiuj tekst'}
            </ModernButton>

            <ModernButton
                onClick={() => appHandlers.handleAddToFavorites(result, formData)}
                variant="secondary"
                size="sm"
                disabled={isFavorite}
                fullWidth
                icon={<StarIcon className={`w-4 h-4 ${isFavorite ? 'text-yellow-500' : ''}`} />}
            >
                {isFavorite ? 'Ulubiony' : 'Ulubione'}
            </ModernButton>

            <ModernButton
                onClick={() => appHandlers.handleOpenScheduleModal(result, formData)}
                variant="secondary"
                size="sm"
                fullWidth
                icon={<CalendarIcon className="w-4 h-4" />}
            >
                Zaplanuj
            </ModernButton>

            <ModernButton
                onClick={() => appHandlers.handleOpenRepurposeModal(result)}
                variant="secondary"
                size="sm"
                disabled={isRepurposing}
                fullWidth
                loading={isRepurposing}
                icon={<LayersIcon className="w-4 h-4" />}
            >
                Przetwórz
            </ModernButton>

            <ModernButton
                onClick={() => appHandlers.handleOpenVideoStoryModal(result)}
                variant="gradient"
                size="sm"
                fullWidth
                icon={<FilmIcon className="w-4 h-4" />}
            >
                Video Story
            </ModernButton>

            <ModernButton
                onClick={appHandlers.handlePredictPerformance}
                variant="secondary"
                size="sm"
                disabled={isPredictingPerformance}
                fullWidth
                loading={isPredictingPerformance}
                icon={<TrendingUpIcon className="w-4 h-4" />}
            >
                Prognozuj
            </ModernButton>

            <ModernButton
                onClick={appHandlers.handleAnalyzeSEO}
                variant="secondary"
                size="sm"
                disabled={isAnalyzingSEO}
                fullWidth
                loading={isAnalyzingSEO}
                icon={<SearchIcon className="w-4 h-4" />}
            >
                SEO
            </ModernButton>

            <ModernButton
                onClick={() => appHandlers.handlePublishNow(result, formData.platform)}
                variant="primary"
                size="sm"
                fullWidth
                icon={<RocketLaunchIcon className="w-4 h-4" />}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
            >
                Publikuj
            </ModernButton>

            {result.imageUrl && (
                <ModernButton
                    onClick={onOpenCreativeStudio}
                    variant="gradient"
                    size="sm"
                    fullWidth
                    icon={<SparklesIcon className="w-4 h-4" />}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                >
                    Magic Design
                </ModernButton>
            )}
        </div>
    );
};


export const ResultCard: React.FC<ResultCardProps> = ({ historyResult }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const notificationSystem = useNotifications();
    const appHandlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification);
    const [isCopied, setIsCopied] = useState(false);
    const [isVisualStudioOpen, setIsVisualStudioOpen] = useState(false);
    const [previewMode, setPreviewMode] = useState<'standard' | 'mobile'>('standard');

    const {
        result: storeResult,
        isLoading,
        error,
        generationProgress,
        lastFormData,
        sentimentAnalysis,
        isAnalyzingSentiment,
        seoAnalysis,
        isAnalyzingSEO,
        performancePrediction,
        isPredictingPerformance,
        isAssistantLoading,
        isRegenerating,
        hookVariations,
        isSuggestingHooks
    } = useGenerationStore();

    const [isCreativeStudioOpen, setIsCreativeStudioOpen] = useState(false);
    const [suggestedLayouts, setSuggestedLayouts] = useState<any[]>([]);

    const handleOpenCreativeStudio = async () => {
        if (!user || !result?.postText) return;
        setIsCreativeStudioOpen(true);
        try {
            const data = await suggestImageLayouts(result.postText, user.id);
            if (data?.layouts) setSuggestedLayouts(data.layouts);
        } catch (e) {
            console.error("Failed to fetch layouts:", e);
        }
    };

    const { inspiration, activeBrandVoiceId, brandVoiceProfiles } = useDataStore();
    const result = historyResult || storeResult;
    const formData = inspiration?.formData || lastFormData;

    const activeProfile = brandVoiceProfiles.find(p => p.id === activeBrandVoiceId);

    const handleCopy = () => {
        if (result) {
            let textToCopy = result.postText;
            if (result.hashtags.length > 0) {
                textToCopy += `\n\n${result.hashtags.join(' ')}`;
            }
            navigator.clipboard.writeText(textToCopy);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const handleApplyImageEdit = (newImageUrl: string) => {
        if (result) {
            appHandlers.handleSetResult({ ...result, imageUrl: newImageUrl });
        }
        setIsVisualStudioOpen(false);
    };

    const handleUpdateResult = (updatedResult: GenerationResult) => {
        appHandlers.handleSetResult(updatedResult);
    }

    // --- Render logic ---

    if (isLoading && !result) {
        return (
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-2xl p-6 min-h-[400px] flex items-center justify-center">
                <LoadingState progressMessage={generationProgress} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-2xl p-6">
                <ErrorDisplay error={error} onRetry={appHandlers.handleRetry} />
            </div>
        );
    }

    if (!result) {
        return (
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-2xl p-6 min-h-[400px] flex items-center justify-center">
                <ReadyState />
            </div>
        );
    }

    if (result.type === GenerationType.Omnichannel && result.omnichannelPosts) {
        return (
            <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200/80 dark:border-slate-700/80 rounded-[2.5rem] shadow-2xl p-8 space-y-8 animate-fade-in-up">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                            <GlobeIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Kampania Omnichannel</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{result.omnichannelPosts.length} postów wygenerowanych symultanicznie</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setPreviewMode(prev => prev === 'standard' ? 'mobile' : 'standard')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${previewMode === 'mobile' ? 'bg-blue-500 text-white border-blue-400' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}
                    >
                        <Smartphone className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">{previewMode === 'mobile' ? 'Widok Karty' : 'Podgląd Mobile'}</span>
                    </button>
                </div>

                <div className="grid gap-6">
                    {result.omnichannelPosts.map((post, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 hover:border-blue-400/30 transition-all group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                        {post.platform}
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${post.postText}\n\n${post.hashtags.join(' ')}`);
                                        notificationSystem.addToast(`${post.platform}: Skopiowano!`, 'success');
                                    }}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-blue-500"
                                >
                                    <ClipboardIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <StreamingText
                                text={post.postText}
                                className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-4 whitespace-pre-wrap"
                                active={isLoading}
                                speed={idx * 5 + 20} // Slightly different speeds for variety
                            />
                            <div className="flex flex-wrap gap-2 text-blue-500 dark:text-blue-400 text-xs font-bold">
                                {post.hashtags.map(h => <span key={h} className="animate-blur-in">{h}</span>)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const renderContent = () => {
        if (result.type === GenerationType.ABTest) {
            return (
                <ABTestResultDisplay
                    result={result}
                    onUpdateResult={handleUpdateResult}
                    onOpenCreativeStudio={handleOpenCreativeStudio}
                />
            );
        }

        switch (result.type) {
            case GenerationType.Idea:
                // Idea rendering logic here
                return <div>Idea results...</div>;
            case GenerationType.Campaign:
                // Campaign rendering logic here
                return <div>Campaign results...</div>;
            default:
                return (
                    <div className="space-y-6">
                        <div className="flex justify-end mb-2">
                            <button
                                onClick={() => setPreviewMode(prev => prev === 'standard' ? 'mobile' : 'standard')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${previewMode === 'mobile' ? 'bg-blue-500 text-white border-blue-400' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}
                            >
                                <Smartphone className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-widest">{previewMode === 'mobile' ? 'Widok Karty' : 'Podgląd Mobile'}</span>
                            </button>
                        </div>

                        {previewMode === 'mobile' ? (
                            <PhoneMockup result={result} formData={formData} />
                        ) : (
                            <PostPreview
                                result={result}
                                formData={formData}
                                onEditImage={() => setIsVisualStudioOpen(true)}
                                onUpdateResult={handleUpdateResult}
                                onAIAssistantAction={appHandlers.handleAIAssistantAction}
                                isAssistantLoading={isAssistantLoading}
                                streaming={isLoading || isRegenerating}
                            />
                        )}

                        {(performancePrediction || isPredictingPerformance) && <PerformancePredictionDisplay result={performancePrediction} isLoading={isPredictingPerformance} />}
                        
                        {/* Visual Strategy & Time Recommendation */}
                        {result && !isLoading && (result.visualStrategyTips || result.suggestedPostingTime) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
                                {result.visualStrategyTips && (
                                    <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-3xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <CameraIcon className="w-4 h-4 text-indigo-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Koncepcja Wizualna</span>
                                        </div>
                                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{result.visualStrategyTips}</p>
                                    </div>
                                )}
                                {result.suggestedPostingTime && (
                                    <div className="p-5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-3xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <ClockIcon className="w-4 h-4 text-amber-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Optymalny Czas</span>
                                        </div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white mb-1">Dziś o {result.suggestedPostingTime}</p>
                                        <p className="text-[10px] text-slate-500 font-medium italic">Sugerowana godzina na podstawie peaku aktywności Twojej grupy docelowej.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {(sentimentAnalysis || isAnalyzingSentiment) && <SentimentDisplay result={sentimentAnalysis} isLoading={isAnalyzingSentiment} />}
                        {(seoAnalysis || isAnalyzingSEO) && <SEOAnalysisDisplay result={seoAnalysis} isLoading={isAnalyzingSEO} />}
                        
                        {/* Hook Variations Section */}
                        {result && !isLoading && !result.omnichannelPosts && (
                            <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4 animate-fade-in-up">
                                <div className="flex items-center justify-between">
                                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                        <RocketLaunchIcon className="w-3 h-3 text-amber-500" />
                                        Warianty Nagłówka (Hooks)
                                    </h5>
                                    {hookVariations.length === 0 && !isSuggestingHooks && (
                                        <button 
                                            onClick={appHandlers.handleSuggestHooks}
                                            className="text-[10px] font-black uppercase text-blue-600 hover:underline"
                                        >
                                            Generuj alternatywy
                                        </button>
                                    )}
                                </div>
                                
                                {isSuggestingHooks && (
                                    <div className="flex gap-2 items-center py-2">
                                        <Spinner size="sm" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase animate-pulse">Wstukiwanie haczyków...</span>
                                    </div>
                                )}

                                {hookVariations.length > 0 && (
                                    <div className="grid grid-cols-1 gap-2">
                                        {hookVariations.map((hook, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => appHandlers.handleApplyHook(hook)}
                                                className="text-left p-3 text-xs bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group relative pr-10"
                                            >
                                                <span className="line-clamp-2">{hook}</span>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <CheckIcon className="w-4 h-4 text-green-500" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {formData && (
                            <ResultActions
                                result={result}
                                formData={formData}
                                onCopy={handleCopy}
                                isCopied={isCopied}
                                onOpenCreativeStudio={handleOpenCreativeStudio}
                            />
                        )}
                    </div>
                );
        }
    };


    return (
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-slate-200/80 dark:border-slate-700/80 rounded-2xl shadow-2xl p-6">
            {renderContent()}

            {user && result.imageUrl && (
                <VisualStudioModal
                    isOpen={isVisualStudioOpen}
                    onClose={() => setIsVisualStudioOpen(false)}
                    onApply={handleApplyImageEdit}
                    originalImageUrl={result.imageUrl}
                    user={user}
                />
            )}
            {isCreativeStudioOpen && result?.imageUrl && (
                <CreativeCanvas
                    imageUrl={result.imageUrl}
                    initialText={suggestedLayouts[0]?.text || result.postText.substring(0, 30)}
                    logoUrl={activeProfile?.settings?.logoUrl}
                    mascotUrl={activeProfile?.settings?.mascotUrl}
                    onClose={() => setIsCreativeStudioOpen(false)}
                />
            )}
        </div>
    );
};
