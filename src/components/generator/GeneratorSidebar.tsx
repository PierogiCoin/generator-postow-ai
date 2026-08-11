"use client";

import React, { useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/stores/dataStore';
import { useUIStore } from '@/stores/uiStore';
import { useAppHandlers } from '@/hooks/useAppHandlers';
import { useNotifications } from '@/hooks/useNotifications';
import { useConfirm } from '@/hooks/useConfirm';

// Icons
import { ClockIcon } from '@/components/icons/ClockIcon';
import { StarIcon } from '@/components/icons/StarIcon';
import { CalendarIcon } from '@/components/icons/CalendarIcon';
import { ChartBarIcon } from '@/components/icons/ChartBarIcon';
import { CreditCardIcon } from '@/components/icons/CreditCardIcon';
import { XMarkIcon } from '@/components/icons/XMarkIcon';
import { PostIcon } from '@/components/icons/PostIcon';
import { VideoIcon } from '@/components/icons/VideoIcon';
import { DocumentPlusIcon } from '@/components/icons/DocumentPlusIcon';
import { TrashIcon } from '@/components/icons/TrashIcon';
import { SparklesIcon } from '@/components/icons/SparklesIcon';

// Types
import type { CampaignHistoryItem, Draft, ScheduledPost, FavoritePost, GenerationResult } from '@/types';

// Lazy Components for Sidebar Content
const FavoritesList = lazy(() => import('@/components/FavoritesList').then((m) => ({ default: m.FavoritesList })));
const ScheduledPostsList = lazy(() => import('@/components/ScheduledPostsList').then((m) => ({ default: m.ScheduledPostsList })));
const StatsDashboard = lazy(() => import('@/components/StatsDashboard').then((m) => ({ default: m.StatsDashboard })));
const SubscriptionStatus = lazy(() => import('@/components/SubscriptionStatus').then((m) => ({ default: m.SubscriptionStatus })));
import { SkeletonCard } from '@/components/ui/LoadingStates';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PreviewPopover } from '@/components/PreviewPopover';

type SidebarTab = 'history' | 'drafts' | 'favorites' | 'scheduled' | 'stats' | 'subscription';

interface GeneratorSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isMobile: boolean;
}

export function GeneratorSidebar({ isOpen, setIsOpen, isMobile }: GeneratorSidebarProps) {
  const { t } = useTranslation();
  const { user, userPlan } = useAuth();
  
  const {
    history, drafts, favorites, scheduledPosts, stats, isLearningStyle,
    inspiration, selectInspiration, clearHistory, removeFavorite, clearFavorites, removeDraft
  } = useDataStore();
  
  const { setIsPricingModalOpen } = useUIStore();
  const { confirm, confirmDialogProps } = useConfirm();
  
  const notificationSystem = useNotifications();
  const appHandlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification, confirm);

  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('history');
  const [showMoreTabs, setShowMoreTabs] = useState(false);
  const [popover, setPopover] = useState<{ item: CampaignHistoryItem | Draft | ScheduledPost, rect: DOMRect } | null>(null);

  const handleClearHistory = useCallback(async () => {
    const confirmed = await confirm({
        title: t('sidebar.historySection.clearConfirmTitle'),
        message: t('sidebar.historySection.clearConfirmMessage'),
        variant: 'danger',
        confirmLabel: t('sidebar.historySection.clearConfirmAction'),
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

  if (!isOpen) return null;

  return (
    <>
      <ConfirmDialog {...confirmDialogProps} />

      {isOpen && isMobile && (
          <button
              type="button"
              aria-label={t('generatorView.closeSidebar', 'Zamknij bibliotekę')}
              className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
              onClick={() => setIsOpen(false)}
          />
      )}

      <aside
          className="fixed inset-y-0 left-0 z-50 w-[min(340px,92vw)] p-3 sm:p-4 lg:p-0 lg:static lg:z-auto lg:w-[300px] xl:w-[340px] lg:flex-shrink-0 lg:sticky lg:top-8 lg:self-start lg:h-[calc(100vh-8rem)]"
          aria-label={t('sidebar.title', 'Biblioteka')}
      >
          <div className="h-full flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xl lg:shadow-md">
              <div className="p-4 lg:p-5 pb-3 flex-shrink-0 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
                  <h3 className="text-sm font-display font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      <SparklesIcon className="w-4 h-4 text-indigo-500" />
                      {t('sidebar.title', 'Biblioteka')}
                  </h3>
                  <button
                      type="button"
                      onClick={() => setIsOpen(false)}
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

      {popover && (
          <Suspense fallback={null}>
              <PreviewPopover
              result={('result' in popover.item) ? (popover.item as CampaignHistoryItem | ScheduledPost).result : { id: popover.item.id, type: popover.item.formData?.generationType, platform: popover.item.formData?.platform, postText: popover.item.formData?.topic || '', hashtags: [], imageUrl: null, videoUrl: null, adHeadline: null, callToAction: null, metadata: { tone: popover.item.formData?.tone, audience: popover.item.formData?.audience, prompt: popover.item.formData?.topic || '' }, approvalStatus: 'draft', comments: [], authorId: popover.item.userId } as unknown as GenerationResult}
              formData={popover.item.formData}
              position={{ top: popover.rect.top + popover.rect.height / 2, left: popover.rect.right + 20 }}
              />
          </Suspense>
      )}
    </>
  );
}
