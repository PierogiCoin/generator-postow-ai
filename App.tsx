import React, { useEffect, useRef, useState, Suspense, lazy } from 'react';
import { Outlet, Navigate, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Eager — shell pierwszej renderacji
import { Header } from './components/Header';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { MobileBottomNav } from './components/mobile/MobileBottomNav';
import { useConfirm } from './hooks/useConfirm';
import { LayoutDashboard, Sparkles, CalendarDays, BarChart3 } from 'lucide-react';
import { getSupabase } from './services/supabaseClient';
import { socialConnectionsService } from './services/socialConnectionsService';
import { SocialConnection, SocialPlatform } from './types/socialPublishing';
import { NotificationSystem } from './components/NotificationSystem';
import { AppVersionBanner } from './components/AppVersionBanner';
import {
  activateOnboardingGuide,
  isOnboardingDone,
  mapOnboardingToFormData,
  setOnboardingPendingFirstGenerate,
  type OnboardingData,
} from './utils/onboarding';

// Lazy — modale i ciężkie panele ładowane na demand
const ScheduleModal = lazy(() => import('./components/ScheduleModal'));
const PricingModal = lazy(() => import('./components/PricingModal'));
const LoginModal = lazy(() => import('./components/LoginModal'));
const SignUpModal = lazy(() => import('./components/SignUpModal'));
const RepurposeModal = lazy(() => import('./components/RepurposeModal'));
const PublishingProgressModal = lazy(() => import('./components/PublishingProgressModal'));
const SocialConnectionsModal = lazy(() => import('./components/SocialConnectionsModal'));
const OnboardingWizard = lazy(() => import('./components/OnboardingWizard'));
const VeoKeyModal = lazy(() => import('./components/VeoKeyModal'));
const Chatbot = lazy(() => import('./components/Chatbot'));
const ExitIntentPopup = lazy(() => import('./components/ExitIntentPopup'));
const CookieConsent = lazy(() => import('./components/CookieConsent'));
const KeyboardShortcutsModal = lazy(() => import('./components/KeyboardShortcutsModal'));
const BrandVoiceManagerModal = lazy(() => import('./components/BrandVoiceManagerModal'));
const AnalysisModal = lazy(() => import('./components/AnalysisModal'));
const VideoStoryModal = lazy(() => import('./components/VideoStoryModal'));
const SocialHistoryModal = lazy(() => import('./components/SocialHistoryModal'));
const CommandPalette = lazy(() => import('./components/CommandPalette'));

// Error Boundaries
import { SectionErrorBoundary, ModalErrorBoundary } from './components/ErrorBoundary';

// Importy z kontekstów i hooków
import { useAuth } from './contexts/AuthContext';
import { useNotifications } from './hooks/useNotifications';
import { useAppHandlers } from './hooks/useAppHandlers';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Importy store'ów Zustand
import { useUIStore } from './stores/uiStore';
import { useGenerationStore } from './stores/generationStore';
import { useDataStore } from './stores/dataStore';
import { NotificationType, UserPlan } from './types';
import type { VideoStoryStyle, VideoStoryProvider } from './components/VideoStoryModal';
import { parseUserFacingError } from './utils/userFacingError';
import {
  consumePendingCheckoutPlan,
  redirectToSubscriptionCheckout,
} from './services/paymentService';
import { getPlanByUserPlan } from './config/subscriptionPlans';
import { useCreditGuard } from './components/UpgradePrompt';
import { analytics, AnalyticsEvents } from './services/analytics';

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
  const location = useLocation();

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
    const redirectTarget = `${location.pathname}${location.search}`;
    const redirectQuery =
      redirectTarget && redirectTarget !== '/'
        ? `?redirect=${encodeURIComponent(redirectTarget)}`
        : '';
    return <Navigate to={`/${redirectQuery}`} replace />;
  }

  return <Outlet />;
};

