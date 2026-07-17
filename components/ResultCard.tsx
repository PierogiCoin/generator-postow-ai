import { CreativeCanvas } from './ui/CreativeCanvas';
import { StreamingText } from './ui/StreamingText';
import { suggestImageLayouts } from '../services/mediaService';
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { formatPublishCaption, resolveCtaUrl } from '../utils/publishCaption';
import { useTranslation } from 'react-i18next';
import type { GenerationResult, IdeaResult, VideoScript, SentimentAnalysisResult, FormData, AppError, SEOAnalysisResult, UserPlan, User, AIAssistantAction, CampaignHistoryItem, FavoritePost, TeamMemberRole, PostApprovalStatus, PerformancePrediction, PredictionTip, PostPerformanceData } from '../types';
import { Tone, UserPlan as UserPlanEnum, GenerationType, NotificationType } from '../types';
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
import { MultiVariantResult } from './MultiVariantResult';
import { MultiVariantPost } from '../types';
import { HashtagGenerator } from './HashtagGenerator';
import { HashIcon } from './icons/HashIcon';
import { XMarkIcon } from './icons/XMarkIcon';
// FIX: Add missing import for useNotifications hook.
import { useNotifications } from '../hooks/useNotifications';
import { Spinner, ProgressBar, SkeletonCard } from './ui/LoadingStates';
import { ModernButton } from './ui/ModernButton';
import { ModernInput } from './ui/ModernInput';
import { ModernCard } from './ui/ModernCard';
import { ResultCardLoadingState, ResultCardReadyState } from './resultCard/ResultCardStates';
import { PerformancePredictionDisplay } from './resultCard/PerformancePredictionDisplay';
import { ABTestResultDisplay } from './resultCard/ABTestResultDisplay';
import { ResultPrimaryActions } from './resultCard/ResultPrimaryActions';
import { ResultCardTabBar, type ResultCardTab } from './resultCard/ResultCardTabBar';
import { QualityGatePanel } from './resultCard/QualityGatePanel';
import { ResultMediaPanel } from './resultCard/ResultMediaPanel';
import { ContentRepurposingPanel } from './ContentRepurposingPanel';
import { VisualStudioModal } from './VisualStudioModal';
import { socialConnectionsService } from '../services/socialConnectionsService';
import type { SocialConnection } from '../types/socialPublishing';
import { MobilePreview } from './MobilePreview';

interface ResultCardProps {
    historyResult?: GenerationResult | null;
}

export const ResultCard: React.FC<ResultCardProps> = ({ historyResult }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const notificationSystem = useNotifications();
    const appHandlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification);
    const [isCopied, setIsCopied] = useState(false);
    const [isHashtagGeneratorOpen, setIsHashtagGeneratorOpen] = useState(false);
    const [previewMode, setPreviewMode] = useState<'standard' | 'mobile'>('standard');
    const [activeTab, setActiveTab] = useState<ResultCardTab>('content');

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
        isSuggestingHooks,
        isRegeneratingImage,
    } = useGenerationStore();

    const [isCreativeStudioOpen, setIsCreativeStudioOpen] = useState(false);
    const [isVisualStudioOpen, setIsVisualStudioOpen] = useState(false);
    interface SuggestedLayout {
  text: string;
  position?: string;
  style?: string;
}

