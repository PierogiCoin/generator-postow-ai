import React, { Suspense, lazy, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

// Zustand Stores & Hooks
import { useGenerationStore } from '../stores/generationStore';
import { useDataStore } from '../stores/dataStore';
import { useUIStore } from '../stores/uiStore';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { useNotifications } from '../hooks/useNotifications';

// Krytyczne dla pierwszego renderu
import { StrategyAssistant } from './StrategyAssistant';

const InputForm = lazy(() => import('./InputForm').then((m) => ({ default: m.InputForm })));

// Lazy — ładowane na żądanie (wynik, zakładki sidebara, optymalizator)
const ResultCard = lazy(() => import('./ResultCard').then((m) => ({ default: m.ResultCard })));
const MultiPlatformOptimizer = lazy(() => import('./MultiPlatformOptimizer').then((m) => ({ default: m.MultiPlatformOptimizer })));
const FavoritesList = lazy(() => import('./FavoritesList').then((m) => ({ default: m.FavoritesList })));
const ScheduledPostsList = lazy(() => import('./ScheduledPostsList').then((m) => ({ default: m.ScheduledPostsList })));
const StatsDashboard = lazy(() => import('./StatsDashboard').then((m) => ({ default: m.StatsDashboard })));
const SubscriptionStatus = lazy(() => import('./SubscriptionStatus').then((m) => ({ default: m.SubscriptionStatus })));
const PreviewPopover = lazy(() => import('./PreviewPopover').then((m) => ({ default: m.PreviewPopover })));

// UX/UI Components
import { LoadingOverlay, SkeletonCard } from './ui/LoadingStates';
import { showSuccess, showError, showWarning } from '../utils/errorHandler';
import { ClockIcon } from './icons/ClockIcon';
import { StarIcon } from './icons/StarIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { TargetIcon } from './icons/TargetIcon';
const FireIcon = ({ className }: { className?: string }) => <div className={className}>🔥</div>;
import { ChartBarIcon } from './icons/ChartBarIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { SidebarIcon } from './icons/SidebarIcon';
import { PostIcon } from './icons/PostIcon';
import { VideoIcon } from './icons/VideoIcon';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ArrowUturnLeftIcon } from './icons/ArrowUturnLeftIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ModernButton } from './ui/ModernButton';
import { OnboardingGuide } from './OnboardingGuide';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { useConfirm } from '../hooks/useConfirm';
import { isOnboardingGuideActive } from '../utils/onboarding';

import type { FormData, CampaignHistoryItem, FavoritePost, Draft, GenerationResult, ScheduledPost } from '../types';
import { UserPlan } from '../types';

type SidebarTab = 'history' | 'drafts' | 'favorites' | 'scheduled' | 'stats' | 'subscription';

