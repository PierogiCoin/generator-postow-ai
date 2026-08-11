"use client";

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { AppVersionBanner } from '@/components/AppVersionBanner';
import { GlobalModals } from '@/components/GlobalModals';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useUIStore } from '@/stores/uiStore';
import { useCreditGuard } from '@/components/UpgradePrompt';
import { useAppHandlers } from '@/hooks/useAppHandlers';
import { NotificationSystem } from '@/components/NotificationSystem';
import { useConfirm } from '@/hooks/useConfirm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SocialConnection } from '@/types/socialPublishing';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { setAuthModal, setIsPricingModalOpen } = useUIStore();
  const notificationSystem = useNotifications();
  const creditGuard = useCreditGuard();
  const { confirm, confirmDialogProps } = useConfirm();
  const handlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification, confirm);

  // Mocking variables required by GlobalModals that were previously in App.tsx
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
  const [connectionForHistory, setConnectionForHistory] = useState<SocialConnection | null>(null);
  const [isSocialHistoryOpen, setIsSocialHistoryOpen] = useState(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);

  // Fallback handlers for social connections
  const handleConnectSocial = async () => {};
  const handleDisconnectSocial = async () => {};
  const loadSocialConnections = async () => {};
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

      <main className="flex-grow mx-auto w-full max-w-7xl p-4 lg:p-8 pt-20 pb-20 sm:pb-4">
        {children}
      </main>

      <GlobalModals
        isHomePage={false}
        showOnboarding={false}
        safeRedirect={null}
        handlers={handlers}
        handleOnboardingComplete={async () => {}}
        generatedVideo={undefined}
        handleGenerateVideoStory={async () => {}}
        handleApplyVideoToPost={() => {}}
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
}
