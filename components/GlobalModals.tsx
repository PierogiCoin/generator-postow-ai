import React, { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { ModalErrorBoundary } from './ErrorBoundary';
import { useUIStore } from '../stores/uiStore';
import { useGenerationStore } from '../stores/generationStore';
import { useDataStore } from '../stores/dataStore';
import { useAuth } from '../contexts/AuthContext';
import { SocialConnection, SocialPlatform } from '../types/socialPublishing';
import type { VideoStoryStyle, VideoStoryProvider } from './VideoStoryModal';
import type { OnboardingData } from '../utils/onboarding';

// Lazy-loaded modale
const ScheduleModal = lazy(() => import('./ScheduleModal'));
const PricingModal = lazy(() => import('./PricingModal'));
const LoginModal = lazy(() => import('./LoginModal'));
const SignUpModal = lazy(() => import('./SignUpModal'));
const RepurposeModal = lazy(() => import('./RepurposeModal'));
const PublishingProgressModal = lazy(() => import('./PublishingProgressModal'));
const SocialConnectionsModal = lazy(() => import('./SocialConnectionsModal'));
const OnboardingWizard = lazy(() => import('./OnboardingWizard'));
const VeoKeyModal = lazy(() => import('./VeoKeyModal'));
const ExitIntentPopup = lazy(() => import('./ExitIntentPopup'));
const CookieConsent = lazy(() => import('./CookieConsent'));
const KeyboardShortcutsModal = lazy(() => import('./KeyboardShortcutsModal'));
const BrandVoiceManagerModal = lazy(() => import('./BrandVoiceManagerModal'));
const AnalysisModal = lazy(() => import('./AnalysisModal'));
const VideoStoryModal = lazy(() => import('./VideoStoryModal'));
const SocialHistoryModal = lazy(() => import('./SocialHistoryModal'));
const CommandPalette = lazy(() => import('./CommandPalette'));

const ModalLoadingFallback: React.FC = () => (
  <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-[100]">
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl flex items-center gap-3">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Ładowanie...</span>
    </div>
  </div>
);

export interface GlobalModalsProps {
  isHomePage: boolean;
  showOnboarding: boolean;
  safeRedirect: string | null;
  handlers: any;
  handleOnboardingComplete: (data: OnboardingData) => void;
  generatedVideo?: { url: string; thumbnail: string; duration: number };
  handleGenerateVideoStory: (
    style: VideoStoryStyle,
    provider?: VideoStoryProvider,
    audioConfig?: any
  ) => Promise<void>;
  handleApplyVideoToPost: () => void;
  socialConnections: SocialConnection[];
  handleConnectSocial: (platform: SocialPlatform) => Promise<void>;
  handleDisconnectSocial: (connectionId: string) => Promise<void>;
  loadSocialConnections: () => Promise<void>;
  handleViewSocialHistory: (connection: SocialConnection) => void;
  isSocialHistoryOpen: boolean;
  setIsSocialHistoryOpen: (open: boolean) => void;
  connectionForHistory: SocialConnection | null;
  isKeyboardShortcutsOpen: boolean;
  setIsKeyboardShortcutsOpen: (open: boolean) => void;
}

export const GlobalModals: React.FC<GlobalModalsProps> = ({
  isHomePage,
  showOnboarding,
  safeRedirect,
  handlers,
  handleOnboardingComplete,
  generatedVideo,
  handleGenerateVideoStory,
  handleApplyVideoToPost,
  socialConnections,
  handleConnectSocial,
  handleDisconnectSocial,
  loadSocialConnections,
  handleViewSocialHistory,
  isSocialHistoryOpen,
  setIsSocialHistoryOpen,
  connectionForHistory,
  isKeyboardShortcutsOpen,
  setIsKeyboardShortcutsOpen,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Zustand Store Selectors
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
    setIsPublishingModalOpen,
  } = useUIStore();

  const {
    isRepurposeModalOpen,
    repurposedContent,
    isRepurposing,
    repurposeError,
    lastFormData,
  } = useGenerationStore();

  const { brandVoiceProfiles, activeBrandVoiceId, isLearningStyle, itemToSchedule } = useDataStore();

  return (
    <>
      {showOnboarding && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <OnboardingWizard onComplete={handleOnboardingComplete} />
        </Suspense>
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
          <SignUpModal
            isOpen={true}
            onClose={() => setAuthModal(null)}
            onSwitchToLogin={() => setAuthModal('login')}
          />
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
                const newText =
                  typeof content === 'string'
                    ? content
                    : `${content.title}\n\n${content.text}${
                        content.visualIdea ? `\n\n[Pomysł na wizualizację: ${content.visualIdea}]` : ''
                      }`;
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
              isGenerating={useGenerationStore.getState().isGeneratingVideoStory}
              progressStatus={useGenerationStore.getState().videoStoryProgress}
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
    </>
  );
};

export default GlobalModals;
