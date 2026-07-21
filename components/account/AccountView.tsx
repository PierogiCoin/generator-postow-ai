import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SubscriptionStatus } from '../SubscriptionStatus';
import { PaymentHistory } from './PaymentHistory';
import { ProfileSettings } from './ProfileSettings';
import { Achievements } from './Achievements';
import { useDataStore } from '../../stores/dataStore';
import { useUIStore } from '../../stores/uiStore';
import { PageHeader } from '../ui/PageHeader';

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
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Konto"
        title="Moje konto"
        subtitle="Zarządzaj planem, płatnościami i danymi profilu."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          <ProfileSettings />
          <Achievements />
          <PaymentHistory />
        </div>
        <div className="lg:col-span-1 lg:sticky lg:top-24">
          <SubscriptionStatus
            credits={user.credits ?? 0}
            userPlan={userPlan}
            stats={stats}
            onUpgrade={onUpgrade}
          />
        </div>
      </div>
    </div>
  );
};
