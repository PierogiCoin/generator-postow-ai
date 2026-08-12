"use client";

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
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
import { useSocialConnectionsHandlers } from '@/hooks/useSocialConnectionsHandlers';
import { useVideoStoryHandlers } from '@/hooks/useVideoStoryHandlers';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { setAuthModal, setIsPricingModalOpen } = useUIStore();
  const notificationSystem = useNotifications();
  const creditGuard = useCreditGuard();
  const { confirm, confirmDialogProps } = useConfirm();
  const handlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification, confirm);
  const social = useSocialConnectionsHandlers();
  const videoStory = useVideoStoryHandlers();
  const pathname = usePathname();
  const isHomePage = pathname === '/' || pathname === '/pricing';
  const isDealSurface = pathname === '/deal' || pathname === '/redeem';
  const hideAppChrome = isHomePage || isDealSurface;

  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <ConfirmDialog {...confirmDialogProps} />
      <AppVersionBanner />
      {creditGuard.prompt}

      {(!hideAppChrome || user) && !isDealSurface && (
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
      )}

      <main className={`flex-grow mx-auto w-full ${hideAppChrome ? 'max-w-none p-0 overflow-x-hidden' : 'max-w-7xl p-4 lg:p-8 pt-20 pb-20 sm:pb-4'}`}>
        {children}
      </main>

      {isHomePage && <Footer />}

      <GlobalModals
        isHomePage={isHomePage}
        showOnboarding={false}
        safeRedirect={null}
        handlers={handlers}
        handleOnboardingComplete={async () => {}}
        generatedVideo={videoStory.generatedVideo}
        handleGenerateVideoStory={videoStory.handleGenerateVideoStory}
        handleApplyVideoToPost={videoStory.handleApplyVideoToPost}
        socialConnections={social.socialConnections}
        handleConnectSocial={social.handleConnectSocial}
        handleDisconnectSocial={social.handleDisconnectSocial}
        loadSocialConnections={social.loadSocialConnections}
        handleViewSocialHistory={social.handleViewSocialHistory}
        isSocialHistoryOpen={social.isSocialHistoryOpen}
        setIsSocialHistoryOpen={social.setIsSocialHistoryOpen}
        connectionForHistory={social.connectionForHistory}
        isKeyboardShortcutsOpen={isKeyboardShortcutsOpen}
        setIsKeyboardShortcutsOpen={setIsKeyboardShortcutsOpen}
      />
    </div>
  );
}
