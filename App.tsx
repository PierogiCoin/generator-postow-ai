import React, { useEffect, useRef, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';

// Importy komponentów i serwisów
import { Header } from './components/Header';
import { ScheduleModal } from './components/ScheduleModal';
import { PricingModal } from './components/PricingModal';
import { LoginModal } from './components/LoginModal';
import { SignUpModal } from './components/SignUpModal';
import { RepurposeModal } from './components/RepurposeModal';
import { BrandVoiceManagerModal } from './components/BrandVoiceManagerModal';
import { VisualStudioModal } from './components/VisualStudioModal';
import { PhoneMockup } from './components/PhoneMockup';
import { PublishingProgressModal } from './components/PublishingProgressModal';
import { AnalysisModal } from './components/AnalysisModal';
import { VideoStoryModal } from './components/VideoStoryModal';
import { MultiPlatformOptimizer, PlatformOptimization } from './components/MultiPlatformOptimizer';
import { FilmIcon } from './components/icons/FilmIcon';
import { ModernButton } from './components/ui/ModernButton';
import { SocialConnectionsModal } from './components/SocialConnectionsModal';
import { SocialHistoryModal } from './components/SocialHistoryModal';
import { socialConnectionsService } from './services/socialConnectionsService';
import { SocialConnection, SocialPlatform } from './types/socialPublishing';
import { Chatbot } from './components/Chatbot';
import { NotificationSystem } from './components/NotificationSystem';
import { CommandPalette } from './components/CommandPalette';

// Importy z kontekstów i hooków
import { useAuth } from './contexts/AuthContext';
import { useNotifications } from './hooks/useNotifications';
import { useAppHandlers } from './hooks/useAppHandlers';

// Importy store'ów Zustand
import { useUIStore } from './stores/uiStore';
import { useGenerationStore } from './stores/generationStore';
import { useDataStore } from './stores/dataStore';
import type { GenerationResult } from './types';
import { NotificationType } from './types';

// 1. Ochrona Ścieżek
export const ProtectedRoute = () => {
  const { user } = useAuth();
  const { authModal, setAuthModal } = useUIStore();

  useEffect(() => {
    if (!user && authModal === null) {
      setAuthModal('login');
    }
  }, [user, authModal, setAuthModal]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export const App: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

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

  const { result, isRepurposeModalOpen, repurposedContent, isRepurposing, repurposeError, lastFormData, isGeneratingVideoStory } = useGenerationStore();
  const { brandVoiceProfiles, activeBrandVoiceId, isLearningStyle, itemToSchedule } = useDataStore();

  // Notification System
  const notificationSystem = useNotifications();

  // Business Logic Handlers
  const handlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification);

  // Local refs and state
  const itemToRepurpose = useRef<GenerationResult | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<{ url: string; thumbnail: string; duration: number } | undefined>();
  const [multiPlatformOptimizations, setMultiPlatformOptimizations] = useState<PlatformOptimization[] | null>(null);
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
  const [connectionForHistory, setConnectionForHistory] = useState<SocialConnection | null>(null);
  const [isSocialHistoryOpen, setIsSocialHistoryOpen] = useState(false);

  // Obsługa skrótu klawiszowego dla Palety Komend
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsCommandPaletteOpen]);


  const handleOpenRepurposeModal = (item: GenerationResult) => {
    itemToRepurpose.current = item;
    handlers.handleOpenRepurposeModal();
  }

  const handleGenerateVideoStory = async (style: any) => {
    if (!videoStoryPost || !user) return;

    const { startVideoStoryGeneration, videoStorySuccess, videoStoryFailure } = useGenerationStore.getState();

    try {
      startVideoStoryGeneration();
      const { generateVideoStory } = await import('./services/videoStoryService');
      const videoData = await generateVideoStory(videoStoryPost, style, user.id);
      setGeneratedVideo(videoData);
      videoStorySuccess();
      notificationSystem.addToast('Video story wygenerowane pomyślnie!', NotificationType.Success);
    } catch (error: any) {
      videoStoryFailure();
      notificationSystem.addToast(error.message || 'Błąd generowania video', NotificationType.Error);
    }
  };

  const handleOptimizeMultiPlatform = async (platforms: any[]) => {
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
    } catch (error: any) {
      multiPlatformFailure();
      notificationSystem.addToast(error.message || 'Błąd optymalizacji', NotificationType.Error);
    }
  };

  // --- SOCIAL MEDIA HANDLERS ---

  const loadSocialConnections = async () => {
    if (!user) return;
    try {
      const connections = await socialConnectionsService.getConnections(user.id);
      setSocialConnections(connections);
    } catch (error) {
      console.error('Failed to load social connections:', error);
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
    } catch (error: any) {
      notificationSystem.addToast(error.message || 'Błąd połączenia', NotificationType.Error);
    }
  };

  const handleDisconnectSocial = async (connectionId: string) => {
    if (!user) return;
    try {
      await socialConnectionsService.disconnectConnection(connectionId, user.id);
      notificationSystem.addToast('Konto rozłączone', NotificationType.Success);
      loadSocialConnections();
    } catch (error: any) {
      notificationSystem.addToast(error.message || 'Błąd rozłączania', NotificationType.Error);
    }
  };

  const handleViewSocialHistory = (connection: SocialConnection) => {
    setConnectionForHistory(connection);
    setIsSocialHistoryOpen(true);
  };

  // --- WIDOK GŁÓWNY ---

  return (
    <div className="min-h-screen flex flex-col">
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

      <main className="flex-grow p-4 lg:p-8 pt-24 max-w-full pb-20 sm:pb-4">
        {/* Outlet renders HomeView, DashboardView, GeneratorView, etc. */}
        <Outlet />
      </main>

      {isCommandPaletteOpen && <CommandPalette onClose={() => setIsCommandPaletteOpen(false)} />}

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

      {/* Modals */}
      <PublishingProgressModal
        isOpen={isPublishingModalOpen}
        onClose={() => setIsPublishingModalOpen(false)}
        platform={publishingPlatform}
      />

      <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} onSubscriptionSuccess={handlers.handleClearStats} />
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
        isLearningStyle={isLearningStyle}
      />
      <AnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={handlers.handleCloseAnalysisModal}
        itemToAnalyze={handlers.itemToAnalyze}
        onAnalyze={handlers.handleRunHistoryAnalysis}
        result={handlers.analysisResult}
        isLoading={handlers.isPerformingAnalysis}
        error={handlers.analysisError}
      />
      <VideoStoryModal
        isOpen={isVideoStoryModalOpen}
        onClose={handlers.handleCloseVideoStoryModal}
        post={videoStoryPost}
        onGenerate={handleGenerateVideoStory}
        isGenerating={isGeneratingVideoStory}
        generatedVideo={generatedVideo}
      />
      <VisualStudioModal
        isOpen={false} // Assuming this will be controlled by a state variable not provided in the diff
        onClose={() => { }} // Placeholder
      />

      <SocialConnectionsModal
        isOpen={isSocialConnectionsModalOpen}
        onClose={() => setIsSocialConnectionsModalOpen(false)}
        connections={socialConnections}
        onConnect={handleConnectSocial}
        onDisconnect={handleDisconnectSocial}
        onRefresh={loadSocialConnections}
        onViewHistory={handleViewSocialHistory}
      />

      <Chatbot />

      {user && (
        <SocialHistoryModal
          isOpen={isSocialHistoryOpen}
          onClose={() => setIsSocialHistoryOpen(false)}
          connection={connectionForHistory}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default App;
