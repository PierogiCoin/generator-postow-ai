'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlan } from '@/types';
import { isOnboardingPendingFirstGenerate } from '@/utils/onboarding';
import { DealPlanBadge } from './DealPlanBadge';

/**
 * First-run CTA dla kupujących Lifetime / AppSumo — jeden cel: pierwszy post.
 */
export const DealActivationBanner: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;
  if (user.plan !== UserPlan.Lifetime && !user.dealSource) return null;

  const pendingFirst =
    typeof window !== 'undefined' && isOnboardingPendingFirstGenerate(user.id);

  return (
    <div
      className="border border-[var(--hero-accent)]/30 bg-[var(--hero-accent-soft)] p-5 sm:p-6"
      style={{ boxShadow: 'inset 3px 0 0 0 var(--hero-accent)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <DealPlanBadge
            plan={user.plan}
            dealSource={user.dealSource}
            dealTier={user.dealTier}
          />
          <h3 className="mt-3 font-display text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            {pendingFirst ? 'Wygeneruj pierwszy post (ok. 3 min)' : 'Twój Lifetime jest aktywny'}
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {pendingFirst
              ? 'Wejdź do generatora — formularz jest już wstępnie wypełniony z onboardingu.'
              : 'Twórz posty, planuj w kalendarzu. Gdy skończą się kredyty — dokup pakiet, bez nowej subskrypcji.'}
          </p>
        </div>
        <Link
          href="/generator"
          className="shrink-0 inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-lg text-sm font-semibold text-white hover:brightness-110"
          style={{ backgroundColor: 'var(--hero-accent)' }}
        >
          <Sparkles className="w-4 h-4" />
          {pendingFirst ? 'Pierwszy post' : 'Otwórz generator'}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default DealActivationBanner;
