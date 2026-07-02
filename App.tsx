import React, { useEffect, useRef, useState, Suspense, lazy } from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';

// Importy komponentów i serwisów - EAGER (krytyczne dla pierwszego renderu)
import { Header } from './components/Header';
import { ScheduleModal } from './components/ScheduleModal';
import { PricingModal } from './components/PricingModal';
import { LoginModal } from './components/LoginModal';
import { SignUpModal } from './components/SignUpModal';
import { RepurposeModal } from './components/RepurposeModal';
import { PublishingProgressModal } from './components/PublishingProgressModal';
import { SocialConnectionsModal } from './components/SocialConnectionsModal';
import { OnboardingWizard, isOnboardingDone } from './components/OnboardingWizard';
import type { OnboardingData } from './components/OnboardingWizard';
import { activateOnboardingGuide, mapOnboardingToFormData, setOnboardingPendingFirstGenerate } from './utils/onboarding';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { useConfirm } from './hooks/useConfirm';
import { getSupabase } from './services/supabaseClient';
import { MultiPlatformOptimizer, PlatformOptimization } from './components/MultiPlatformOptimizer';
import { FilmIcon } from './components/icons/FilmIcon';
import { ModernButton } from './components/ui/ModernButton';
import { socialConnectionsService } from './services/socialConnectionsService';
import { SocialConnection, SocialPlatform } from './types/socialPublishing';
import { Chatbot } from './components/Chatbot';
import { NotificationSystem } from './components/NotificationSystem';
import { AppVersionBanner } from './components/AppVersionBanner';

// LAZY LOADED MODALS - ładowane na demand, redukują initial bundle
const BrandVoiceManagerModal = lazy(() => import('./components/BrandVoiceManagerModal'));
const AnalysisModal = lazy(() => import('./components/AnalysisModal'));
const VideoStoryModal = lazy(() => import('./components/VideoStoryModal'));
const SocialHistoryModal = lazy(() => import('./components/SocialHistoryModal'));
const CommandPalette = lazy(() => import('./components/CommandPalette'));
const PhoneMockup = lazy(() => import('./components/PhoneMockup'));

// Error Boundaries
import { SectionErrorBoundary, ModalErrorBoundary } from './components/ErrorBoundary';

// Importy z kontekstów i hooków
import { useAuth } from './contexts/AuthContext';
import { useNotifications } from './hooks/useNotifications';
import { useAppHandlers } from './hooks/useAppHandlers';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';

// Importy store'ów Zustand
import { useUIStore } from './stores/uiStore';
import { useGenerationStore } from './stores/generationStore';
import { useDataStore } from './stores/dataStore';
import type { GenerationResult, Platform } from './types';
import { NotificationType, UserPlan } from './types';
import type { VideoStoryStyle, VideoStoryProvider } from './components/VideoStoryModal';
import { parseUserFacingError } from './utils/userFacingError';
import {
  consumePendingCheckoutPlan,
  redirectToSubscriptionCheckout,
} from './services/paymentService';
import { getPlanByUserPlan } from './config/subscriptionPlans';

// Loading fallback dla lazy-loaded modali
const ModalLoadingFallback: React.FC = () => (
  <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-[100]">
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl flex items-center gap-3">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Ładowanie...</span>
    </div>
  </div>
);