export const GeneratorView: React.FC = () => {
    const { t } = useTranslation();
    const { user, userPlan } = useAuth();

    // Zustand stores for state
    const {
        history, drafts, favorites, scheduledPosts, stats, isLearningStyle,
        inspiration, selectInspiration, clearHistory, removeFavorite, clearFavorites,
        saveTemplate, deleteTemplate, removeDraft
    } = useDataStore();
    const { result, isLoading, isOptimizingMultiPlatform } = useGenerationStore();
    const { setIsPricingModalOpen, setIsSocialConnectionsModalOpen } = useUIStore();
    const { confirm, confirmDialogProps } = useConfirm();

    const [multiPlatformOptimizations, setMultiPlatformOptimizations] = useState<any>(null);
    const [generationProgress, setGenerationProgress] = useState(0);

    // Simulate generation progress
    useEffect(() => {
        if (isLoading) {
            setGenerationProgress(0);
            const interval = setInterval(() => {
                setGenerationProgress(prev => {
                    if (prev >= 90) return prev;
                    return prev + Math.random() * 15;
                });
            }, 800);
            return () => clearInterval(interval);
        } else {
            setGenerationProgress(100);
            const timeout = setTimeout(() => setGenerationProgress(0), 1000);
            return () => clearTimeout(timeout);
        }
    }, [isLoading]);

    // Handlers
    const notificationSystem = useNotifications();
    const appHandlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification);

    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
    const [prefillData, setPrefillData] = useState<Partial<FormData> | null>(null);
    const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('history');
    const [popover, setPopover] = useState<{ item: CampaignHistoryItem | Draft | ScheduledPost, rect: DOMRect } | null>(null);

    useEffect(() => {
        const handleResize = () => setIsSidebarOpen(window.innerWidth > 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (location.state?.prefillData) {
            setPrefillData(location.state.prefillData);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    useEffect(() => {
        if (inspiration?.formData) {
            setPrefillData(inspiration.formData);
        }
    }, [inspiration]);

    const onPrefillConsumed = () => setPrefillData(null);

    const showOnboardingGuide = Boolean(user && isOnboardingGuideActive(user.id));

    const handleClearHistory = useCallback(async () => {
        const confirmed = await confirm({
            title: 'Wyczyść historię',
            message: t('sidebar.historySection.clearConfirm', 'Czy na pewno chcesz usunąć całą historię? Tej operacji nie można cofnąć.'),
            variant: 'danger',
            confirmLabel: 'Usuń historię',
        });
        if (confirmed) clearHistory();
    }, [confirm, clearHistory, t]);

    const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>, item: CampaignHistoryItem | Draft | ScheduledPost) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPopover({ item, rect });
    }, []);

    const handleMouseLeave = useCallback(() => {
        setPopover(null);
    }, []);

    const isBrandVoiceEnabled = [UserPlan.Creator, UserPlan.Pro, UserPlan.Agency, UserPlan.Business].includes(userPlan);

    const sidebarTabs = useMemo(() => [
        { id: 'history', label: t('sidebar.tabs.history'), icon: ClockIcon },
        { id: 'drafts', label: t('sidebar.tabs.drafts'), icon: DocumentPlusIcon },
        { id: 'favorites', label: t('sidebar.tabs.favorites'), icon: StarIcon },
        { id: 'scheduled', label: t('sidebar.tabs.scheduled'), icon: CalendarIcon },
        { id: 'stats', label: t('sidebar.tabs.stats'), icon: ChartBarIcon },
        ...(user ? [{ id: 'subscription', label: t('sidebar.tabs.subscription'), icon: CreditCardIcon }] : []),
    ], [t, user]);

    const handleReturnToGenerator = useCallback(() => {
        selectInspiration(null);
        setPrefillData(null);
    }, [selectInspiration]);

    const renderActiveTabContent = () => {
        switch (activeSidebarTab) {
            case 'history':
                return (
                    <section className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('sidebar.historySection.title')}</h2>
                            {history.length > 0 && (
                                <button onClick={handleClearHistory} aria-label="Clear history" className="text-[10px] font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest">{t('sidebar.historySection.clear')}</button>
                            )}
                        </div>
                        {history.length === 0 ? <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-white/5 p-4 rounded-xl border border-white/5">{t('sidebar.historySection.empty')}</p> : (
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {history.map((item, index) => {
                                    const isSelected = inspiration?.id === item.id;
                                    return (
                                        <div
                                            key={item.id}
                                            style={{ animationDelay: `${index * 50}ms` }}
                                            onMouseEnter={(e) => handleMouseEnter(e, item)}
                                            onMouseLeave={handleMouseLeave}
                                            onClick={() => selectInspiration(item)}
                                            className={`group p-4 rounded-2xl border transition-all cursor-pointer animate-fade-in-up hover:scale-[1.02] active:scale-[0.98] ${isSelected ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/5' : 'bg-white/40 dark:bg-slate-950/20 border-slate-200/50 dark:border-white/5 hover:border-cyan-500/35'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    {item.result.imageUrl
                                                        ? <img src={item.result.imageUrl} alt="Post image preview" className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/10" loading="lazy" />
                                                        : item.result.videoUrl
                                                            ? <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center"><VideoIcon className="w-6 h-6 text-red-500" /></div>
                                                            : <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200/50 dark:border-white/5"><PostIcon className="w-6 h-6 text-slate-400" /></div>
                                                    }
                                                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${isSelected ? 'bg-cyan-500 text-white' : 'bg-slate-500 text-white'}`}>
                                                        <SparklesIcon className="w-2.5 h-2.5" />
                                                    </div>
                                                </div>
                                                <div className="min-w-0 flex-grow">
                                                    <div className={`font-bold text-sm truncate ${isSelected ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-900 dark:text-white'}`} title={item.formData?.topic?.replace(/<[^>]*>?/gm, '') || ''}>
                                                        {item.formData?.topic?.replace(/<[^>]*>?/gm, '') || t('common.untitled')}
                                                    </div>
                                                    <p className="text-[9px] font-bold uppercase tracking-wider mt-1 text-slate-400">
                                                        {item.formData?.platform || '---'} &bull; {new Date(item.timestamp).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                );
            case 'drafts':
                return (
                    <section className="space-y-4">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{t('sidebar.draftsSection.title')}</h2>
                        {drafts.length === 0 ? <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-white/5 p-4 rounded-xl border border-white/5">{t('sidebar.draftsSection.empty')}</p> : (
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {drafts.map((draft, index) => (
                                    <div key={draft.id} style={{ animationDelay: `${index * 50}ms` }} onMouseEnter={(e) => handleMouseEnter(e, draft)} onMouseLeave={handleMouseLeave} className="group p-4 rounded-2xl bg-white/40 dark:bg-slate-950/20 border border-slate-200/50 dark:border-white/5 flex justify-between items-center animate-fade-in-up hover:border-cyan-500/35 transition-all">
                                        <div className="min-w-0 flex-grow" onClick={() => selectInspiration(draft)} style={{ cursor: 'pointer' }}>
                                            <div className="font-bold text-sm text-slate-900 dark:text-white truncate" title={draft.formData?.topic?.replace(/<[^>]*>?/gm, '') || ''}>
                                                {draft.formData?.topic?.replace(/<[^>]*>?/gm, '') || t('common.untitled')}
                                            </div>
                                            <p className="text-[9px] font-bold uppercase tracking-widest mt-1 text-slate-400">{new Date(draft.timestamp).toLocaleDateString()}</p>
                                        </div>
                                        <button onClick={() => removeDraft(draft.id)} aria-label="Delete draft" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                );
            case 'favorites':
                return (
                    <Suspense fallback={<SkeletonCard />}>
                        <FavoritesList favorites={favorites} inspiration={inspiration as CampaignHistoryItem | FavoritePost | null} onSetInspiration={selectInspiration} onRemove={(id) => removeFavorite(id)} onClear={() => clearFavorites()} onLearnStyle={appHandlers.handleLearnFromFavorites} isLearningStyle={isLearningStyle} />
                    </Suspense>
                );
            case 'scheduled':
                return (
                    <Suspense fallback={<SkeletonCard />}>
                        <ScheduledPostsList scheduledPosts={scheduledPosts} onDelete={appHandlers.deleteScheduledPost} onEdit={appHandlers.handleEditScheduledPost} onClear={appHandlers.clearScheduledPosts} onHover={handleMouseEnter} onLeave={handleMouseLeave} />
                    </Suspense>
                );
            case 'stats':
                return (
                    <Suspense fallback={<SkeletonCard />}>
                        <StatsDashboard stats={stats} onClearStats={() => user && appHandlers.handleClearStats()} />
                    </Suspense>
                );
            case 'subscription':
                return (
                    <Suspense fallback={<SkeletonCard />}>
                        <SubscriptionStatus stats={stats} userPlan={userPlan} onUpgrade={() => setIsPricingModalOpen(true)} />
                    </Suspense>
                );
            default: return null;
        }
    };

    const isResultVisible = !!result || !!inspiration;

    return (
        <div className="flex flex-col lg:flex-row gap-6 xl:gap-8 min-h-[calc(100vh-140px)] relative">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fuchsia-500/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px]" />
            </div>

            <ConfirmDialog {...confirmDialogProps} />
            <aside className={`fixed lg:relative inset-y-0 left-0 z-50 transform lg:transform-none transition-all duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0 w-[360px] xl:w-[400px]' : '-translate-x-full w-0'}`}>
                <div className={`h-full flex flex-col glass-premium rounded-[2.5rem] overflow-hidden transition-opacity duration-500 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="p-6 lg:p-8 pb-4 flex-shrink-0 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20">
                                <SidebarIcon className="w-5 h-5 text-cyan-500" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">{t('sidebar.title')}</h3>
                        </div>
                        <button 
                            onClick={() => setIsSidebarOpen(false)} 
                            aria-label="Close sidebar" 
                            className="lg:hidden p-2 bg-slate-100 dark:bg-white/5 rounded-xl text-slate-400 hover:text-slate-200 transition"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="px-6 py-4 flex-shrink-0">
                        <div className="grid grid-cols-6 gap-1.5 p-1.5 bg-slate-100/50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/50 dark:border-white/5">
                            {sidebarTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveSidebarTab(tab.id as SidebarTab)}
                                    title={tab.label}
                                    className={`relative p-2.5 rounded-xl transition flex items-center justify-center ${activeSidebarTab === tab.id 
                                        ? 'bg-white dark:bg-slate-800 shadow-md text-cyan-500 border border-slate-200/10 scale-105' 
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-100/40 dark:hover:bg-white/5'}`}
                                >
                                    <tab.icon className={`w-4 h-4 ${activeSidebarTab === tab.id ? 'text-cyan-500 scale-110' : ''}`} />
                                    {activeSidebarTab === tab.id && (
                                        <span className="absolute -bottom-0.5 w-1 h-1 bg-cyan-500 rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 lg:p-8 pt-2 overflow-y-auto flex-grow custom-scrollbar">
                        <div key={activeSidebarTab} className="animate-fade-in">
                            {renderActiveTabContent()}
                        </div>
                    </div>
                </div>
            </aside>

            {isLoading && (
                <LoadingOverlay
                    message="Generowanie treści AI..."
                    submessage="Tworzymy unikalne treści dopasowane do Twojej marki..."
                    progress={generationProgress}
                />
            )}

            <div className="flex-grow relative z-10">
                {!isSidebarOpen && (
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="fixed bottom-24 left-6 lg:left-8 z-[60] w-14 h-14 bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-xl flex items-center justify-center text-slate-400 hover:text-cyan-500 hover:scale-110 transition-all backdrop-blur-xl group overflow-hidden neon-glow-cyan"
                    >
                        <SidebarIcon className="w-6 h-6 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                    </button>
                )}

                <div className={`max-w-7xl mx-auto transition-all duration-500 ease-in-out ${isResultVisible ? 'grid gap-8 lg:grid-cols-[1.1fr,1.2fr]' : 'flex justify-center'}`}>
                    <div className={`w-full transition-all duration-750 ${isResultVisible ? '' : 'max-w-4xl'}`}>
                        {showOnboardingGuide && user && (
                            <OnboardingGuide
                                userId={user.id}
                                hasGenerated={history.length > 0}
                                hasFavorited={favorites.length > 0}
                                onConnectSocial={() => setIsSocialConnectionsModalOpen(true)}
                                onScrollToForm={() => {
                                    document.getElementById('input-form-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                                onScrollToResult={() => {
                                    document.getElementById('generation-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                            />
                        )}
                        <div className="mb-6">
                            <StrategyAssistant />
                        </div>
                        {inspiration && (
                            <div className="mb-6 flex justify-between items-center p-4 lg:p-5 bg-cyan-500/5 border border-cyan-500/20 rounded-3xl shadow-md">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-cyan-500 rounded-xl text-white shadow-md shadow-cyan-500/20">
                                        <ClockIcon className="w-5 h-5" />
                                    </div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">{t('generatorView.viewingHistory')}</p>
                                </div>
                                <ModernButton onClick={handleReturnToGenerator} variant="outline" size="sm" className="hover:scale-105 transition-transform">
                                    <ArrowUturnLeftIcon className="w-3.5 h-3.5 mr-2" /> {t('generatorView.backToGenerator')}
                                </ModernButton>
                            </div>
                        )}
                        <Suspense fallback={<SkeletonCard />}>
                            <InputForm prefillData={prefillData} onPrefillConsumed={onPrefillConsumed} />
                        </Suspense>
                    </div>

                    {isResultVisible && (
                        <div id="generation-result" className="space-y-8 animate-fade-in-right">
                            {isLoading ? (
                                <SkeletonCard />
                            ) : (
                                <Suspense fallback={<SkeletonCard />}>
                                    <ResultCard historyResult={('result' in (inspiration || {})) ? (inspiration as CampaignHistoryItem).result : null} />
                                </Suspense>
                            )}

                            {result && !isLoading && (
                                <div className="glass-premium rounded-[2.5rem] border border-white/10 shadow-2xl p-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                    <Suspense fallback={<SkeletonCard />}>
                                        <MultiPlatformOptimizer
                                        originalText={result.postText}
                                        originalPlatform={result.platform}
                                        tone={result.metadata.tone}
                                        onOptimize={async (platforms) => {
                                            if (!user) return [];
                                            const { optimizeForPlatforms } = await import('../services/multiPlatformService');
                                            return optimizeForPlatforms({
                                                originalText: result.postText,
                                                originalPlatform: result.platform,
                                                targetPlatforms: platforms,
                                                tone: result.metadata.tone,
                                                hashtags: result.hashtags
                                            }, user.id);
                                        }}
                                        isOptimizing={isOptimizingMultiPlatform}
                                        optimizations={multiPlatformOptimizations}
                                    />
                                    </Suspense>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {popover && (
                <Suspense fallback={null}>
                    <PreviewPopover
                    result={('result' in popover.item) ? (popover.item as CampaignHistoryItem | ScheduledPost).result : { id: popover.item.id, type: popover.item.formData?.generationType, platform: popover.item.formData?.platform, postText: popover.item.formData?.topic || '', hashtags: [], imageUrl: null, videoUrl: null, adHeadline: null, callToAction: null, metadata: { tone: popover.item.formData?.tone, audience: popover.item.formData?.audience }, approvalStatus: 'draft', comments: [], authorId: popover.item.userId } as GenerationResult}
                    formData={popover.item.formData}
                    position={{ top: popover.rect.top + popover.rect.height / 2, left: popover.rect.right + 20 }}
                    />
                </Suspense>
            )}
        </div>
    );
};
