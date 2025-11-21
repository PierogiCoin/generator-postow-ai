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
import { FavoritesList } from './FavoritesList';
import { ScheduledPostsList } from './ScheduledPostsList';
import { StatsDashboard } from './StatsDashboard';
import { SubscriptionStatus } from './SubscriptionStatus';
import { MultiPlatformOptimizer } from './MultiPlatformOptimizer';
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
                    <section>
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('sidebar.historySection.title')}</h2>
                        {history.length > 0 && (
                          <button onClick={clearHistory} className="text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">{t('sidebar.historySection.clear')}</button>
                        )}
                      </div>
                      {history.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">{t('sidebar.historySection.empty')}</p> : (
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 -mr-2">
                            {history.map((item, index) => {
                                const isSelected = inspiration?.id === item.id;
                                return (
                                    <div key={item.id} style={{ animationDelay: `${index * 50}ms` }} onMouseEnter={(e) => handleMouseEnter(e, item)} onMouseLeave={handleMouseLeave} onClick={() => selectInspiration(item)} className={`p-3 rounded-lg border-2 transition-all cursor-pointer animate-slide-in ${isSelected ? 'bg-slate-200/80 dark:bg-slate-700/50 border-blue-500 shadow-inner' : 'bg-white dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 hover:border-blue-400/50'}`}>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3 min-w-0 flex-grow">
                                                 {item.result.imageUrl ? <img src={item.result.imageUrl} alt="" className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-slate-700" loading="lazy"/> : item.result.videoUrl ? <div className="w-10 h-10 rounded-md bg-red-200 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0"><VideoIcon className="w-5 h-5 text-red-600 dark:text-red-400" /></div> : <div className="w-10 h-10 rounded-md bg-slate-700 flex items-center justify-center flex-shrink-0"><PostIcon className="w-5 h-5 text-slate-500" /></div>}
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-sm text-slate-900 dark:text-white truncate" title={item.formData.topic.replace(/<[^>]*>?/gm, '')}>{item.formData.topic.replace(/<[^>]*>?/gm, '')}</div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.formData.platform} &bull; {new Date(item.timestamp).toLocaleDateString()}</p>
                                                </div>
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
                    <section>
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{t('sidebar.draftsSection.title')}</h2>
                        {drafts.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">{t('sidebar.draftsSection.empty')}</p> : (
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-2 -mr-2">
                                {drafts.map((draft, index) => (
                                    <div key={draft.id} style={{ animationDelay: `${index * 50}ms` }} onMouseEnter={(e) => handleMouseEnter(e, draft)} onMouseLeave={handleMouseLeave} className="p-3 rounded-lg bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 flex justify-between items-center animate-slide-in">
                                        <div className="min-w-0 flex-grow" onClick={() => selectInspiration(draft as any)} style={{ cursor: 'pointer' }}>
                                            <div className="font-semibold text-sm text-slate-900 dark:text-white truncate" title={draft.formData.topic.replace(/<[^>]*>?/gm, '')}>{draft.formData.topic.replace(/<[^>]*>?/gm, '')}</div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(draft.timestamp).toLocaleDateString()}</p>
                                        </div>
                                        <button onClick={() => removeDraft(draft.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-full"><TrashIcon className="w-4 h-4"/></button>
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
        <div className="flex gap-8 h-full">
             <aside className={`fixed lg:relative inset-y-0 left-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg border-r border-slate-200 dark:border-slate-800 transform transition-all duration-300 ease-in-out lg:transform-none lg:rounded-2xl lg:border lg:dark:border-slate-800 ${isSidebarOpen ? 'translate-x-0 w-96' : '-translate-x-full w-96 lg:w-0'}`}>
                <div className={`h-full flex flex-col overflow-hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 delay-150' : 'opacity-0'}`}>
                    <div className="p-4 flex-shrink-0 flex items-center justify-between">
                         <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('sidebar.title')}</h3>
                         <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"><XMarkIcon className="w-6 h-6"/></button>
                    </div>
                    <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800/60 p-4">
                        <div className="flex space-x-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
                             {sidebarTabs.map(tab => (
                                <button key={tab.id} onClick={() => setActiveSidebarTab(tab.id as SidebarTab)} className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${activeSidebarTab === tab.id ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm font-semibold' : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-900/50 font-medium'}`}>
                                    <tab.icon className="w-5 h-5" /><span>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="p-6 overflow-y-auto flex-grow border-t border-slate-200 dark:border-slate-800/60">
                        <div key={activeSidebarTab} className="animate-fade-in" style={{ animationDuration: '300ms' }}>
                            {renderActiveTabContent()}
                        </div>
                    </div>
                </div>
             </aside>

            <div className="flex-grow transition-all duration-300">
                 <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`fixed top-24 left-4 z-50 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 transition-transform duration-300 ${isSidebarOpen ? 'transform translate-x-[368px]' : ''} lg:hidden`}>
                    {isSidebarOpen ? <ArrowLeftIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" /> : <SidebarIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />}
                 </button>

                 <div className={`grid gap-8 w-full max-w-7xl mx-auto transition-all duration-700 ease-in-out ${isResultVisible ? 'lg:grid-cols-[minmax(0,_4fr),minmax(0,_5fr)]' : 'grid-cols-1'}`}>
                    <div className={`transition-opacity duration-500 ${isResultVisible ? 'lg:order-1' : 'lg:order-1'}`}>
                        {inspiration && (
                            <div className="mb-4 flex justify-between items-center p-3 bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">{t('generatorView.viewingHistory')}</p>
                                <button onClick={handleReturnToGenerator} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-md hover:bg-blue-500 transition">
                                    <ArrowUturnLeftIcon className="w-4 h-4"/> {t('generatorView.backToGenerator')}
                                </button>
                            </div>
                        )}
                        <InputForm prefillData={prefillData} onPrefillConsumed={onPrefillConsumed} />
                    </div>
                    <div className={`transition-opacity duration-500 ${isResultVisible ? 'lg:order-2' : 'lg:order-2'} space-y-6`}>
                        <ResultCard historyResult={('result' in (inspiration || {})) ? (inspiration as CampaignHistoryItem).result : null} />
                        
                        {result && !isLoading && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border border-slate-200 dark:border-slate-700">
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
                </div>
            </div>
            {popover && (
                <PreviewPopover 
                    result={('result' in popover.item) ? (popover.item as CampaignHistoryItem | ScheduledPost).result : { id: popover.item.id, type: popover.item.formData.generationType, platform: popover.item.formData.platform, postText: popover.item.formData.topic, hashtags: [], imageUrl: null, videoUrl: null, adHeadline: null, callToAction: null, metadata: { tone: popover.item.formData.tone, audience: popover.item.formData.audience }, approvalStatus: 'draft', comments: [], authorId: popover.item.userId } as GenerationResult}
                    formData={popover.item.formData}
                    position={{ top: popover.rect.top + popover.rect.height / 2, left: popover.rect.right + 10 }}
                />
            )}
        </div>
    );
};