// 1. Ochrona Ścieżek
export const ProtectedRoute = () => {
  const { user, authLoading } = useAuth();
  const { authModal, setAuthModal } = useUIStore();

  useEffect(() => {
    if (!authLoading && !user && authModal === null) {
      setAuthModal('login');
    }
  }, [user, authLoading, authModal, setAuthModal]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium animate-pulse">Łączenie z bazą danych...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export const App: React.FC = () => {
  const { t } = useTranslation();
  const { user, refreshUserCredits } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const checkoutHandledRef = useRef<string | null>(null);
  const isHomePage = location.pathname === '/' || location.pathname === '/pricing';
  const { confirm, confirmDialogProps } = useConfirm();

  // Zustand Stores - Selectors first for stability
  const {
    isPricingModalOpen,
    authModal,
    isBrandVoiceManagerOpen,
    isAnalysisModalOpen,
    isVeoKeyModalNeeded,
    isCommandPaletteOpen,
    isVideoStoryModalOpen,
    isSocialConnectionsModalOpen,
    isPublishingModalOpen,
    publishingPlatform,
    videoStoryPost,
    setAuthModal,
    setIsPricingModalOpen,
    setIsBrandVoiceManagerOpen,
    setIsVeoKeyModalNeeded,
    setIsCommandPaletteOpen,
    setIsSocialConnectionsModalOpen,
    setIsPublishingModalOpen
  } = useUIStore();

  const { result, isRepurposeModalOpen, repurposedContent, isRepurposing, repurposeError, lastFormData, isGeneratingVideoStory, videoStoryProgress } = useGenerationStore();
  const { brandVoiceProfiles, activeBrandVoiceId, isLearningStyle, itemToSchedule } = useDataStore();

  // Notification System
  const notificationSystem = useNotifications();

  // Business Logic Handlers
  const handlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification, confirm);

  // Local refs and state
  const itemToRepurpose = useRef<GenerationResult | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<{ url: string; thumbnail: string; duration: number } | undefined>();
  const [multiPlatformOptimizations, setMultiPlatformOptimizations] = useState<PlatformOptimization[] | null>(null);
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
  const [connectionForHistory, setConnectionForHistory] = useState<SocialConnection | null>(null);
  const [isSocialHistoryOpen, setIsSocialHistoryOpen] = useState(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) {
      setShowOnboarding(false);
      return;
    }

    if (isOnboardingDone(user.id)) return;

    const checkProfileOnboarding = async () => {
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from('profiles')
          .select('onboarding_done')
          .eq('id', user.id)
          .maybeSingle();

        if (data?.onboarding_done) {
          const { markOnboardingDone } = await import('./utils/onboarding');
          markOnboardingDone(user.id);
          return;
        }
        setShowOnboarding(true);
      } catch {
        setShowOnboarding(true);
      }
    };

    checkProfileOnboarding();
  }, [user]);

  const handleOnboardingComplete = async (data: OnboardingData) => {
    setShowOnboarding(false);
    if (user) {
      activateOnboardingGuide(user.id);
      setOnboardingPendingFirstGenerate(user.id);
    }

    const pendingPlan = consumePendingCheckoutPlan();
    if (pendingPlan) {
      try {
        await redirectToSubscriptionCheckout(pendingPlan);
        return;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Nie udało się rozpocząć płatności.';
        notificationSystem.addToast(message, NotificationType.Error);
      }
    }

    navigate('/generator', {
      state: {
        prefillData: mapOnboardingToFormData(data),
        showOnboardingGuide: true,
      },
    });
    notificationSystem.addToast('Profil skonfigurowany! Wygeneruj pierwszy post.', NotificationType.Success);
  };

  // Po zalogowaniu — dokończ checkout jeśli użytkownik wybrał plan przed rejestracją
  useEffect(() => {
    if (!user || showOnboarding) return;
    if (!isOnboardingDone(user.id)) return;

    const pendingPlan = consumePendingCheckoutPlan();
    if (!pendingPlan) return;

    setIsPricingModalOpen(true);
    redirectToSubscriptionCheckout(pendingPlan).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Nie udało się rozpocząć płatności.';
      notificationSystem.addToast(message, NotificationType.Error);
    });
  }, [user, showOnboarding, setIsPricingModalOpen, notificationSystem]);

  // Powrót ze Stripe Checkout — odśwież plan i kredyty (webhook może przyjść z opóźnieniem)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('checkout') !== 'success') return;
    if (!user) return;

    const sessionId = params.get('session_id') || `checkout-${Date.now()}`;
    if (checkoutHandledRef.current === sessionId) return;
    checkoutHandledRef.current = sessionId;

    const initialCredits = user.credits ?? 0;
    const initialPlan = user.plan;

    window.history.replaceState({}, '', location.pathname);

    let cancelled = false;

    (async () => {
      const delays = [0, 2000, 5000, 10000];
      let lastResult: { credits: number; plan: UserPlan } | null = null;

      for (const delay of delays) {
        if (cancelled) return;
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        lastResult = await refreshUserCredits();
        if (
          lastResult &&
          (lastResult.credits !== initialCredits || lastResult.plan !== initialPlan)
        ) {
          break;
        }
      }

      if (cancelled) return;

      if (
        lastResult &&
        (lastResult.credits !== initialCredits || lastResult.plan !== initialPlan)
      ) {
        notificationSystem.addToast(
          `Płatność zakończona! Plan: ${getPlanByUserPlan(lastResult.plan).namePl}, kredyty: ${lastResult.credits.toLocaleString('pl-PL')}.`,
          NotificationType.Success,
          8000
        );
      } else {
        notificationSystem.addToast(
          'Płatność przyjęta! Kredyty i plan zaktualizują się po potwierdzeniu Stripe (zwykle do minuty).',
          NotificationType.Success,
          8000
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.search, location.pathname, user, refreshUserCredits, notificationSystem]);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();
  
  // Handler for '?' key to open keyboard shortcuts modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && e.shiftKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsKeyboardShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  const handleOpenRepurposeModal = (item: GenerationResult) => {
    itemToRepurpose.current = item;
    handlers.handleOpenRepurposeModal();
  }

  const handleGenerateVideoStory = async (style: VideoStoryStyle, provider: VideoStoryProvider = 'auto') => {
    if (!videoStoryPost || !user) return;

    const { startVideoStoryGeneration, setVideoStoryProgress, videoStorySuccess, videoStoryFailure } = useGenerationStore.getState();

    try {
      startVideoStoryGeneration();
      const { generateVideoStory } = await import('./services/videoStoryService');
      const videoData = await generateVideoStory(
        videoStoryPost,
        style,
        user.id,
        provider,
        (status) => setVideoStoryProgress(status)
      );
      setGeneratedVideo(videoData);
      videoStorySuccess();

      const providerLabel = videoData.provider || 'Auto';
      notificationSystem.addToast(
        t('videoStory.successMessage', 'Wideo wygenerowane pomyślnie!'),
        NotificationType.Success,
        5000,
        { title: t('videoStory.successTitle', 'Gotowe'), action: providerLabel }
      );

      const used = (videoData.provider || '').toLowerCase();
      if (provider === 'veo' && used && !used.includes('veo')) {
        notificationSystem.addToast(
          t('videoStory.fallbackMessage', 'Veo było niedostępne — użyto alternatywnego silnika.'),
          NotificationType.Info,
          8000,
          {
            title: t('videoStory.fallbackTitle', 'Zmiana silnika wideo'),
            action: providerLabel,
          }
        );
      }
    } catch (error: unknown) {
      const parsed = parseUserFacingError(error, t, 'errors.generation_failed');
      videoStoryFailure();
      notificationSystem.addToast(parsed.message, NotificationType.Error, 8000, {
        title: parsed.title,
        action: parsed.action,
      });
    }
  };

  const handleApplyVideoToPost = () => {
    if (!generatedVideo || !videoStoryPost) return;
    useGenerationStore.getState().setResult({
      ...videoStoryPost,
      videoUrl: generatedVideo.url,
    });
    notificationSystem.addToast(t('videoStory.applied', 'Wideo przypisane do posta!'), NotificationType.Success);
    handlers.handleCloseVideoStoryModal();
  };

  const handleOptimizeMultiPlatform = async (platforms: Platform[]) => {
    if (!result || !user) return;

    const { startMultiPlatformOptimization, multiPlatformSuccess, multiPlatformFailure } = useGenerationStore.getState();

    try {
      startMultiPlatformOptimization();
      const { optimizeForPlatforms } = await import('./services/multiPlatformService');
      const optimizations = await optimizeForPlatforms({
        originalText: result.postText,
        originalPlatform: result.platform,
        targetPlatforms: platforms,
        tone: result.metadata.tone,
        hashtags: result.hashtags
      }, user.id);
      setMultiPlatformOptimizations(optimizations);
      multiPlatformSuccess();
      notificationSystem.addToast('Zoptymalizowano dla wybranych platform!', NotificationType.Success);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd optymalizacji';
      multiPlatformFailure();
      notificationSystem.addToast(errorMessage, NotificationType.Error);
    }
  };

  // --- SOCIAL MEDIA HANDLERS ---

  const loadSocialConnections = async () => {
    if (!user) return;
    try {
      const connections = await socialConnectionsService.getConnections(user.id);
      setSocialConnections(connections);
    } catch (error) {
      // Error logged by notification system
    }
  };

  useEffect(() => {
    if (user && isSocialConnectionsModalOpen) {
      loadSocialConnections();
    }
  }, [user, isSocialConnectionsModalOpen]);

  const handleConnectSocial = async (platform: SocialPlatform) => {
    try {
      if (!user) throw new Error('Zaloguj się aby połączyć knto');
      const authUrl = await socialConnectionsService.getAuthUrl(platform, user.id);
      window.location.href = authUrl;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd połączenia';
      notificationSystem.addToast(errorMessage, NotificationType.Error);
    }
  };

  const handleDisconnectSocial = async (connectionId: string) => {
    if (!user) return;
    try {
      await socialConnectionsService.disconnectConnection(connectionId, user.id);
      notificationSystem.addToast('Konto rozłączone', NotificationType.Success);
      loadSocialConnections();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd rozłączania';
      notificationSystem.addToast(errorMessage, NotificationType.Error);
    }
  };

  const handleViewSocialHistory = (connection: SocialConnection) => {
    setConnectionForHistory(connection);
    setIsSocialHistoryOpen(true);
  };

  // --- WIDOK GŁÓWNY ---

  return (
    <div className="min-h-screen flex flex-col">
      <ConfirmDialog {...confirmDialogProps} />
      <AppVersionBanner />
      {showOnboarding && (
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      )}
      <Header
        onUpgradeClick={() => setIsPricingModalOpen(true)}
        onLoginClick={() => setAuthModal('login')}
        onSignUpClick={() => setAuthModal('signup')}
        isCalendarEnabled={true}
        notificationSystem={<NotificationSystem
          notifications={notificationSystem.notifications}
          toasts={notificationSystem.toasts}
          unreadCount={notificationSystem.unreadCount}
          onMarkAsRead={notificationSystem.markAsRead}
          onMarkAllAsRead={notificationSystem.markAllAsRead}
          onClear={notificationSystem.clearNotifications}
          onRemoveToast={notificationSystem.removeToast}
        />}
      />

      <main className={`flex-grow max-w-full ${isHomePage ? 'p-0 pt-20 pb-0' : 'p-4 lg:p-8 pt-24 pb-20 sm:pb-4'}`}>
        {/* Outlet renders HomeView, DashboardView, GeneratorView, etc. */}
        <SectionErrorBoundary sectionName="Main Content">
          <Outlet />
        </SectionErrorBoundary>
      </main>

      <Suspense fallback={null}>
        {isCommandPaletteOpen && <CommandPalette onClose={() => setIsCommandPaletteOpen(false)} />}
      </Suspense>

      {isVeoKeyModalNeeded && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] animate-fade-in">
          <div className="bg-white/90 dark:bg-slate-900/90 border border-white/20 dark:border-slate-800 rounded-3xl shadow-2xl p-8 w-full max-w-md m-4 glass animate-scale-in relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />

            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <FilmIcon className="w-6 h-6 text-blue-500" />
              </div>
              {t('videoKeyModal.title')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
              <Trans i18nKey="videoKeyModal.description">
                Generowanie wideo Veo wymaga wybrania klucza API, dla którego włączono płatności.
                Więcej informacji znajdziesz w <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-500 font-bold hover:underline">dokumentacji płatności</a>.
              </Trans>
            </p>
            <div className="mt-8 flex justify-end">
              <ModernButton
                onClick={async () => {
                  setIsVeoKeyModalNeeded(false);
                  if (lastFormData) {
                    handlers.handleGenerate(lastFormData);
                  }
                }}
                variant="gradient"
                size="md"
                className="px-8"
              >
                {t('videoKeyModal.button')}
              </ModernButton>
            </div>
          </div>
        </div>
      )}

      {/* Modals - Critical (eager loaded) */}
      <PublishingProgressModal
        isOpen={isPublishingModalOpen}
        onClose={() => setIsPublishingModalOpen(false)}
        platform={publishingPlatform}
      />

      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        onSubscriptionSuccess={handlers.handleClearStats}
        onSignUpRequest={() => {
          setIsPricingModalOpen(false);
          setAuthModal('signup');
        }}
      />
      {authModal === 'login' && <LoginModal isOpen={true} onClose={() => setAuthModal(null)} onSwitchToSignUp={() => setAuthModal('signup')} />}
      {authModal === 'signup' && <SignUpModal isOpen={true} onClose={() => setAuthModal(null)} onSwitchToLogin={() => setAuthModal('login')} />}
      <ScheduleModal
        isOpen={!!itemToSchedule}
        onClose={handlers.handleCloseScheduleModal}
        onConfirm={handlers.handleConfirmSchedule}
        itemToSchedule={itemToSchedule}
      />
      <RepurposeModal
        isOpen={isRepurposeModalOpen}
        onClose={handlers.handleCloseRepurposeModal}
        repurposedContent={repurposedContent}
        isRepurposing={isRepurposing}
        error={repurposeError}
        originalPost={itemToRepurpose.current}
        onUse={(content) => {
          const currentResult = useGenerationStore.getState().result;
          if (currentResult) {
            const newText = typeof content === 'string'
              ? content
              : `${content.title}\n\n${content.text}${content.visualIdea ? `\n\n[Pomysł na wizualizację: ${content.visualIdea}]` : ''}`;
            const updatedResult = { ...currentResult, postText: newText };
            handlers.handleSetResult(updatedResult);
          }
          handlers.handleCloseRepurposeModal();
        }}
      />
      {/* Modals - Lazy Loaded with Suspense */}
      <Suspense fallback={<ModalLoadingFallback />}>
        {isBrandVoiceManagerOpen && (
          <ModalErrorBoundary modalName="Brand Voice Manager">
            <BrandVoiceManagerModal
              isOpen={isBrandVoiceManagerOpen}
              onClose={() => setIsBrandVoiceManagerOpen(false)}
              profiles={brandVoiceProfiles}
              onSave={handlers.handleSaveBrandVoiceProfile}
              onDelete={handlers.handleDeleteBrandVoiceProfile}
              onSetActive={handlers.handleSetActiveBrandVoice}
              activeId={activeBrandVoiceId}
              onLearnFromFavorites={handlers.handleLearnFromFavorites}
              onLearnFromHistory={handlers.handleLearnFromHistory}
              onLearnFromCompetitors={handlers.handleLearnFromCompetitors}
              onExtractFromUrl={handlers.handleExtractFromUrl}
              isLearningStyle={isLearningStyle}
            />
          </ModalErrorBoundary>
        )}
      </Suspense>
      <Suspense fallback={<ModalLoadingFallback />}>
        {isAnalysisModalOpen && (
          <ModalErrorBoundary modalName="Analysis">
            <AnalysisModal
              isOpen={isAnalysisModalOpen}
              onClose={handlers.handleCloseAnalysisModal}
              itemToAnalyze={handlers.itemToAnalyze}
              onAnalyze={handlers.handleRunHistoryAnalysis}
              result={handlers.analysisResult}
              isLoading={handlers.isPerformingAnalysis}
              error={handlers.analysisError}
            />
          </ModalErrorBoundary>
        )}
      </Suspense>
      <Suspense fallback={<ModalLoadingFallback />}>
        {isVideoStoryModalOpen && (
          <ModalErrorBoundary modalName="Video Story">
            <VideoStoryModal
              isOpen={isVideoStoryModalOpen}
              onClose={handlers.handleCloseVideoStoryModal}
              onApplyToPost={handleApplyVideoToPost}
              post={videoStoryPost}
              onGenerate={handleGenerateVideoStory}
              isGenerating={isGeneratingVideoStory}
              progressStatus={videoStoryProgress}
              generatedVideo={generatedVideo}
            />
          </ModalErrorBoundary>
        )}
      </Suspense>

      <SocialConnectionsModal
        isOpen={isSocialConnectionsModalOpen}
        onClose={() => setIsSocialConnectionsModalOpen(false)}
        connections={socialConnections}
        onConnect={handleConnectSocial}
        onDisconnect={handleDisconnectSocial}
        onRefresh={loadSocialConnections}
        onViewHistory={handleViewSocialHistory}
      />

      <SectionErrorBoundary sectionName="Chatbot">
        {!isHomePage && <Chatbot />}
      </SectionErrorBoundary>

      <Suspense fallback={<ModalLoadingFallback />}>
        {user && isSocialHistoryOpen && (
          <ModalErrorBoundary modalName="Social History">
            <SocialHistoryModal
              isOpen={isSocialHistoryOpen}
              onClose={() => setIsSocialHistoryOpen(false)}
              connection={connectionForHistory}
              userId={user.id}
            />
          </ModalErrorBoundary>
        )}
      </Suspense>

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsModal
        isOpen={isKeyboardShortcutsOpen}
        onClose={() => setIsKeyboardShortcutsOpen(false)}
      />
    </div>
  );
};

export default App;
