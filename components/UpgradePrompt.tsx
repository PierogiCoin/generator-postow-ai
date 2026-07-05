/**
 * UpgradePrompt — smart paywall component.
 * Pokazuje się gdy:
 * - Kredyty < 20% limitu (low credits warning)
 * - Kredyty = 0 (exhausted)
 * - Użytkownik próbuuje użyć funkcji premium (feature gated)
 * - Użytkownik regularnie kupuje pakiety (upgrade nudge)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PricingModal } from './PricingModal';
import { getPlanByUserPlan, SUBSCRIPTION_PLANS } from '../config/subscriptionPlans';
import { UserPlan } from '../types';
import { emailService } from '../services/emailService';
import { Zap, Lock, TrendingUp, Sparkles, X } from 'lucide-react';

type PromptType = 'low-credits' | 'exhausted' | 'feature-locked' | 'upgrade-nudge';

interface UpgradePromptProps {
  type: PromptType;
  /** Dla feature-locked: nazwa blokowanej funkcji */
  featureName?: string;
  /** Dla feature-locked: plan wymagany do odblokowania */
  requiredPlan?: UserPlan;
  /** Auto-dismiss po N sekundach (0 = brak) */
  autoDismissSeconds?: number;
  /** Czy pokazywać jako toast (true) czy jako banner (false) */
  asToast?: boolean;
}

const PROMPT_CONFIG: Record<PromptType, {
  icon: React.FC<{ className?: string }>;
  title: string;
  message: string;
  cta: string;
  urgency: 'low' | 'medium' | 'high';
}> = {
  'low-credits': {
    icon: Zap,
    title: 'Kredyty się kończą',
    message: 'Wykorzystałeś większość kredytów. Nie przerywaj cadencji — przejdź na wyższy plan.',
    cta: 'Zobacz plany',
    urgency: 'medium',
  },
  'exhausted': {
    icon: Zap,
    title: 'Skończyły się kredyty',
    message: 'Wykorzystałeś wszystkie kredyty w tym miesiącu. Doładuj lub przejdź na wyższy plan.',
    cta: 'Doładuj kredyty',
    urgency: 'high',
  },
  'feature-locked': {
    icon: Lock,
    title: 'Funkcja premium',
    message: 'Ta funkcja wymaga wyższego planu.',
    cta: 'Odblokuj',
    urgency: 'medium',
  },
  'upgrade-nudge': {
    icon: TrendingUp,
    title: 'Opłaca Ci się przejść wyżej',
    message: 'Regularnie doładowujesz kredyty — wyższy plan da Ci niższą cenę za kredyt.',
    cta: 'Porównaj plany',
    urgency: 'low',
  },
};

