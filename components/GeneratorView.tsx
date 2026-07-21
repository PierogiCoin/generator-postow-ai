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
import type { PlatformOptimization } from './MultiPlatformOptimizer';
const FavoritesList = lazy(() => import('./FavoritesList').then((m) => ({ default: m.FavoritesList })));
const ScheduledPostsList = lazy(() => import('./ScheduledPostsList').then((m) => ({ default: m.ScheduledPostsList })));
const StatsDashboard = lazy(() => import('./StatsDashboard').then((m) => ({ default: m.StatsDashboard })));
const SubscriptionStatus = lazy(() => import('./SubscriptionStatus').then((m) => ({ default: m.SubscriptionStatus })));
const PreviewPopover = lazy(() => import('./PreviewPopover').then((m) => ({ default: m.PreviewPopover })));

// UX/UI Components
import { LoadingOverlay, SkeletonCard } from './ui/LoadingStates';
import { showSuccess, showError } from '../utils/errorHandler';
import { parseUserFacingError } from '../utils/userFacingError';
import { ClockIcon } from './icons/ClockIcon';
import { StarIcon } from './icons/StarIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { XMarkIcon } from './icons/XMarkIcon';
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
import { CalendarSlotBanner } from './calendar/CalendarSlotBanner';

import type { FormData, CampaignHistoryItem, FavoritePost, Draft, GenerationResult, ScheduledPost, CalendarSlotContext } from '../types';
import { NotificationType } from '../types';

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
    const { result, isLoading, isOptimizingMultiPlatform, generationProgress, pendingCalendarSlot, calendarBatchQueue, calendarBatchTotal } = useGenerationStore();
    const { setIsPricingModalOpen, setIsSocialConnectionsModalOpen } = useUIStore();
    const { confirm, confirmDialogProps } = useConfirm();

    const [multiPlatformOptimizations, setMultiPlatformOptimizations] = useState<PlatformOptimization[] | null>(null);
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' && window.innerWidth < 1024
    );
    const [mobilePanel, setMobilePanel] = useState<'form' | 'result'>('form');

    // Handlers
    const notificationSystem = useNotifications();
    const appHandlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification);

    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
    const [prefillData, setPrefillData] = useState<Partial<FormData> | null>(null);
    const [autoGenerateSlot, setAutoGenerateSlot] = useState(false);
    const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('history');
    const [showMoreTabs, setShowMoreTabs] = useState(false);
    const [popover, setPopover] = useState<{ item: CampaignHistoryItem | Draft | ScheduledPost, rect: DOMRect } | null>(null);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 1023px)');
        const update = () => setIsMobile(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    // Tylko przy przejściu breakpointu lg — nie przy każdym resize (np. pasek adresu iOS)
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)');
        const onBreakpoint = (e: MediaQueryListEvent) => {
            if (!e.matches) {
                setIsSidebarOpen(false);
                return;
            }
            // Desktop: otwórz bibliotekę tylko gdy nie ma wyniku (3 kolumny = chaos)
            const hasResult = Boolean(useGenerationStore.getState().result);
            setIsSidebarOpen(!hasResult);
        };
        mq.addEventListener('change', onBreakpoint);
        return () => mq.removeEventListener('change', onBreakpoint);
    }, []);

    // Przy wyniku — zwiń bibliotekę (form + wynik dostają przestrzeń)
    useEffect(() => {
        if (result && !isLoading) {
            setIsSidebarOpen(false);
            if (isMobile) setMobilePanel('result');
        }
    }, [result, isLoading, isMobile]);

    useEffect(() => {
        if (inspiration && isMobile) {
            setMobilePanel('result');
            setIsSidebarOpen(false);
        }
    }, [inspiration, isMobile]);

    useEffect(() => {
        if (!isSidebarOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setIsSidebarOpen(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isSidebarOpen]);

    useEffect(() => {
        if (location.state?.prefillData) {
            setPrefillData(location.state.prefillData);
        }
        if (location.state?.calendarSlot) {
            useGenerationStore.getState().setPendingCalendarSlot(location.state.calendarSlot as CalendarSlotContext);
        }
        if (location.state?.autoGenerateSlot) {
            setAutoGenerateSlot(true);
        }
        if (location.state?.prefillData || location.state?.calendarSlot) {
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

    const isResultVisible = !!result || !!inspiration;

    const primarySidebarTabs = useMemo(() => [
        { id: 'history' as const, label: t('sidebar.tabs.history'), icon: ClockIcon, badge: history.length },
        { id: 'drafts' as const, label: t('sidebar.tabs.drafts'), icon: DocumentPlusIcon, badge: drafts.length },
        { id: 'favorites' as const, label: t('sidebar.tabs.favorites'), icon: StarIcon, badge: favorites.length },
        { id: 'scheduled' as const, label: t('sidebar.tabs.scheduled'), icon: CalendarIcon, badge: scheduledPosts.length },
    ], [t, history.length, drafts.length, favorites.length, scheduledPosts.length]);

    const moreSidebarTabs = useMemo(() => [
        { id: 'stats' as const, label: t('sidebar.tabs.stats'), icon: ChartBarIcon },
        ...(user ? [{ id: 'subscription' as const, label: t('sidebar.tabs.subscription'), icon: CreditCardIcon }] : []),
    ], [t, user]);

    const sidebarTabs = useMemo(
        () => [...primarySidebarTabs, ...moreSidebarTabs],
        [primarySidebarTabs, moreSidebarTabs]
    );

    const isMoreTabActive = activeSidebarTab === 'stats' || activeSidebarTab === 'subscription';

    const handleTabsKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        const visibleTabs = showMoreTabs || isMoreTabActive
            ? sidebarTabs
            : primarySidebarTabs;
        const currentIndex = visibleTabs.findIndex((tab) => tab.id === activeSidebarTab);
        let nextIndex = currentIndex;

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextIndex = (currentIndex + 1) % visibleTabs.length;
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            nextIndex = (currentIndex - 1 + visibleTabs.length) % visibleTabs.length;
        } else {
            return;
        }

        const nextTab = visibleTabs[nextIndex].id;
        setActiveSidebarTab(nextTab);
        if (nextTab === 'stats' || nextTab === 'subscription') setShowMoreTabs(true);

        const buttons = e.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="tab"]');
        buttons[nextIndex]?.focus();
    }, [sidebarTabs, primarySidebarTabs, activeSidebarTab, showMoreTabs, isMoreTabActive]);

    const showFormColumn = !isResultVisible || !isMobile || mobilePanel === 'form';
    const showResultColumn = isResultVisible && (!isMobile || mobilePanel === 'result');

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
                            <h2 className="text-lg font-display font-extrabold text-slate-900 dark:text-white tracking-tight">{t('sidebar.historySection.title')}</h2>
                            {history.length > 0 && (
                                <button onClick={handleClearHistory} aria-label={t('sidebar.historySection.clear')} className="text-[10px] font-semibold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest">{t('sidebar.historySection.clear')}</button>
                            )}
                        </div>
                        {history.length === 0 ? <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-white/5 p-4 rounded-xl border border-white/5">{t('sidebar.historySection.empty')}</p> : (
                            <div className="space-y-3 pr-1">
                                {history.map((item, index) => {
                                    const isSelected = inspiration?.id === item.id;
                                    return (
                                        <div
                                            key={item.id}
                                            style={{ animationDelay: `${index * 50}ms` }}
                                            onMouseEnter={(e) => handleMouseEnter(e, item)}
                                            onMouseLeave={handleMouseLeave}
                                            onClick={() => selectInspiration(item)}
                                            className={`group p-4 rounded-2xl border transition-all cursor-pointer animate-fade-in-up hover:scale-[1.02] active:scale-[0.98] ${isSelected ? 'bg-[var(--hero-accent-soft)] border-[var(--hero-accent)]/40' : 'bg-white/40 dark:bg-slate-950/20 border-slate-200/50 dark:border-white/5 hover:border-[var(--hero-accent)]/40'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    {item.result.imageUrl
                                                        ? <img src={item.result.imageUrl} alt="Post image preview" className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/10" loading="lazy" />
                                                        : item.result.videoUrl
                                                            ? <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center"><VideoIcon className="w-6 h-6 text-red-500" /></div>
                                                            : <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200/50 dark:border-white/5"><PostIcon className="w-6 h-6 text-slate-400" /></div>
                                                    }
                                                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${isSelected ? 'bg-[var(--hero-accent)] text-white' : 'bg-slate-500 text-white'}`}>
                                                        <SparklesIcon className="w-2.5 h-2.5" />
                                                    </div>
                                                </div>
                                                <div className="min-w-0 flex-grow">
                                                    <div className={`font-bold text-sm truncate ${isSelected ? 'text-[var(--hero-accent)]' : 'text-slate-900 dark:text-white'}`} title={item.formData?.topic?.replace(/<[^>]*>?/gm, '') || ''}>
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
                        <h2 className="text-lg font-display font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">{t('sidebar.draftsSection.title')}</h2>
                        {drafts.length === 0 ? <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-white/5 p-4 rounded-xl border border-white/5">{t('sidebar.draftsSection.empty')}</p> : (
                            <div className="space-y-3 pr-1">
                                {drafts.map((draft, index) => (
                                    <div key={draft.id} style={{ animationDelay: `${index * 50}ms` }} onMouseEnter={(e) => handleMouseEnter(e, draft)} onMouseLeave={handleMouseLeave} className="group p-4 rounded-2xl bg-white/40 dark:bg-slate-950/20 border border-slate-200/50 dark:border-white/5 flex justify-between items-center animate-fade-in-up hover:border-[var(--hero-accent)]/40 transition-all">
                                        <div className="min-w-0 flex-grow" onClick={() => selectInspiration(draft)} style={{ cursor: 'pointer' }}>
                                            <div className="font-bold text-sm text-slate-900 dark:text-white truncate" title={draft.formData?.topic?.replace(/<[^>]*>?/gm, '') || ''}>
                                                {draft.formData?.topic?.replace(/<[^>]*>?/gm, '') || t('common.untitled')}
                                            </div>
                                            <p className="text-[9px] font-bold uppercase tracking-widest mt-1 text-slate-400">{new Date(draft.timestamp).toLocaleDateString()}</p>
                                        </div>
                                        <button onClick={() => removeDraft(draft.id)} aria-label={t('sidebar.draftsSection.delete', 'Usuń szkic')} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><TrashIcon className="w-4 h-4" /></button>
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
                        <SubscriptionStatus
                            credits={user?.credits ?? 0}
                            userPlan={userPlan}
                            stats={stats}
                            onUpgrade={() => setIsPricingModalOpen(true)}
                        />
                    </Suspense>
                );
            default: return null;
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 xl:gap-8 min-h-[calc(100vh-140px)] relative bg-transparent">
            <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute top-[10%] left-[5%] w-96 h-96 bg-fuchsia-500/[0.03] rounded-full blur-[120px]" />
                <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] opacity-0" />
            </div>

            <ConfirmDialog {...confirmDialogProps} />

            {isSidebarOpen && (
                <button
                    type="button"
                    aria-label={t('generatorView.closeSidebar', 'Zamknij bibliotekę')}
                    className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {isSidebarOpen && (
            <aside
                className="fixed inset-y-0 left-0 z-50 w-[min(340px,92vw)] p-3 sm:p-4 lg:p-0 lg:static lg:z-auto lg:w-[300px] xl:w-[340px] lg:flex-shrink-0 lg:sticky lg:top-8 lg:self-start lg:h-[calc(100vh-8rem)]"
                aria-label={t('sidebar.title', 'Biblioteka')}
            >
                <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg lg:shadow-sm">
                    <div className="p-4 lg:p-5 pb-3 flex-shrink-0 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-display font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {t('sidebar.title', 'Biblioteka')}
                        </h3>
                        <button
                            type="button"
                            onClick={() => setIsSidebarOpen(false)}
                            aria-label={t('generatorView.closeSidebar', 'Zamknij bibliotekę')}
                            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-accent)]"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="px-3 py-3 flex-shrink-0 border-b border-slate-100 dark:border-slate-800 space-y-2">
                        <div
                            className="flex gap-1 overflow-x-auto overscroll-x-contain pb-0.5 custom-scrollbar snap-x snap-mandatory focus:outline-none"
                            role="tablist"
                            aria-label={t('sidebar.tabs.ariaLabel', 'Zakładki biblioteki')}
                            onKeyDown={handleTabsKeyDown}
                        >
                            {primarySidebarTabs.map(tab => {
                                const badge = tab.badge || 0;
                                const badgeLabel = badge > 99 ? '99+' : String(badge);
                                const isSelected = activeSidebarTab === tab.id;
                                return (
                                <button
                                    key={tab.id}
                                    role="tab"
                                    aria-selected={isSelected}
                                    tabIndex={isSelected ? 0 : -1}
                                    onClick={() => {
                                        setActiveSidebarTab(tab.id);
                                        setShowMoreTabs(false);
                                    }}
                                    title={tab.label}
                                    aria-label={badge > 0 ? `${tab.label} (${badgeLabel})` : tab.label}
                                    className={`relative snap-start flex flex-col items-center justify-center gap-0.5 min-w-[3.5rem] min-h-[3.25rem] px-2 py-1.5 rounded-xl transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-accent)] ${isSelected
                                        ? 'bg-[var(--hero-accent-soft)] shadow-sm text-[var(--hero-accent)] border border-[var(--hero-accent)]/25'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'}`}
                                >
                                    <tab.icon className="w-[18px] h-[18px]" />
                                    <span className="text-[9px] font-bold uppercase tracking-wide leading-tight max-w-[3.25rem] truncate">
                                        {tab.label}
                                    </span>
                                    {badge > 0 && (
                                        <span className="absolute top-0.5 right-0.5 min-w-[1rem] h-4 px-0.5 rounded-full bg-[var(--hero-accent)] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                                            {badgeLabel}
                                        </span>
                                    )}
                                </button>
                            );})}
                            {moreSidebarTabs.length > 0 && (
                                <button
                                    type="button"
                                    aria-expanded={showMoreTabs || isMoreTabActive}
                                    aria-label={t('sidebar.tabs.more', 'Więcej')}
                                    onClick={() => {
                                        setShowMoreTabs((v) => !v);
                                        if (!isMoreTabActive && !showMoreTabs) {
                                            setActiveSidebarTab('stats');
                                        }
                                    }}
                                    className={`snap-start flex flex-col items-center justify-center gap-0.5 min-w-[3.5rem] min-h-[3.25rem] px-2 py-1.5 rounded-xl transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-accent)] ${
                                        showMoreTabs || isMoreTabActive
                                            ? 'bg-[var(--hero-accent-soft)] shadow-sm text-[var(--hero-accent)] border border-[var(--hero-accent)]/25'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                                    }`}
                                >
                                    <ChartBarIcon className="w-[18px] h-[18px]" />
                                    <span className="text-[9px] font-bold uppercase tracking-wide leading-tight">
                                        {t('sidebar.tabs.more', 'Więcej')}
                                    </span>
                                </button>
                            )}
                        </div>
                        {(showMoreTabs || isMoreTabActive) && moreSidebarTabs.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap" role="group" aria-label={t('sidebar.tabs.more', 'Więcej')}>
                                {moreSidebarTabs.map((tab) => {
                                    const isSelected = activeSidebarTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            role="tab"
                                            aria-selected={isSelected}
                                            onClick={() => setActiveSidebarTab(tab.id)}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors ${
                                                isSelected
                                                    ? 'bg-[var(--hero-accent)] text-white'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            <tab.icon className="w-3.5 h-3.5" />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="p-5 lg:p-6 pt-3 overflow-y-auto flex-grow custom-scrollbar">
                        <div key={activeSidebarTab} className="animate-fade-in">
                            {renderActiveTabContent()}
                        </div>
                    </div>
                </div>
            </aside>
            )}

            {isLoading && (
                <LoadingOverlay
                    message={generationProgress || t('generatorView.generating', 'Generowanie treści AI…')}
                    submessage={t('generatorView.generatingHint', 'Tworzymy treść dopasowaną do Twojej marki. Zwykle trwa to kilkanaście sekund.')}
                />
            )}

            <div className="flex-grow relative z-10 min-w-0">
                {!isSidebarOpen && (
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(true)}
                        aria-label={t('generatorView.openSidebar', 'Otwórz bibliotekę')}
                        className="mb-3 inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-600 dark:text-slate-300 hover:text-[var(--hero-accent)] hover:border-[var(--hero-accent)]/30 transition-colors"
                    >
                        <SidebarIcon className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-semibold">{t('generatorView.openSidebar', 'Biblioteka')}</span>
                    </button>
                )}

                <div className={`w-full transition-all duration-300 ${isResultVisible && !isMobile ? 'grid gap-6 lg:gap-8 lg:grid-cols-[minmax(0,1fr),minmax(0,1.05fr)]' : ''}`}>
                    {isResultVisible && isMobile && (
                        <div
                            className="lg:hidden sticky top-[4.5rem] z-30 mb-4 flex p-1 rounded-xl bg-slate-100/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-sm"
                            role="tablist"
                            aria-label={t('generatorView.mobileNav', 'Nawigacja generatora')}
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={mobilePanel === 'form'}
                                onClick={() => setMobilePanel('form')}
                                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors ${mobilePanel === 'form' ? 'bg-white dark:bg-slate-800 text-[var(--hero-accent)] shadow-sm border border-[var(--hero-accent)]/25' : 'text-slate-500 dark:text-slate-400'}`}
                            >
                                {t('generatorView.mobileTabForm', 'Formularz')}
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={mobilePanel === 'result'}
                                onClick={() => setMobilePanel('result')}
                                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${mobilePanel === 'result' ? 'bg-white dark:bg-slate-800 text-[var(--hero-accent)] shadow-sm border border-[var(--hero-accent)]/25' : 'text-slate-500 dark:text-slate-400'}`}
                            >
                                {t('generatorView.mobileTabResult', 'Wynik')}
                                {result && !isLoading && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden />
                                )}
                            </button>
                        </div>
                    )}

                    {showFormColumn && (
                    <div className={`w-full ${!isResultVisible ? 'max-w-3xl mx-auto' : ''}`}>
                        {!isResultVisible && (
                            <header className="mb-5 sm:mb-6">
                                <p
                                    className="text-[11px] font-semibold uppercase tracking-[0.18em] mb-1"
                                    style={{ color: 'var(--hero-accent)' }}
                                >
                                    {t('generatorView.eyebrow', 'Twórz')}
                                </p>
                                <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                    {t('generatorView.title', 'Generator treści')}
                                </h1>
                                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                                    {t('generatorView.subtitle', 'Od tematu do gotowego posta — w szybkim trybie lub z pełną kontrolą.')}
                                </p>
                            </header>
                        )}

                        {(showOnboardingGuide || inspiration || pendingCalendarSlot) && (
                            <div className="mb-4 space-y-3">
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
                                {inspiration && (
                                    <div className="flex justify-between items-center gap-3 p-3 sm:p-4 bg-[var(--hero-accent-soft)] border border-[var(--hero-accent)]/25 rounded-xl">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="p-1.5 bg-[var(--hero-accent)] rounded-lg text-white shrink-0">
                                                <ClockIcon className="w-4 h-4" />
                                            </div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-[var(--hero-accent)] truncate">{t('generatorView.viewingHistory')}</p>
                                        </div>
                                        <ModernButton onClick={handleReturnToGenerator} variant="outline" size="sm">
                                            <ArrowUturnLeftIcon className="w-3.5 h-3.5 mr-1.5" /> {t('generatorView.backToGenerator')}
                                        </ModernButton>
                                    </div>
                                )}
                                {pendingCalendarSlot && (
                                    <CalendarSlotBanner
                                        slot={pendingCalendarSlot}
                                        batchIndex={
                                            calendarBatchTotal > 0
                                                ? Math.max(
                                                    1,
                                                    calendarBatchTotal - calendarBatchQueue.length
                                                  )
                                                : undefined
                                        }
                                        batchTotal={calendarBatchTotal > 1 ? calendarBatchTotal : undefined}
                                        isGenerating={isLoading}
                                        onCancelBatch={() => {
                                            useGenerationStore.getState().clearCalendarBatch();
                                            useGenerationStore.getState().clearPendingCalendarSlot();
                                            notificationSystem.addToast(
                                                t(
                                                    'calendar.slot.batchCancelled',
                                                    'Anulowano kolejkę generowania dnia.'
                                                ),
                                                NotificationType.Info
                                            );
                                        }}
                                    />
                                )}
                            </div>
                        )}

                        <div className="mb-4">
                            <StrategyAssistant />
                        </div>

                        <Suspense fallback={<SkeletonCard />}>
                            <InputForm
                                prefillData={prefillData}
                                onPrefillConsumed={onPrefillConsumed}
                                autoGenerateSlot={autoGenerateSlot}
                                onAutoGenerateConsumed={() => setAutoGenerateSlot(false)}
                            />
                        </Suspense>
                    </div>
                    )}

                    {showResultColumn && (
                        <div id="generation-result" className="space-y-5 animate-fade-in lg:sticky lg:top-8 self-start">
                            {isLoading ? (
                                <SkeletonCard />
                            ) : (
                                <Suspense fallback={<SkeletonCard />}>
                                    <ResultCard historyResult={('result' in (inspiration || {})) ? (inspiration as CampaignHistoryItem).result : null} />
                                </Suspense>
                            )}

                            {result && !isLoading && (
                                <div className="border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0a1220]/70 rounded-lg p-5 lg:p-6 animate-fade-in-up">
                                    <Suspense fallback={<SkeletonCard />}>
                                        <MultiPlatformOptimizer
                                        originalText={result.postText}
                                        originalPlatform={result.platform}
                                        tone={result.metadata.tone}
                                        onOptimize={async (platforms) => {
                                            if (!user || !result) return [];
                                            const {
                                                startMultiPlatformOptimization,
                                                multiPlatformSuccess,
                                                multiPlatformFailure,
                                            } = useGenerationStore.getState();
                                            try {
                                                startMultiPlatformOptimization();
                                                const { optimizeForPlatforms } = await import('../services/multiPlatformService');
                                                const optimizations = await optimizeForPlatforms({
                                                    originalText: result.postText,
                                                    originalPlatform: result.platform,
                                                    targetPlatforms: platforms,
                                                    tone: result.metadata.tone,
                                                    hashtags: result.hashtags,
                                                }, user.id);
                                                setMultiPlatformOptimizations(optimizations);
                                                multiPlatformSuccess();
                                                showSuccess(
                                                    `Zoptymalizowano dla ${optimizations.length} platform`,
                                                    optimizations.length < platforms.length
                                                        ? 'Część platform nie powiodła się — pokazujemy dostępne wyniki.'
                                                        : undefined
                                                );
                                                return optimizations;
                                            } catch (error: unknown) {
                                                multiPlatformFailure();
                                                const parsed = parseUserFacingError(error);
                                                showError(parsed.message, parsed.title);
                                                return [];
                                            }
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
                    result={('result' in popover.item) ? (popover.item as CampaignHistoryItem | ScheduledPost).result : { id: popover.item.id, type: popover.item.formData?.generationType, platform: popover.item.formData?.platform, postText: popover.item.formData?.topic || '', hashtags: [], imageUrl: null, videoUrl: null, adHeadline: null, callToAction: null, metadata: { tone: popover.item.formData?.tone, audience: popover.item.formData?.audience, prompt: popover.item.formData?.topic || '' }, approvalStatus: 'draft', comments: [], authorId: popover.item.userId } as unknown as GenerationResult}
                    formData={popover.item.formData}
                    position={{ top: popover.rect.top + popover.rect.height / 2, left: popover.rect.right + 20 }}
                    />
                </Suspense>
            )}
        </div>
    );
};
