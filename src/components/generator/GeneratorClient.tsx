"use client";

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

// Zustand Stores & Hooks
import { useGenerationStore } from '@/stores/generationStore';
import { useDataStore } from '@/stores/dataStore';
import { useUIStore } from '@/stores/uiStore';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppHandlers } from '@/hooks/useAppHandlers';
import { useConfirm } from '@/hooks/useConfirm';
import { isOnboardingGuideActive, consumeOnboardingPrefill } from '@/utils/onboarding';
import { showSuccess, showError } from '@/utils/errorHandler';
import { parseUserFacingError } from '@/utils/userFacingError';

import type { PlatformOptimization } from '@/components/MultiPlatformOptimizer';
import type {
  CalendarSlotContext,
  FormData,
  GenerationResult,
  CampaignHistoryItem,
  FavoritePost,
  Draft,
} from '@/types';
import { NotificationType } from '@/types';

import { GeneratorSidebar } from '@/components/generator/GeneratorSidebar';
import { LoadingOverlay, SkeletonCard } from '@/components/ui/LoadingStates';
import { SidebarIcon } from '@/components/icons/SidebarIcon';
import { ArrowUturnLeftIcon } from '@/components/icons/ArrowUturnLeftIcon';
import { ClockIcon } from '@/components/icons/ClockIcon';
import { ModernButton } from '@/components/ui/ModernButton';
import { OnboardingGuide } from '@/components/OnboardingGuide';
import { CalendarSlotBanner } from '@/components/calendar/CalendarSlotBanner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

import dynamic from 'next/dynamic';

const InputForm = dynamic(
  () => import('@/components/InputForm').then((m) => m.InputForm),
  { loading: () => <SkeletonCard /> }
);
const ResultCard = dynamic(
  () => import('@/components/ResultCard').then((m) => m.ResultCard),
  { loading: () => <SkeletonCard /> }
);
const MultiPlatformOptimizer = dynamic(
  () => import('@/components/MultiPlatformOptimizer').then((m) => m.MultiPlatformOptimizer),
  { loading: () => <SkeletonCard /> }
);

function inspirationResult(
  inspiration: CampaignHistoryItem | FavoritePost | Draft | null
): GenerationResult | null {
  if (!inspiration || !('result' in inspiration)) return null;
  return inspiration.result;
}

export function GeneratorClient() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { history, favorites, inspiration, selectInspiration } = useDataStore();
  const { result, isLoading, isOptimizingMultiPlatform, generationProgress, pendingCalendarSlot, calendarBatchQueue, calendarBatchTotal, setPendingCalendarSlot } = useGenerationStore();
  const { setIsSocialConnectionsModalOpen } = useUIStore();
  
  const notificationSystem = useNotifications();
  const appHandlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification);
  const { confirm, confirmDialogProps } = useConfirm();

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth > 1024);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  const [mobilePanel, setMobilePanel] = useState<'form' | 'result'>('form');

  const [prefillData, setPrefillData] = useState<Partial<FormData> | null>(null);
  const [autoGenerateSlot, setAutoGenerateSlot] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const fromOnboarding = consumeOnboardingPrefill(user.id);
    if (fromOnboarding) setPrefillData(fromOnboarding);
  }, [user?.id]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onBreakpoint = (e: MediaQueryListEvent) => {
      if (!e.matches) {
        setIsSidebarOpen(false);
        return;
      }
      const hasResult = Boolean(useGenerationStore.getState().result);
      setIsSidebarOpen(!hasResult);
    };
    mq.addEventListener('change', onBreakpoint);
    return () => mq.removeEventListener('change', onBreakpoint);
  }, []);

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

  // Next.js: Parsing SearchParams for Prefill and CalendarSlot
  useEffect(() => {
    if (!searchParams) return;
    
    // We check URL params for initial prefill
    const topic = searchParams.get('topic');
    const niche = searchParams.get('niche');
    const audience = searchParams.get('audience');
    const inspirationId = searchParams.get('inspirationId');

    if (inspirationId) {
        const item = history.find(h => h.id === inspirationId);
        if (item) {
            selectInspiration(item);
        }
    } else if (topic || niche || audience) {
        setPrefillData({
            ...(topic ? { topic } : {}),
            ...(audience ? { audience } : {}),
            // Note: actual mapping of niche to pack is handled in NicheContext
        });
    }

    // Since complex calendar objects cannot be safely passed in URL, they are usually loaded via state/Zustand directly.
    // If we need to read from state where Calendar sent it:
    // This assumes the Calendar component sets `pendingCalendarSlot` directly in Zustand before navigating.
  }, [searchParams, history, selectInspiration]);

  useEffect(() => {
    if (inspiration?.formData) {
      setPrefillData(inspiration.formData);
    }
  }, [inspiration]);

  const onPrefillConsumed = () => setPrefillData(null);

  const showOnboardingGuide = Boolean(user && isOnboardingGuideActive(user.id));
  const isResultVisible = !!result || !!inspiration;
  const showFormColumn = !isResultVisible || !isMobile || mobilePanel === 'form';
  const showResultColumn = isResultVisible && (!isMobile || mobilePanel === 'result');

  const handleReturnToGenerator = useCallback(() => {
    selectInspiration(null);
    setPrefillData(null);
  }, [selectInspiration]);

  const [multiPlatformOptimizations, setMultiPlatformOptimizations] = useState<PlatformOptimization[] | null>(null);

  return (
    <div className="flex flex-col lg:flex-row gap-6 xl:gap-8 min-h-[calc(100vh-140px)] relative bg-transparent animate-fade-in pb-16">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          <div className="absolute top-[10%] left-[5%] w-96 h-96 bg-fuchsia-500/[0.03] rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] opacity-0" />
      </div>

      <ConfirmDialog {...confirmDialogProps} />

      <GeneratorSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} isMobile={isMobile} />

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

          <div className={`w-full transition-all duration-300 ${isResultVisible && !isMobile ? 'page-work-grid page-work-grid-equal' : ''}`}>
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
                  <div id="generation-result" className="space-y-5 animate-fade-in content-auto lg:sticky lg:top-8 self-start min-w-0">
                      {isLoading ? (
                          <SkeletonCard />
                      ) : (
                          <Suspense fallback={<SkeletonCard />}>
                              <ResultCard historyResult={inspirationResult(inspiration)} />
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
                                          const { optimizeForPlatforms } = await import('@/services/multiPlatformService');
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
                                              t('generatorView.optimizedFor', { count: optimizations.length }),
                                              optimizations.length < platforms.length
                                                  ? t('generatorView.partialOptimization')
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
    </div>
  );
}
