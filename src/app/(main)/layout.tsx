"use client";

import React, { useState, useCallback, useEffect } from 'react';
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
import { isOnboardingDone, type OnboardingData } from '@/utils/onboarding';
import { DealPlanBadge } from '@/components/DealPlanBadge';
import { UserPlan } from '@/types';
import { useSocialConnectionsHandlers } from '@/hooks/useSocialConnectionsHandlers';
import { useVideoStoryHandlers } from '@/hooks/useVideoStoryHandlers';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { setAuthModal, setIsPricingModalOpen } = useUIStore();
  const notificationSystem = useNotifications();
  const creditGuard = useCreditGuard();
  const { confirm, confirmDialogProps } = useConfirm();
  const handlers = useAppHandlers(notificationSystem.addToast, notificationSystem.addNotification, confirm);
  const social = useSocialConnectionsHandlers();
  const videoStory = useVideoStoryHandlers();

  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) {
      setShowOnboarding(false);
      return;
    }
    setShowOnboarding(!isOnboardingDone(user.id));
  }, [user]);

  const handleOnboardingComplete = useCallback((_data: OnboardingData) => {
    setShowOnboarding(false);
  }, []);

  const showDealBadge =
    user && (user.plan === UserPlan.Lifetime || Boolean(user.dealSource));

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

      {showDealBadge && (
        <div className="mx-auto w-full max-w-7xl px-4 lg:px-8 pt-16 pb-0">
          <DealPlanBadge
            plan={user.plan}
            dealSource={user.dealSource}
            dealTier={user.dealTier}
            compact
          />
        </div>
      )}

      <main className="flex-grow mx-auto w-full max-w-7xl p-4 lg:p-8 pt-20 pb-20 sm:pb-4">
        {children}
      </main>

      <GlobalModals
        isHomePage={false}
        showOnboarding={showOnboarding}
        safeRedirect={null}
        handlers={handlers}
        handleOnboardingComplete={handleOnboardingComplete}
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