const [suggestedLayouts, setSuggestedLayouts] = useState<SuggestedLayout[]>([]);

    const handleOpenCreativeStudio = async () => {
        if (!user || !result?.postText) return;
        setIsCreativeStudioOpen(true);
        try {
            const data = await suggestImageLayouts(result.postText, user.id);
            if (data?.layouts) setSuggestedLayouts(data.layouts);
        } catch (e: any) {
            notificationSystem.addToast(e.message || 'Błąd pobierania layoutów', NotificationType.Error);
        }
    };

    const { inspiration, activeBrandVoiceId, brandVoiceProfiles } = useDataStore();
    const result = historyResult || storeResult;
    const formData = inspiration?.formData || lastFormData;

    useEffect(() => {
        if (result?.id) setActiveTab('content');
    }, [result?.id]);

    const [connections, setConnections] = useState<SocialConnection[]>([]);
    const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
    const [isLoadingConnections, setIsLoadingConnections] = useState(false);
    const [publishPreviewType, setPublishPreviewType] = useState<'text' | 'social'>('text');

    const loadConnections = useCallback(async () => {
        if (!user) return;
        setIsLoadingConnections(true);
        try {
            const data = await socialConnectionsService.getConnections(user.id);
            setConnections(data);
            if (formData?.platform) {
                const matched = data.filter(
                    c => c.platform.toLowerCase() === formData.platform.toLowerCase() && c.isActive
                );
                if (matched.length > 0) {
                    setSelectedConnectionId(matched[0].id);
                }
            }
        } catch (error) {
            // silent fail
        } finally {
            setIsLoadingConnections(false);
        }
    }, [user, formData?.platform]);

    useEffect(() => {
        if (activeTab === 'publish' && user) {
            loadConnections();
        }
    }, [activeTab, user, loadConnections]);

    const handleConnectSocial = async (platform: string) => {
        try {
            if (!user) throw new Error('Zaloguj się, aby połączyć konto');
            const authUrl = await socialConnectionsService.getAuthUrl(platform as any, user.id);
            window.location.href = authUrl;
        } catch (error: any) {
            notificationSystem.addToast(error.message || 'Błąd połączenia', NotificationType.Error);
        }
    };

    const activeProfile = brandVoiceProfiles.find(p => p.id === activeBrandVoiceId);

    const publishCaptionPreview = useMemo(() => {
        if (!result) return '';
        const ctaUrl = resolveCtaUrl(result.ctaUrl, activeProfile?.settings?.websiteUrl);
        return formatPublishCaption({
            postText: result.postText,
            hashtags: result.hashtags,
            callToAction: result.callToAction,
            ctaUrl,
        });
    }, [result, activeProfile?.settings?.websiteUrl]);

    const resolvedCtaUrl = useMemo(
        () => resolveCtaUrl(result?.ctaUrl, activeProfile?.settings?.websiteUrl),
        [result?.ctaUrl, activeProfile?.settings?.websiteUrl]
    );

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
        void appHandlers.handleApplyImageEdit(newImageUrl);
    };

    const handleUpdateResult = (updatedResult: GenerationResult) => {
        appHandlers.handleSetResult(updatedResult);
    }

    // --- Render logic ---

    if (isLoading && !result) {
        return (
            <div className="glass-premium border border-white/10 rounded-[2.5rem] shadow-2xl p-6 min-h-[400px] flex items-center justify-center">
                <ResultCardLoadingState progressMessage={generationProgress} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-premium border border-white/10 rounded-[2.5rem] shadow-2xl p-6">
                <ErrorDisplay error={error} onRetry={appHandlers.handleRetry} />
            </div>
        );
    }

    if (!result) {
        return (
            <div className="glass-premium border border-white/10 rounded-[2.5rem] shadow-2xl p-6 min-h-[400px] flex items-center justify-center">
                <ResultCardReadyState />
            </div>
        );
    }

    if (result.type === GenerationType.Omnichannel && result.omnichannelPosts) {
        return (
            <div className="glass-premium border border-white/10 rounded-[2.5rem] shadow-2xl p-8 space-y-8 animate-fade-in-up">
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
                                        notificationSystem.addToast(`${post.platform}: Skopiowano!`, NotificationType.Success);
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

    // Multi-Variant (A/B/C) Results
    if (result.multiVariantPosts && result.multiVariantPosts.length > 0) {
        return (
            <div className="glass-premium border border-white/10 rounded-[2.5rem] shadow-2xl p-8 space-y-8 animate-fade-in-up">
                <MultiVariantResult
                    variants={result.multiVariantPosts}
                    onSelectVariant={(variant: MultiVariantPost) => {
                        // Convert selected variant to a standard result
                        const selectedResult: GenerationResult = {
                            ...result,
                            postText: variant.postText,
                            hashtags: variant.hashtags,
                            multiVariantPosts: undefined, // Clear multi-variant data
                            metadata: {
                                ...result.metadata,
                                hookType: variant.hookType,
                            }
                        };
                        handleUpdateResult(selectedResult);
                        notificationSystem.addToast(`Wybrano wariant ${variant.variant} (${variant.hookType})`, NotificationType.Success);
                    }}
                />
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
                    <div className="space-y-2">
                        {formData && (
                            <ResultPrimaryActions
                                result={result}
                                formData={formData}
                                onCopy={handleCopy}
                                isCopied={isCopied}
                                onOpenCreativeStudio={handleOpenCreativeStudio}
                            />
                        )}

                        {formData && result.postText?.trim() && (
                            <QualityGatePanel
                                postText={result.postText}
                                platform={formData.platform}
                                userId={user?.id}
                                hashtags={result.hashtags}
                                audience={formData.audience}
                                isBusy={isLoading || isRegenerating}
                                onAutoFix={async (prompt) => {
                                    await appHandlers.handleRegenerateWithFeedback(prompt);
                                    notificationSystem.addToast(
                                        t('resultCard.qualityGate.fixed', 'Post został poprawiony'),
                                        NotificationType.Success
                                    );
                                }}
                            />
                        )}

                        <ResultCardTabBar active={activeTab} onChange={setActiveTab} />

                        {activeTab === 'content' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewMode((prev) => (prev === 'standard' ? 'mobile' : 'standard'))}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${previewMode === 'mobile' ? 'bg-blue-500 text-white border-blue-400' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}
                                    >
                                        <Smartphone className="w-5 h-5" />
                                        <span className="text-xs font-bold uppercase tracking-widest">
                                            {previewMode === 'mobile' ? t('resultCard.preview.card', 'Widok karty') : t('resultCard.preview.mobile', 'Podgląd mobile')}
                                        </span>
                                    </button>
                                </div>

                                {previewMode === 'mobile' ? (
                                    <PhoneMockup result={result} formData={formData} />
                                ) : (
                                    <PostPreview
                                        result={result}
                                        formData={formData}
                                        onEditImage={() => {
                                            setActiveTab('media');
                                            if (result.imageUrl) {
                                                setIsVisualStudioOpen(true);
                                            } else {
                                                void handleOpenCreativeStudio();
                                            }
                                        }}
                                        onUpdateResult={handleUpdateResult}
                                        onAIAssistantAction={appHandlers.handleAIAssistantAction}
                                        isAssistantLoading={isAssistantLoading}
                                        streaming={isLoading || isRegenerating}
                                    />
                                )}

                                {!isLoading && !result.omnichannelPosts && (
                                    <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                                <RocketLaunchIcon className="w-3 h-3 text-amber-500" />
                                                {t('resultCard.hooks.title', 'Warianty nagłówka (Hooks)')}
                                            </h5>
                                            {hookVariations.length === 0 && !isSuggestingHooks && (
                                                <button
                                                    type="button"
                                                    onClick={appHandlers.handleSuggestHooks}
                                                    className="text-[10px] font-black uppercase text-blue-600 hover:underline"
                                                >
                                                    {t('resultCard.hooks.generate', 'Generuj alternatywy')}
                                                </button>
                                            )}
                                            {hookVariations.length > 0 && !isSuggestingHooks && (
                                                <button
                                                    type="button"
                                                    onClick={appHandlers.handleSuggestHooks}
                                                    className="text-[10px] font-black uppercase text-slate-500 hover:text-blue-600"
                                                >
                                                    {t('resultCard.hooks.refresh', 'Nowe hooki')}
                                                </button>
                                            )}
                                        </div>

                                        {isSuggestingHooks && (
                                            <div className="flex gap-2 items-center py-2">
                                                <Spinner size="sm" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase animate-pulse">
                                                    {t('resultCard.hooks.loading', 'Generowanie haczyków…')}
                                                </span>
                                            </div>
                                        )}

                                        {hookVariations.length > 0 && (
                                            <div className="grid grid-cols-1 gap-2">
                                                {hookVariations.map((hook, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex flex-col sm:flex-row gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl"
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => appHandlers.handleApplyHook(hook)}
                                                            className="flex-1 text-left text-xs hover:text-blue-600 transition-colors"
                                                        >
                                                            <span className="line-clamp-2">{hook}</span>
                                                            <span className="text-[9px] font-black uppercase text-slate-400 mt-1 block">
                                                                {t('resultCard.hooks.applyText', 'Tylko tekst')}
                                                            </span>
                                                        </button>
                                                        {result.imageUrl && formData && (
                                                            <button
                                                                type="button"
                                                                onClick={() => void appHandlers.handleApplyHookWithNewImage(hook)}
                                                                disabled={isRegeneratingImage}
                                                                className="shrink-0 px-3 py-2 text-[10px] font-black uppercase rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                                            >
                                                                {t('resultCard.hooks.applyWithImage', 'Hook + grafika')}
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'media' && (
                            <ResultMediaPanel
                                result={result}
                                isRegeneratingImage={isRegeneratingImage}
                                onRegenerateImage={(prompt) => void appHandlers.handleRegenerateImage(prompt)}
                                onOpenAiStudio={() => setIsVisualStudioOpen(true)}
                                onOpenCreativeStudio={() => void handleOpenCreativeStudio()}
                                onReformatForPlatform={(p) => void appHandlers.handleReformatImageForPlatform(p)}
                            />
                        )}

                        {activeTab === 'repurpose' && formData && (
                            <div className="animate-fade-in">
                                <ContentRepurposingPanel
                                    sourceContent={result.postText}
                                    tone={formData.tone}
                                    currentPlatform={result.platform}
                                    initialVideoUrl={result.videoUrl ?? undefined}
                                />
                            </div>
                        )}

                        {activeTab === 'publish' && (
                            <div className="space-y-6 animate-fade-in">
                                {(result.callToAction || resolvedCtaUrl) && (
                                    <div className="p-5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-3xl space-y-3">
                                        <div className="flex items-center gap-2">
                                            <RocketLaunchIcon className="w-4 h-4 text-blue-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                                                {t('resultCard.publish.ctaPreview', 'CTA i link')}
                                            </span>
                                        </div>
                                        {result.callToAction && (
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{result.callToAction}</p>
                                        )}
                                        {resolvedCtaUrl && (
                                            <a
                                                href={resolvedCtaUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 break-all hover:underline"
                                            >
                                                {resolvedCtaUrl}
                                            </a>
                                        )}
                                        <p className="text-[10px] text-slate-500 font-medium">
                                            {t('resultCard.publish.ctaHint', 'Link zostanie dołączony do opisu na Facebooku i innych platformach.')}
                                        </p>
                                    </div>
                                )}

                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            {t('resultCard.publish.captionPreview', 'Podgląd publikacji')}
                                        </p>
                                        <div className="flex bg-slate-200 dark:bg-slate-850 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700">
                                            <button
                                                type="button"
                                                onClick={() => setPublishPreviewType('text')}
                                                className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md transition-all ${
                                                    publishPreviewType === 'text'
                                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                Tekst
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPublishPreviewType('social')}
                                                className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md transition-all ${
                                                    publishPreviewType === 'social'
                                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                                }`}
                                            >
                                                Social Feed
                                            </button>
                                        </div>
                                    </div>
                                    {publishPreviewType === 'text' ? (
                                        <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                            {publishCaptionPreview}
                                        </p>
                                    ) : (
                                        <div className="pt-2">
                                            <MobilePreview
                                                content={result.postText}
                                                hashtags={result.hashtags}
                                                platform={(formData?.platform?.toLowerCase() || 'linkedin') as any}
                                            />
                                        </div>
                                    )}
                                </div>

                                {result.suggestedPostingTime && (
                                    <div className="p-5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-3xl">
                                        <div className="flex items-center gap-2 mb-3">
                                            <ClockIcon className="w-4 h-4 text-amber-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                                                {t('resultCard.publish.bestTime', 'Optymalny czas')}
                                            </span>
                                        </div>
                                        <p className="text-sm font-black text-slate-900 dark:text-white mb-1">
                                            {t('resultCard.publish.todayAt', 'Dziś o {{time}}', { time: result.suggestedPostingTime })}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-medium italic">
                                            {t('resultCard.publish.timeHint', 'Sugerowana godzina na podstawie aktywności grupy docelowej.')}
                                        </p>
                                    </div>
                                )}

                                {formData && (
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                Konto publikacji ({formData.platform})
                                            </p>
                                            {connections.filter(c => c.platform.toLowerCase() === formData.platform.toLowerCase() && c.isActive).length > 0 && (
                                                <button
                                                    onClick={() => loadConnections()}
                                                    className="text-[10px] font-bold text-blue-500 hover:underline uppercase tracking-wider"
                                                >
                                                    Odśwież
                                                </button>
                                            )}
                                        </div>

                                        {isLoadingConnections ? (
                                            <div className="flex items-center gap-2 py-2">
                                                <Spinner className="w-4 h-4 text-blue-500" />
                                                <span className="text-xs text-slate-400">Wyszukiwanie połączeń...</span>
                                            </div>
                                        ) : (() => {
                                            const platformConnections = connections.filter(
                                                c => c.platform.toLowerCase() === formData.platform.toLowerCase() && c.isActive
                                            );

                                            if (platformConnections.length === 0) {
                                                return (
                                                    <div className="flex flex-col items-center gap-3 text-center py-2">
                                                        <p className="text-xs text-slate-500">
                                                            Brak połączonego konta dla platformy {formData.platform}.
                                                        </p>
                                                        <ModernButton
                                                            onClick={() => handleConnectSocial(formData.platform.toLowerCase())}
                                                            variant="secondary"
                                                            size="sm"
                                                            className="text-xs py-1.5 px-3"
                                                        >
                                                            Połącz konto {formData.platform}
                                                        </ModernButton>
                                                    </div>
                                                );
                                            }

                                            if (platformConnections.length > 1) {
                                                return (
                                                    <select
                                                        value={selectedConnectionId}
                                                        onChange={(e) => setSelectedConnectionId(e.target.value)}
                                                        className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white"
                                                    >
                                                        {platformConnections.map(c => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.accountName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                );
                                            }

                                            const conn = platformConnections[0];
                                            return (
                                                <div className="flex items-center gap-3 bg-white dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
                                                        {conn.profileImageUrl ? (
                                                            <img src={conn.profileImageUrl} alt="Avatar" className="w-full h-full object-cover" />
                                                        ) : (
                                                            conn.accountName?.[0] || '?'
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                                            {conn.accountName}
                                                        </p>
                                                        <p className="text-[9px] text-green-500 font-bold uppercase tracking-wider">
                                                            Połączono
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <ModernButton
                                        onClick={() => formData && appHandlers.handleOpenScheduleModal(result, formData)}
                                        variant="secondary"
                                        fullWidth
                                        icon={<CalendarIcon className="w-4 h-4" />}
                                    >
                                        {t('resultCard.actions.schedule', 'Zaplanuj')}
                                    </ModernButton>
                                    <ModernButton
                                        onClick={() => formData && appHandlers.handlePublishNow(result, formData.platform, selectedConnectionId || undefined)}
                                        variant="primary"
                                        fullWidth
                                        disabled={connections.filter(c => c.platform.toLowerCase() === formData?.platform?.toLowerCase() && c.isActive).length === 0}
                                        icon={<RocketLaunchIcon className="w-4 h-4" />}
                                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {t('resultCard.publish.publishNow', 'Publikuj teraz')}
                                    </ModernButton>
                                </div>

                                <ModernButton
                                    onClick={() => appHandlers.handleOpenRepurposeModal(result)}
                                    variant="secondary"
                                    fullWidth
                                    icon={<LayersIcon className="w-4 h-4" />}
                                >
                                    {t('resultCard.publish.repurpose', 'Przetwórz na inny format')}
                                </ModernButton>
                            </div>
                        )}

                        {activeTab === 'analysis' && (
                            <div className="space-y-6 animate-fade-in">
                                {(performancePrediction || isPredictingPerformance) && (
                                    <PerformancePredictionDisplay
                                        result={performancePrediction}
                                        isLoading={isPredictingPerformance}
                                    />
                                )}
                                {(sentimentAnalysis || isAnalyzingSentiment) && (
                                    <SentimentDisplay result={sentimentAnalysis} isLoading={isAnalyzingSentiment} />
                                )}
                                {(seoAnalysis || isAnalyzingSEO) && (
                                    <SEOAnalysisDisplay result={seoAnalysis} isLoading={isAnalyzingSEO} />
                                )}

                                {!performancePrediction && !isPredictingPerformance && (
                                    <ModernButton
                                        onClick={appHandlers.handlePredictPerformance}
                                        variant="secondary"
                                        fullWidth
                                        loading={isPredictingPerformance}
                                        icon={<TrendingUpIcon className="w-4 h-4" />}
                                    >
                                        {t('resultCard.analysis.predict', 'Prognozuj zaangażowanie')}
                                    </ModernButton>
                                )}

                                {!seoAnalysis && !isAnalyzingSEO && (
                                    <ModernButton
                                        onClick={appHandlers.handleAnalyzeSEO}
                                        variant="secondary"
                                        fullWidth
                                        loading={isAnalyzingSEO}
                                        icon={<SearchIcon className="w-4 h-4" />}
                                    >
                                        {t('resultCard.analysis.seo', 'Analiza SEO')}
                                    </ModernButton>
                                )}

                                {formData && (
                                    <button
                                        type="button"
                                        onClick={() => setIsHashtagGeneratorOpen(true)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20 border-2 border-blue-300 dark:border-blue-700 rounded-xl transition-all group"
                                    >
                                        <div className="p-1.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg group-hover:scale-110 transition-transform">
                                            <HashIcon className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="text-left">
                                            <span className="text-sm font-bold text-blue-700 dark:text-blue-300 block">
                                                {t('resultCard.analysis.hashtags', 'Smart Hashtag Generator')}
                                            </span>
                                            <span className="text-xs text-blue-600/70 dark:text-blue-400/70">
                                                {t('resultCard.analysis.hashtagsHint', 'Reach, Engagement, Niche, Viral, Branded')}
                                            </span>
                                        </div>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                );
        }
    };


    return (
        <div className="glass-premium border border-white/10 rounded-[2.5rem] shadow-2xl p-6 md:p-8">
            {renderContent()}

            {isCreativeStudioOpen && result?.imageUrl && (
                <CreativeCanvas
                    imageUrl={result.imageUrl}
                    initialText={suggestedLayouts[0]?.text || result.postText.substring(0, 30)}
                    logoUrl={activeProfile?.settings?.logoUrl}
                    mascotUrl={activeProfile?.settings?.mascotUrl}
                    onExport={(dataUrl) => {
                        handleApplyImageEdit(dataUrl);
                        notificationSystem.addToast(
                            t('resultCard.media.saved', 'Grafika zapisana do posta'),
                            NotificationType.Success
                        );
                    }}
                    onClose={() => setIsCreativeStudioOpen(false)}
                />
            )}

            {isVisualStudioOpen && result?.imageUrl && user && (
                <VisualStudioModal
                    isOpen={isVisualStudioOpen}
                    onClose={() => setIsVisualStudioOpen(false)}
                    originalImageUrl={result.imageUrl}
                    user={user}
                    onApply={(newImageUrl) => {
                        handleApplyImageEdit(newImageUrl);
                        setIsVisualStudioOpen(false);
                        notificationSystem.addToast(
                            t('resultCard.media.aiSaved', 'Edycja AI zapisana'),
                            NotificationType.Success
                        );
                    }}
                />
            )}

            {/* Smart Hashtag Generator Modal */}
            {isHashtagGeneratorOpen && formData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl">
                        <button
                            onClick={() => setIsHashtagGeneratorOpen(false)}
                            className="absolute top-4 right-4 z-10 p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        </button>
                        <div className="p-6">
                            <HashtagGenerator
                                topic={formData.topic || formData.audience || 'Social Media'}
                                platform={formData.platform}
                                contentType={formData.contentType}
                                onSelectHashtags={(hashtags) => {
                                    handleUpdateResult({
                                        ...result,
                                        hashtags,
                                    });
                                    setIsHashtagGeneratorOpen(false);
                                }}
                                currentHashtags={result.hashtags}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
