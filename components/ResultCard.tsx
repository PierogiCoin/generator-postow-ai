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
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import { EyeIcon } from './icons/EyeIcon';
import { HeartIcon } from './icons/HeartIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { ShareIcon } from './icons/ShareIcon';

import { useGenerationStore } from '../stores/generationStore';
import { useDataStore } from '../stores/dataStore';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { useAuth } from '../contexts/AuthContext';
// FIX: Add missing import for useNotifications hook.
import { useNotifications } from '../hooks/useNotifications';


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
        <div className="text-center py-10 text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center h-full">
            <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="font-semibold text-slate-600 dark:text-slate-400">{displayMessage}</p>
            {showProgressBar && (
                <div className="w-full max-w-xs bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-4">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500 ease-out" style={{width: `${progress}%`}}></div>
                </div>
            )}
        </div>
    );
};

const ReadyState: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="text-center py-10 text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center h-full">
            <SparklesIcon className="w-12 h-12 mb-4"/>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t('resultCard.ready.title')}</h3>
            <p className="text-sm mt-1">{t('resultCard.ready.subtitle')}</p>
        </div>
    );
};

const ABTestResultDisplay: React.FC<{
  resultData: GenerationResult;
  onUpdateResult: (newResult: GenerationResult) => void;
}> = ({ resultData: initialResultData, onUpdateResult }) => {
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
        <div className="space-y-6">
            <div className="text-center p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                    <BeakerIcon className="w-6 h-6 text-purple-500" />
                    Wyniki testu A/B
                </h3>
                {!hasPerformanceData && (
                    <button onClick={handleSimulateResults} className="mt-4 flex mx-auto items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-purple-600 rounded-md hover:bg-purple-500 transition">
                        <SparklesIcon className="w-4 h-4" />
                        Symuluj wyniki
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {resultData.variants?.map((variant, index) => {
                    const isWinner = resultData.winnerVariantId === variant.id;
                    const isPotentialWinner = !resultData.winnerVariantId && potentialWinnerId === variant.id;
                    const cardClasses = `border-2 p-4 rounded-xl transition-all duration-300 ${isWinner ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 shadow-lg' : isPotentialWinner ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`;

                    return (
                        <div key={variant.id} className={cardClasses}>
                            <h4 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex justify-between items-center">
                                <span>Wariant {String.fromCharCode(65 + index)}</span>
                                {isWinner && <TrophyIcon className="w-6 h-6 text-amber-500" />}
                            </h4>
                            <PostPreview result={variant} formData={{ ...resultData.metadata, platform: resultData.platform } as any} onUpdateResult={() => {}} onAIAssistantAction={() => {}} isAssistantLoading={false} />
                            
                            {variant.performance && (
                                <div className="mt-4 pt-4 border-t border-slate-300 dark:border-slate-600">
                                    <h5 className="font-semibold text-sm mb-3 text-slate-700 dark:text-slate-300">Symulowane wyniki:</h5>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        {[
                                            { icon: EyeIcon, label: 'Zasięg', value: variant.performance.reach },
                                            { icon: HeartIcon, label: 'Polubienia', value: variant.performance.likes },
                                            { icon: ChatBubbleIcon, label: 'Komentarze', value: variant.performance.comments },
                                            { icon: ShareIcon, label: 'Udostępnienia', value: variant.performance.shares },
                                        ].map(({icon: Icon, label, value}) => (
                                            <div key={label} className="flex items-center gap-2">
                                                <Icon className="w-4 h-4 text-slate-500"/>
                                                <span className="text-slate-600 dark:text-slate-400">{label}:</span>
                                                <span className="font-bold text-slate-800 dark:text-white">{value.toLocaleString('pl-PL')}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => handleDeclareWinner(variant.id)}
                                        disabled={isWinner}
                                        className={`w-full mt-6 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition ${isWinner ? 'bg-amber-500 text-white cursor-default' : 'bg-green-600 text-white hover:bg-green-500'}`}
                                    >
                                        <TrophyIcon className="w-4 h-4"/>
                                        {isWinner ? 'Zwycięzca' : 'Ogłoś zwycięzcą'}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ResultActions: React.FC<{ result: GenerationResult; formData: FormData; onCopy: () => void; isCopied: boolean }> = ({ result, formData, onCopy, isCopied }) => {
    const { user } = useAuth();
    const notificationSystem = useNotifications();
    const appHandlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification);
    const { isRepurposing, isPredictingPerformance, isRegenerating, isAnalyzingSEO } = useGenerationStore();
    const { favorites } = useDataStore();
    
    const isFavorite = favorites.some(fav => fav.result.id === result.id);

    return (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button onClick={onCopy} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isCopied ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                {isCopied ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
                {isCopied ? 'Skopiowano!' : 'Kopiuj tekst'}
            </button>
            <button onClick={() => appHandlers.handleAddToFavorites(result, formData)} disabled={isFavorite} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50">
                <StarIcon className={`w-4 h-4 ${isFavorite ? 'text-yellow-500' : ''}`} />
                {isFavorite ? 'Ulubiony' : 'Do ulubionych'}
            </button>
             <button onClick={() => appHandlers.handleOpenScheduleModal(result, formData)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600">
                <CalendarIcon className="w-4 h-4" />
                Zaplanuj
            </button>
             <button onClick={() => appHandlers.handleOpenRepurposeModal(result)} disabled={isRepurposing} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50">
                <LayersIcon className="w-4 h-4" />
                {isRepurposing ? 'Przetwarzanie...' : 'Przetwórz'}
            </button>
            <button onClick={() => appHandlers.handleOpenVideoStoryModal(result)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg">
                <FilmIcon className="w-4 h-4" />
                Video Story
            </button>
            <button onClick={appHandlers.handlePredictPerformance} disabled={isPredictingPerformance} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50">
                <TrendingUpIcon className="w-4 h-4" />
                {isPredictingPerformance ? 'Analizowanie...' : 'Prognozuj'}
            </button>
            <button onClick={appHandlers.handleAnalyzeSEO} disabled={isAnalyzingSEO} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50">
                <SearchIcon className="w-4 h-4" />
                {isAnalyzingSEO ? 'Analizowanie...' : 'Analiza SEO'}
            </button>
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
    isAssistantLoading
  } = useGenerationStore();

  const { inspiration } = useDataStore();
  const result = historyResult || storeResult;
  const formData = inspiration?.formData || lastFormData;

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

  if (isLoading) {
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
  
  const renderContent = () => {
    switch (result.type) {
        case GenerationType.ABTest:
            return <ABTestResultDisplay resultData={result} onUpdateResult={handleUpdateResult} />;
        case GenerationType.Idea:
            // Idea rendering logic here
            return <div>Idea results...</div>;
        case GenerationType.Campaign:
            // Campaign rendering logic here
            return <div>Campaign results...</div>;
        default:
            return (
                 <div className="space-y-6">
                    <PostPreview
                        result={result}
                        formData={formData}
                        onEditImage={() => setIsVisualStudioOpen(true)}
                        onUpdateResult={handleUpdateResult}
                        onAIAssistantAction={appHandlers.handleAIAssistantAction}
                        isAssistantLoading={isAssistantLoading}
                    />
                    {(sentimentAnalysis || isAnalyzingSentiment) && <SentimentDisplay result={sentimentAnalysis} isLoading={isAnalyzingSentiment} />}
                    {(seoAnalysis || isAnalyzingSEO) && <SEOAnalysisDisplay result={seoAnalysis} isLoading={isAnalyzingSEO} />}
                    {formData && <ResultActions result={result} formData={formData} onCopy={handleCopy} isCopied={isCopied} />}
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
    </div>
  );
};
