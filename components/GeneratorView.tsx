import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

// Zustand Stores & Hooks
import { useGenerationStore } from '../stores/generationStore';
import { useDataStore } from '../stores/dataStore';
import { useUIStore } from '../stores/uiStore';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { useNotifications } from '../hooks/useNotifications';

// Components
import { InputForm } from './InputForm';
import { ResultCard } from './ResultCard';
import { StrategyAssistant } from './StrategyAssistant';
import { FavoritesList } from './FavoritesList';
import { ScheduledPostsList } from './ScheduledPostsList';
import { StatsDashboard } from './StatsDashboard';
import { SubscriptionStatus } from './SubscriptionStatus';
import { MultiPlatformOptimizer } from './MultiPlatformOptimizer';
// UX/UI Components
import { LoadingOverlay, SkeletonCard } from './ui/LoadingStates';
import { showSuccess, showError, showWarning } from '../utils/errorHandler';
import { ClockIcon } from './icons/ClockIcon';
import { StarIcon } from './icons/StarIcon';
import { CalendarIcon } from './icons/CalendarIcon';
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
import { PreviewPopover } from './PreviewPopover';
import { SparklesIcon } from './icons/SparklesIcon';
import { ModernButton } from './ui/ModernButton';


// FIX: Add missing 'ScheduledPost' type to fix 'Cannot find name' errors.
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
    const { setIsPricingModalOpen } = useUIStore();

    const [multiPlatformOptimizations, setMultiPlatformOptimizations] = useState<any>(null);

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

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>, item: CampaignHistoryItem | Draft | ScheduledPost) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPopover({ item, rect });
    };

    const handleMouseLeave = () => {
        setPopover(null);
    };

    const isBrandVoiceEnabled = [UserPlan.Creator, UserPlan.Pro, UserPlan.Agency, UserPlan.Business].includes(userPlan);

    const sidebarTabs = [
        { id: 'history', label: t('sidebar.tabs.history'), icon: ClockIcon },
        { id: 'drafts', label: t('sidebar.tabs.drafts'), icon: DocumentPlusIcon },
        { id: 'favorites', label: t('sidebar.tabs.favorites'), icon: StarIcon },
        { id: 'scheduled', label: t('sidebar.tabs.scheduled'), icon: CalendarIcon },
        { id: 'stats', label: t('sidebar.tabs.stats'), icon: ChartBarIcon },
        ...(user ? [{ id: 'subscription', label: t('sidebar.tabs.subscription'), icon: CreditCardIcon }] : []),
    ];

    const handleReturnToGenerator = () => {
        selectInspiration(null);
        setPrefillData(null);
    };

    const renderActiveTabContent = () => {
        switch (activeSidebarTab) {
            case 'history':
                return (
                    <section className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('sidebar.historySection.title')}</h2>
                            {history.length > 0 && (
                                <button onClick={clearHistory} className="text-xs font-bold text-slate-500 hover:text-red-500 transition-colors uppercase tracking-widest">{t('sidebar.historySection.clear')}</button>
                            )}
                        </div>
                        {history.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400 italic bg-white/5 p-4 rounded-xl border border-white/5">{t('sidebar.historySection.empty')}</p> : (
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
                                            className={`group p-4 rounded-2xl border-2 transition-all cursor-pointer animate-fade-in-up hover:scale-[1.02] active:scale-[0.98] ${isSelected ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-white/40 dark:bg-slate-900/40 border-white/10 dark:border-slate-800 hover:border-blue-400/30 hover:bg-white/60 dark:hover:bg-slate-900/60'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    {item.result.imageUrl
                                                        ? <img src={item.result.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover ring-2 ring-white/10" loading="lazy" />
                                                        : item.result.videoUrl
                                                            ? <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center"><VideoIcon className="w-6 h-6 text-red-500" /></div>
                                                            : <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center"><PostIcon className="w-6 h-6 text-slate-400" /></div>
                                                    }
                                                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${isSelected ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>
                                                        <SparklesIcon className="w-3 h-3" />
                                                    </div>
                                                </div>
                                                <div className="min-w-0 flex-grow">
                                                    <div className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`} title={item.formData?.topic?.replace(/<[^>]*>?/gm, '') || ''}>
                                                        {item.formData?.topic?.replace(/<[^>]*>?/gm, '') || t('common.untitled')}
                                                    </div>
                                                    <p className={`text-[10px] font-black uppercase tracking-widest mt-1 opacity-70 ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
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
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{t('sidebar.draftsSection.title')}</h2>
                        {drafts.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400 italic bg-white/5 p-4 rounded-xl border border-white/5">{t('sidebar.draftsSection.empty')}</p> : (
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {drafts.map((draft, index) => (
                                    <div key={draft.id} style={{ animationDelay: `${index * 50}ms` }} onMouseEnter={(e) => handleMouseEnter(e, draft)} onMouseLeave={handleMouseLeave} className="group p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-white/10 dark:border-slate-800 flex justify-between items-center animate-fade-in-up hover:border-blue-400/30 transition-all">
                                        <div className="min-w-0 flex-grow" onClick={() => selectInspiration(draft as any)} style={{ cursor: 'pointer' }}>
                                            <div className="font-bold text-sm text-slate-900 dark:text-white truncate" title={draft.formData?.topic?.replace(/<[^>]*>?/gm, '') || ''}>
                                                {draft.formData?.topic?.replace(/<[^>]*>?/gm, '') || t('common.untitled')}
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest mt-1 text-slate-500 dark:text-slate-400">{new Date(draft.timestamp).toLocaleDateString()}</p>
                                        </div>
                                        <button onClick={() => removeDraft(draft.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                );
            case 'favorites':
                return <FavoritesList favorites={favorites} inspiration={inspiration as CampaignHistoryItem | FavoritePost | null} onSetInspiration={selectInspiration} onRemove={(id) => removeFavorite(id)} onClear={() => clearFavorites()} onLearnStyle={appHandlers.handleLearnFromFavorites} isLearningStyle={isLearningStyle} />;
            case 'scheduled':
                return <ScheduledPostsList scheduledPosts={scheduledPosts} onDelete={appHandlers.deleteScheduledPost} onEdit={appHandlers.handleEditScheduledPost} onClear={appHandlers.clearScheduledPosts} onHover={handleMouseEnter} onLeave={handleMouseLeave} />;
            case 'stats':
                return <StatsDashboard stats={stats} onClearStats={() => user && appHandlers.handleClearStats()} />;
            case 'subscription':
                return <SubscriptionStatus stats={stats} userPlan={userPlan} onUpgrade={() => setIsPricingModalOpen(true)} />;
            default: return null;
        }
    };

    const isResultVisible = !!result || !!inspiration;

    return (
        <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-140px)]">
            <aside className={`fixed lg:relative inset-y-0 left-0 z-50 transform lg:transform-none transition-all duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0 w-[400px]' : '-translate-x-full w-0'}`}>
                <div className={`h-full flex flex-col glass rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden transition-opacity duration-500 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="p-8 pb-4 flex-shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                                <SidebarIcon className="w-6 h-6 text-indigo-500" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{t('sidebar.title')}</h3>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500"><XMarkIcon className="w-6 h-6" /></button>
                    </div>

                    <div className="px-6 py-4 flex-shrink-0">
                        <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-950/20 rounded-2xl border border-white/5">
                            {sidebarTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveSidebarTab(tab.id as SidebarTab)}
                                    title={tab.label}
                                    className={`relative p-3 rounded-xl transition-all duration-300 flex items-center justify-center group ${activeSidebarTab === tab.id ? 'bg-white shadow-xl text-blue-600 border border-white/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <tab.icon className={`w-5 h-5 transition-transform duration-300 ${activeSidebarTab === tab.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                                    {activeSidebarTab === tab.id && (
                                        <span className="absolute -bottom-1 w-1 h-1 bg-blue-600 rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-8 pt-4 overflow-y-auto flex-grow custom-scrollbar">
                        <div key={activeSidebarTab} className="animate-fade-in">
                            {renderActiveTabContent()}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Loading Overlay with Backdrop Blur */}
            {isLoading && (
                <LoadingOverlay
                    message="Wstukiwanie pomysłów..."
                />
            )}

            <div className="flex-grow">
                {!isSidebarOpen && (
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="fixed bottom-24 left-8 z-[60] w-14 h-14 bg-white/90 dark:bg-slate-900/90 glass border border-white/20 rounded-2xl shadow-2xl flex items-center justify-center text-slate-600 hover:text-blue-600 hover:scale-110 transition-all group animate-bounce-slow"
                    >
                        <SidebarIcon className="w-7 h-7" />
                        <div className="absolute left-full ml-4 px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Otwórz panel boczny
                        </div>
                    </button>
                )}

                <div className={`max-w-7xl mx-auto transition-all duration-500 ease-in-out ${isResultVisible ? 'grid gap-12 lg:grid-cols-[1fr,1.2fr]' : 'flex justify-center'}`}>
                    <div className={`w-full transition-all duration-700 ${isResultVisible ? '' : 'max-w-3xl'}`}>
                        <div className="mb-6">
                            <StrategyAssistant />
                        </div>
                        {inspiration && (
                            <div className="mb-6 flex justify-between items-center p-4 bg-blue-600/10 backdrop-blur-md border border-blue-500/30 rounded-3xl animate-fade-in-down">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500 rounded-xl text-white">
                                        <ClockIcon className="w-5 h-5" />
                                    </div>
                                    <p className="text-sm font-black uppercase tracking-tight text-blue-800 dark:text-blue-300">{t('generatorView.viewingHistory')}</p>
                                </div>
                                <ModernButton onClick={handleReturnToGenerator} variant="secondary" size="sm">
                                    <ArrowUturnLeftIcon className="w-4 h-4 mr-2" /> {t('generatorView.backToGenerator')}
                                </ModernButton>
                            </div>
                        )}
                        <InputForm prefillData={prefillData} onPrefillConsumed={onPrefillConsumed} />
                    </div>

                    {isResultVisible && (
                        <div className="space-y-8 animate-fade-in-right">
                            {isLoading ? (
                                <SkeletonCard />
                            ) : (
                                <ResultCard historyResult={('result' in (inspiration || {})) ? (inspiration as CampaignHistoryItem).result : null} />
                            )}

                            {result && !isLoading && (
                                <div className="glass rounded-[2rem] border border-white/10 shadow-2xl p-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
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
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {popover && (
                <PreviewPopover
                    result={('result' in popover.item) ? (popover.item as CampaignHistoryItem | ScheduledPost).result : { id: popover.item.id, type: popover.item.formData?.generationType, platform: popover.item.formData?.platform, postText: popover.item.formData?.topic || '', hashtags: [], imageUrl: null, videoUrl: null, adHeadline: null, callToAction: null, metadata: { tone: popover.item.formData?.tone, audience: popover.item.formData?.audience }, approvalStatus: 'draft', comments: [], authorId: popover.item.userId } as GenerationResult}
                    formData={popover.item.formData}
                    position={{ top: popover.rect.top + popover.rect.height / 2, left: popover.rect.right + 20 }}
                />
            )}
        </div>
    );
};
