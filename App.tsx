import React, { useEffect, useRef } from 'react';
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
import { AnalysisModal } from './components/AnalysisModal';
// Chatbot will be handled via backend; do not initialize client-side AI here
// import { Chatbot } from './components/Chatbot';
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
    
  // Auth Context
  const { user } = useAuth(); 
    
  // System powiadomień
  const notificationSystem = useNotifications();

  // Custom hook for business logic
  const handlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification);

  // Zustand Stores for state management
  const { isPricingModalOpen, authModal, isBrandVoiceManagerOpen, isAnalysisModalOpen, isVeoKeyModalNeeded, isCommandPaletteOpen, setAuthModal, setIsPricingModalOpen, setIsBrandVoiceManagerOpen, setIsVeoKeyModalNeeded, setIsCommandPaletteOpen } = useUIStore();
  const { result, isRepurposeModalOpen, repurposedContent, isRepurposing, repurposeError, lastFormData } = useGenerationStore();
  const { brandVoiceProfiles, activeBrandVoiceId, isLearningStyle, itemToSchedule } = useDataStore();

  // Local state for complex objects passed to modals
  const itemToRepurpose = useRef<GenerationResult | null>(null);

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
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-md m-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t('videoKeyModal.title')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              <Trans i18nKey="videoKeyModal.description">
                Generowanie wideo Veo wymaga wybrania klucza API, dla którego włączono płatności.
                Więcej informacji znajdziesz w <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">dokumentacji płatności</a>.
              </Trans>
            </p>
            <div className="mt-6 flex justify-end gap-4">
              <button onClick={async () => {
                // this flow is specific to aistudio integration; leave as noop for now
                setIsVeoKeyModalNeeded(false);
                if (lastFormData) {
                  handlers.handleGenerate(lastFormData);
                }
              }} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 transition">
                {t('videoKeyModal.button')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
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
    </div>
  );
};

export default App;
