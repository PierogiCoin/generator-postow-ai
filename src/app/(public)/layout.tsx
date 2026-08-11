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
import { SocialConnection } from '@/types/socialPublishing';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { setAuthModal, setIsPricingModalOpen } = useUIStore();
  const notificationSystem = useNotifications();
  const creditGuard = useCreditGuard();
  const { confirm, confirmDialogProps } = useConfirm();
  const handlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification, confirm);
  const pathname = usePathname();
  const isHomePage = pathname === '/' || pathname === '/pricing';

  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
  const [connectionForHistory, setConnectionForHistory] = useState<SocialConnection | null>(null);
  const [isSocialHistoryOpen, setIsSocialHistoryOpen] = useState(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <ConfirmDialog {...confirmDialogProps} />
      <AppVersionBanner />
      {creditGuard.prompt}

      {(!isHomePage || user) && (
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

      <main className={`flex-grow mx-auto w-full ${isHomePage ? 'max-w-none p-0 overflow-x-hidden' : 'max-w-7xl p-4 lg:p-8 pt-20 pb-20 sm:pb-4'}`}>
        {children}
      </main>

      {isHomePage && <Footer />}

      <GlobalModals
        isHomePage={isHomePage}
        showOnboarding={false}
        safeRedirect={null}
        handlers={handlers}
        handleOnboardingComplete={async () => {}}
        generatedVideo={undefined}
        handleGenerateVideoStory={async () => {}}
        handleApplyVideoToPost={() => {}}
        socialConnections={socialConnections}
        handleConnectSocial={async () => {}}
        handleDisconnectSocial={async () => {}}
        loadSocialConnections={async () => {}}
        handleViewSocialHistory={(connection) => {
          setConnectionForHistory(connection);
          setIsSocialHistoryOpen(true);
        }}
        isSocialHistoryOpen={isSocialHistoryOpen}
        setIsSocialHistoryOpen={setIsSocialHistoryOpen}
        connectionForHistory={connectionForHistory}
        isKeyboardShortcutsOpen={isKeyboardShortcutsOpen}
        setIsKeyboardShortcutsOpen={setIsKeyboardShortcutsOpen}
      />
    </div>
  );
}