const URGENCY_STYLES = {
  low: {
    container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    accent: 'bg-blue-600 hover:bg-blue-700',
  },
  medium: {
    container: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-600 dark:text-yellow-400',
    accent: 'bg-yellow-600 hover:bg-yellow-700',
  },
  high: {
    container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    accent: 'bg-red-600 hover:bg-red-700',
  },
};

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  type,
  featureName,
  requiredPlan,
  autoDismissSeconds = 0,
  asToast = false,
}) => {
  const { user } = useAuth();
  const [showPricing, setShowPricing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [dismissedKey] = useState(() => `upgrade-prompt-${type}-${Date.now()}`);

  const config = PROMPT_CONFIG[type];
  const styles = URGENCY_STYLES[config.urgency];
  const Icon = config.icon;

  // Auto-dismiss
  useEffect(() => {
    if (autoDismissSeconds > 0 && !dismissed) {
      const timer = setTimeout(() => setDismissed(true), autoDismissSeconds * 1000);
      return () => clearTimeout(timer);
    }
  }, [autoDismissSeconds, dismissed, dismissedKey]);

  // Trigger email when prompt is shown
  useEffect(() => {
    if (dismissed) return;
    const planConfig = getPlanByUserPlan((user?.plan as UserPlan) || UserPlan.Free);
    const credits = user?.credits ?? planConfig.credits;

    if (type === 'low-credits' && credits > 0) {
      emailService.triggerLowCredits(credits, planConfig.namePl);
    } else if (type === 'exhausted') {
      emailService.triggerCreditsExhausted();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const handleUpgrade = useCallback(() => {
    setShowPricing(true);
  }, []);

  if (dismissed) return null;

  // Znajdź sugerowany plan (następny wyższy niż obecny)
  const currentPlanIndex = SUBSCRIPTION_PLANS.findIndex(
    (p) => p.id === ((user?.plan as UserPlan) || UserPlan.Free)
  );
  const suggestedPlan = requiredPlan
    ? getPlanByUserPlan(requiredPlan)
    : SUBSCRIPTION_PLANS[Math.min(currentPlanIndex + 1, SUBSCRIPTION_PLANS.length - 1)];

  const containerClass = asToast
    ? `fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border-2 shadow-2xl p-5 ${styles.container} animate-slide-in`
    : `rounded-2xl border-2 p-5 ${styles.container}`;

  return (
    <>
      <div className={containerClass} role="alert">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 ${styles.icon}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                {type === 'feature-locked' && featureName ? featureName : config.title}
              </h4>
              {asToast && (
                <button
                  onClick={() => setDismissed(true)}
                  className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label="Zamknij"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {type === 'feature-locked' && featureName
                ? `${config.message} Wymagany plan: ${suggestedPlan.namePl} (${suggestedPlan.priceUsd > 0 ? `${suggestedPlan.priceUsd}$` : 'darmowy'}).`
                : config.message}
            </p>

            {/* Sugerowany plan — quick highlight */}
            {type !== 'feature-locked' && suggestedPlan.priceUsd > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {suggestedPlan.namePl}: {suggestedPlan.credits.toLocaleString('pl-PL')} kredytów
                  {suggestedPlan.recommended && ' ⭐'}
                </span>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleUpgrade}
                className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors ${styles.accent}`}
              >
                {config.cta} →
              </button>
              {!asToast && (
                <button
                  onClick={() => setDismissed(true)}
                  className="px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  Nie teraz
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <PricingModal
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
        onSubscriptionSuccess={() => setShowPricing(false)}
      />
    </>
  );
};

// ============================================================
// Hook: useCreditGuard — automatycznie pokazuje prompt gdy kredyty niskie
// ============================================================

export function useCreditGuard(): {
  prompt: React.ReactNode;
  checkCredits: () => 'ok' | 'low' | 'exhausted';
} {
  const { user } = useAuth();
  const [promptType, setPromptType] = useState<PromptType | null>(null);

  const planConfig = getPlanByUserPlan((user?.plan as UserPlan) || UserPlan.Free);
  const credits = user?.credits ?? planConfig.credits;
  const threshold = Math.max(20, planConfig.credits * 0.2);

  const checkCredits = (): 'ok' | 'low' | 'exhausted' => {
    if (credits <= 0) {
      setPromptType('exhausted');
      return 'exhausted';
    }
    if (credits < threshold) {
      setPromptType('low-credits');
      return 'low';
    }
    return 'ok';
  };

  // Auto-check przy zmianie kredytów
  useEffect(() => {
    if (credits <= 0) {
      setPromptType('exhausted');
    } else if (credits < threshold) {
      setPromptType('low-credits');
    } else {
      setPromptType(null);
    }
  }, [credits, threshold]);

  const prompt = promptType ? (
    <UpgradePrompt type={promptType} asToast autoDismissSeconds={15} />
  ) : null;

  return { prompt, checkCredits };
}

// ============================================================
// Hook: useFeatureGuard — blokuje funkcje premium i pokazuje prompt
// ============================================================

export function useFeatureGuard(
  featureName: string,
  requiredPlan: UserPlan
): {
  canUse: boolean;
  guard: React.ReactNode;
  checkAccess: () => boolean;
} {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);

  const userPlan = (user?.plan as UserPlan) || UserPlan.Free;
  const planIndex = SUBSCRIPTION_PLANS.findIndex((p) => p.id === userPlan);
  const requiredIndex = SUBSCRIPTION_PLANS.findIndex((p) => p.id === requiredPlan);
  const canUse = planIndex >= requiredIndex;

  const checkAccess = (): boolean => {
    if (!canUse) {
      setShowPrompt(true);
      return false;
    }
    return true;
  };

  const guard = showPrompt ? (
    <UpgradePrompt
      type="feature-locked"
      featureName={featureName}
      requiredPlan={requiredPlan}
      asToast
      autoDismissSeconds={0}
    />
  ) : null;

  return { canUse, guard, checkAccess };
}
