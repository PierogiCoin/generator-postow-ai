import React from 'react';
import type { UsageStats } from '../types';
import { UserPlan } from '../types';
import { getPlanByUserPlan } from '../config/subscriptionPlans';
import { SparklesIcon } from './icons/SparklesIcon';

interface SubscriptionStatusProps {
  credits: number;
  userPlan: UserPlan;
  onUpgrade: () => void;
  /** Opcjonalnie: statystyki generacji w bieżącym okresie */
  stats?: UsageStats | null;
}

const planNames: Record<UserPlan, string> = {
  [UserPlan.Free]: 'Darmowy',
  [UserPlan.Creator]: 'Creator',
  [UserPlan.Pro]: 'Pro',
  [UserPlan.Agency]: 'Agency',
  [UserPlan.Business]: 'Business',
  [UserPlan.Enterprise]: 'Enterprise',
};

export const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({
  credits,
  userPlan,
  onUpgrade,
  stats,
}) => {
  const planConfig = getPlanByUserPlan(userPlan);
  const planCredits = planConfig.credits;
  const isFreePlan = userPlan === UserPlan.Free;
  const generationsThisMonth = stats?.totalGenerations ?? 0;

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Status subskrypcji</h2>
        <span className="px-3 py-1 text-xs font-bold text-white bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-md">
          Plan: {planNames[userPlan]}
        </span>
      </div>

      {isFreePlan && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Twój darmowy plan obejmuje miesięczny pul kredytów. Ulepsz plan, aby uzyskać więcej i odblokować zaawansowane funkcje.
        </p>
      )}

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1 text-sm">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-amber-500" />
              <span className="font-medium text-slate-700 dark:text-slate-300">Kredyty</span>
            </div>
            <span className="font-semibold text-slate-900 dark:text-white">
              {credits.toLocaleString('pl-PL')} / {planCredits.toLocaleString('pl-PL')}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                credits < planCredits * 0.2
                  ? 'bg-red-500'
                  : credits < planCredits * 0.5
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
              }`}
              style={{
                width: `${planCredits > 0 ? Math.min((credits / planCredits) * 100, 100) : 0}%`,
              }}
              role="progressbar"
              aria-valuenow={credits}
              aria-valuemin={0}
              aria-valuemax={planCredits}
              aria-label="Pozostałe kredyty"
            />
          </div>
        </div>
        {generationsThisMonth > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Generacji w tym okresie: {generationsThisMonth}
          </p>
        )}
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Pozostało:{' '}
          <span className="font-bold text-slate-900 dark:text-white">{credits.toLocaleString('pl-PL')}</span>{' '}
          kredytów
        </p>
      </div>

      {userPlan !== UserPlan.Enterprise && userPlan !== UserPlan.Business && (
        <button
          onClick={onUpgrade}
          className="w-full mt-6 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition-all shadow-md focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800"
        >
          <SparklesIcon className="w-5 h-5" />
          {isFreePlan ? 'Ulepsz plan' : 'Zmień plan'}
        </button>
      )}
    </div>
  );
};