export const App: React.FC = () => {
  const { t } = useTranslation();
  const { user, refreshUserCredits } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutHandledRef = useRef<string | null>(null);
  const isHomePage = location.pathname === '/' || location.pathname === '/pricing';
  const { confirm, confirmDialogProps } = useConfirm();
  const redirectAfterLogin = searchParams.get('redirect');
  const safeRedirect =
    redirectAfterLogin &&
    redirectAfterLogin.startsWith('/') &&
    !redirectAfterLogin.startsWith('//')
      ? redirectAfterLogin
      : null;

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

  const { isRepurposeModalOpen, repurposedContent, isRepurposing, repurposeError, lastFormData, isGeneratingVideoStory, videoStoryProgress } = useGenerationStore();
  const { brandVoiceProfiles, activeBrandVoiceId, isLearningStyle, itemToSchedule } = useDataStore();

  // Notification System
  const notificationSystem = useNotifications();

  // Smart upgrade prompts — automatyczne powiadomienia o niskich kredytach
  const creditGuard = useCreditGuard();

  // Business Logic Handlers
  const handlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification, confirm);

  // Local state
  const [generatedVideo, setGeneratedVideo] = useState<{ url: string; thumbnail: string; duration: number } | undefined>();
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
  const [connectionForHistory, setConnectionForHistory] = useState<SocialConnection | null>(null);
  const [isSocialHistoryOpen, setIsSocialHistoryOpen] = useState(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Po udanym logowaniu wróć na chronioną ścieżkę (np. /dashboard)
  useEffect(() => {
    if (!user || !safeRedirect) return;
    navigate(safeRedirect, { replace: true });
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('redirect');
        return next;
      },
      { replace: true }
    );
  }, [user, safeRedirect, navigate, setSearchParams]);

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
        analytics.track(AnalyticsEvents.CHECKOUT_COMPLETED, {
          plan: lastResult.plan,
          credits: lastResult.credits,
          previousPlan: initialPlan,
        });
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


  const handleGenerateVideoStory = async (
    style: VideoStoryStyle,
    provider: VideoStoryProvider = 'auto',
    audioConfig?: {
      trackId: string;
      trackUrl: string;
      volume: number;
      fadeIn: boolean;
      fadeOut: boolean;
    }
  ) => {
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
        (status) => setVideoStoryProgress(status),
        audioConfig
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
      if (!user) throw new Error('Zaloguj się aby połączyć konto');
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
      {creditGuard.prompt}
      {showOnboarding && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <OnboardingWizard onComplete={handleOnboardingComplete} />
        </Suspense>
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

      <main className={`flex-grow mx-auto w-full max-w-7xl ${isHomePage ? 'p-0 pb-0' : 'p-4 lg:p-8 pt-20 pb-20 sm:pb-4'}`}>
        {/* Outlet renders HomeView, DashboardView, GeneratorView, etc. */}
        <SectionErrorBoundary sectionName="Main Content">
          <Outlet />
        </SectionErrorBoundary>
      </main>

      {!isHomePage && (
        <MobileBottomNav
          items={[
            { path: '/dashboard', label: t('nav.dashboard', 'Panel'), icon: <LayoutDashboard className="w-5 h-5" /> },
            { path: '/generator', label: t('nav.generator', 'Generator'), icon: <Sparkles className="w-5 h-5" /> },
            { path: '/calendar', label: t('nav.calendar', 'Kalendarz'), icon: <CalendarDays className="w-5 h-5" /> },
            { path: '/analytics', label: t('nav.analytics', 'Analityka'), icon: <BarChart3 className="w-5 h-5" /> },
          ]}
        />
      )}

      {isHomePage && (
        <Suspense fallback={null}>
          <ExitIntentPopup />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <CookieConsent />
      </Suspense>

      <Suspense fallback={null}>
        {isCommandPaletteOpen && <CommandPalette onClose={() => setIsCommandPaletteOpen(false)} />}
      </Suspense>

      {isVeoKeyModalNeeded && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <ModalErrorBoundary modalName="Veo Key">
            <VeoKeyModal
              onClose={() => setIsVeoKeyModalNeeded(false)}
              onRetry={() => {
                if (lastFormData) {
                  handlers.handleGenerate(lastFormData);
                }
              }}
            />
          </ModalErrorBoundary>
        </Suspense>
      )}

      {/* Modals — lazy, montowane tylko gdy otwarte */}
      {isPublishingModalOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <PublishingProgressModal
            isOpen={isPublishingModalOpen}
            onClose={() => setIsPublishingModalOpen(false)}
            platform={publishingPlatform}
          />
        </Suspense>
      )}

      {isPricingModalOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <ModalErrorBoundary modalName="Pricing">
            <PricingModal
              isOpen={isPricingModalOpen}
              onClose={() => setIsPricingModalOpen(false)}
              onSubscriptionSuccess={handlers.handleClearStats}
              onSignUpRequest={() => {
                setIsPricingModalOpen(false);
                setAuthModal('signup');
              }}
            />
          </ModalErrorBoundary>
        </Suspense>
      )}

      {authModal === 'login' && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <LoginModal
            isOpen={true}
            onClose={() => setAuthModal(null)}
            onSwitchToSignUp={() => setAuthModal('signup')}
            subtitle={
              safeRedirect
                ? t('auth.loginToContinue', 'Zaloguj się, aby kontynuować do wybranej sekcji.')
                : undefined
            }
          />
        </Suspense>
      )}
      {authModal === 'signup' && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <SignUpModal isOpen={true} onClose={() => setAuthModal(null)} onSwitchToLogin={() => setAuthModal('login')} />
        </Suspense>
      )}

      {!!itemToSchedule && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <ScheduleModal
            isOpen={!!itemToSchedule}
            onClose={handlers.handleCloseScheduleModal}
            onConfirm={handlers.handleConfirmSchedule}
            itemToSchedule={itemToSchedule}
          />
        </Suspense>
      )}

      {isRepurposeModalOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <RepurposeModal
            isOpen={isRepurposeModalOpen}
            onClose={handlers.handleCloseRepurposeModal}
            repurposedContent={repurposedContent}
            isRepurposing={isRepurposing}
            error={repurposeError}
            originalPost={useGenerationStore.getState().result}
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
        </Suspense>
      )}

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

      {isSocialConnectionsModalOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <ModalErrorBoundary modalName="Social Connections">
            <SocialConnectionsModal
              isOpen={isSocialConnectionsModalOpen}
              onClose={() => setIsSocialConnectionsModalOpen(false)}
              connections={socialConnections}
              onConnect={handleConnectSocial}
              onDisconnect={handleDisconnectSocial}
              onRefresh={loadSocialConnections}
              onViewHistory={handleViewSocialHistory}
            />
          </ModalErrorBoundary>
        </Suspense>
      )}

      <SectionErrorBoundary sectionName="Chatbot">
        {!isHomePage && (
          <Suspense fallback={null}>
            <Chatbot />
          </Suspense>
        )}
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

      {isKeyboardShortcutsOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <KeyboardShortcutsModal
            isOpen={isKeyboardShortcutsOpen}
            onClose={() => setIsKeyboardShortcutsOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default App;
