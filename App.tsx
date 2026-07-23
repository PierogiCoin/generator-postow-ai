import React, { useEffect, useRef, useState } from 'react';
import { Outlet, Navigate, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Eager — shell pierwszej renderacji
import { Header } from './components/Header';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { useConfirm } from './hooks/useConfirm';
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

// Modale przeniesione do kontenera GlobalModals
import { GlobalModals } from './components/GlobalModals';

// Error Boundaries
import { SectionErrorBoundary } from './components/ErrorBoundary';

// Importy z kontekstów i hooków
import { useAuth } from './contexts/AuthContext';
import { useNotifications } from './hooks/useNotifications';
import { useAppHandlers } from './hooks/useAppHandlers';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Importy store'ów Zustand
import { useUIStore } from './stores/uiStore';
import { useGenerationStore } from './stores/generationStore';
import { NotificationType, UserPlan } from './types';
import type { VideoStoryStyle, VideoStoryProvider } from './components/VideoStoryModal';
import { parseUserFacingError } from './utils/userFacingError';
import {
  consumePendingCheckoutInterval,
  consumePendingCheckoutPlan,
  redirectToSubscriptionCheckout,
} from './services/paymentService';
import { getPlanByUserPlan } from './config/subscriptionPlans';
import { useCreditGuard } from './components/UpgradePrompt';
import { analytics, AnalyticsEvents } from './services/analytics';

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

  // Zustand Stores - Selectors
  const {
    isSocialConnectionsModalOpen,
    videoStoryPost,
    setAuthModal,
    setIsPricingModalOpen,
  } = useUIStore();

  // Notification System
  const notificationSystem = useNotifications();

  // Smart upgrade prompts
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

  // Po udanym logowaniu wróć na chronioną ścieżkę
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
      const pendingInterval = consumePendingCheckoutInterval();
      try {
        await redirectToSubscriptionCheckout(pendingPlan, pendingInterval);
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
    const pendingInterval = consumePendingCheckoutInterval();

    setIsPricingModalOpen(true);
    redirectToSubscriptionCheckout(pendingPlan, pendingInterval).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Nie udało się rozpocząć płatności.';
      notificationSystem.addToast(message, NotificationType.Error);
    });
  }, [user, showOnboarding, setIsPricingModalOpen, notificationSystem]);

  // Powrót ze Stripe Checkout — odśwież plan i kredyty
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

  return (
    <div className="min-h-screen flex flex-col">
      <ConfirmDialog {...confirmDialogProps} />
      <AppVersionBanner />
      {creditGuard.prompt}

      <Header
        onUpgradeClick={() => setIsPricingModalOpen(true)}
        onLoginClick={() => setAuthModal('login')}
        onSignUpClick={() => setAuthModal('signup')}
        isCalendarEnabled={true}
        notificationSystem={
          <NotificationSystem
            notifications={notificationSystem.notifications}
            toasts={notificationSystem.toasts}
            unreadCount={notificationSystem.unreadCount}
            onMarkAsRead={notificationSystem.markAsRead}
            onMarkAllAsRead={notificationSystem.markAllAsRead}
            onClear={notificationSystem.clearNotifications}
            onRemoveToast={notificationSystem.removeToast}
          />
        }
      />

      <main
        className={`flex-grow mx-auto w-full ${
          isHomePage ? 'max-w-none p-0 overflow-x-hidden' : 'max-w-7xl p-4 lg:p-8 pt-20 pb-20 sm:pb-4'
        }`}
      >
        <SectionErrorBoundary sectionName="Main Content">
          <Outlet />
        </SectionErrorBoundary>
      </main>

      <GlobalModals
        isHomePage={isHomePage}
        showOnboarding={showOnboarding}
        safeRedirect={safeRedirect}
        handlers={handlers}
        handleOnboardingComplete={handleOnboardingComplete}
        generatedVideo={generatedVideo}
        handleGenerateVideoStory={handleGenerateVideoStory}
        handleApplyVideoToPost={handleApplyVideoToPost}
        socialConnections={socialConnections}
        handleConnectSocial={handleConnectSocial}
        handleDisconnectSocial={handleDisconnectSocial}
        loadSocialConnections={loadSocialConnections}
        handleViewSocialHistory={handleViewSocialHistory}
        isSocialHistoryOpen={isSocialHistoryOpen}
        setIsSocialHistoryOpen={setIsSocialHistoryOpen}
        connectionForHistory={connectionForHistory}
        isKeyboardShortcutsOpen={isKeyboardShortcutsOpen}
        setIsKeyboardShortcutsOpen={setIsKeyboardShortcutsOpen}
      />
    </div>
  );
};

export default App;
