import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SubscriptionStatus } from '../SubscriptionStatus';
import { PaymentHistory } from './PaymentHistory';
import { ProfileSettings } from './ProfileSettings';
import { Achievements } from './Achievements';
import { useDataStore } from '../../stores/dataStore';
import { useUIStore } from '../../stores/uiStore';

export const AccountView: React.FC = () => {
  const { user, userPlan } = useAuth();const { stats } = useDataStore();
  const { setIsPricingModalOpen } = useUIStore();
  
  const onUpgrade = () => setIsPricingModalOpen(true);

  if (!user) {
      return (
        <div className="text-center py-20">
            <p className="text-lg text-gray-500 dark:text-gray-400">Musisz być zalogowany, aby zobaczyć tę stronę.</p>
        </div>
      );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Moje konto</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Zarządzaj swoim planem, płatnościami i danymi profilu.</p>
      </div>
      
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