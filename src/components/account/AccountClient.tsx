"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { PaymentHistory } from '@/components/account/PaymentHistory';
import { ProfileSettings } from '@/components/account/ProfileSettings';
import { Achievements } from '@/components/account/Achievements';
import { useDataStore } from '@/stores/dataStore';
import { useUIStore } from '@/stores/uiStore';
import { PageHeader } from '@/components/ui/PageHeader';

export const AccountView: React.FC = () => {
  const { user, userPlan } = useAuth();
  const { stats } = useDataStore();
  const { setIsPricingModalOpen } = useUIStore();

  const onUpgrade = () => setIsPricingModalOpen(true);

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-slate-500 dark:text-slate-400">Musisz być zalogowany, aby zobaczyć tę stronę.</p>
      </div>
    );
  }

  return (
    <div className="page-shell-wide">
      <PageHeader
        eyebrow="Konto"
        title="Moje konto"
        subtitle="Zarządzaj planem, płatnościami i danymi profilu."
      />

      <div className="page-work-grid">
        <div className="space-y-8 content-auto min-w-0">
          <ProfileSettings />
          <Achievements />
          <PaymentHistory />
        </div>
        <aside className="content-auto-sm cq-inline lg:sticky lg:top-24 min-w-0">
          <SubscriptionStatus
            credits={user.credits ?? 0}
            userPlan={userPlan}
            stats={stats}
            onUpgrade={onUpgrade}
          />
        </aside>
      </div>
    </div>
  );
};


export default AccountView;