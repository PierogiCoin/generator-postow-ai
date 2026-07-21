/**
 * TrialBanner — banner promujący 7-dniowy darmowy okres Pro.
 * Widoczny tylko dla użytkowników Free plan.
 * Po kliknięciu przekierowuje do Stripe checkout z trialem.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { redirectToTrialCheckout } from '../services/paymentService';
import { emailService } from '../services/emailService';
import { UserPlan } from '../types';
import { SUBSCRIPTION_PRICING } from '../config/pricingMath';
import { Sparkles, X, Check, Loader2 } from 'lucide-react';

const DISMISS_KEY = 'trial-banner-dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 dni
const COUNTDOWN_KEY = 'trial-banner-deadline'; // legacy — czyścimy przy montowaniu

export const TrialBanner: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const isFreeUser = (user?.plan as UserPlan) === UserPlan.Free || !user?.plan;
  const proCredits = SUBSCRIPTION_PRICING.pro.credits;
  const proCreditsLabel = proCredits.toLocaleString('pl-PL');

  useEffect(() => {
    if (!isFreeUser) return;
    // Usuń stary sztuczny countdown z localStorage
    localStorage.removeItem(COUNTDOWN_KEY);

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_DURATION_MS) {
        setDismissed(true);
      }
    }
  }, [isFreeUser]);

  if (!isFreeUser || dismissed || !user) return null;

  const handleStartTrial = async () => {
    setLoading(true);
    setError(null);
    try {
      emailService.triggerTrialStarted(7);
      await redirectToTrialCheckout(UserPlan.Pro, 7);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('trialBanner.error_generic');
      if (msg.includes('Trial już był wykorzystany') || msg.toLowerCase().includes('already')) {
        setError(t('trialBanner.error_used'));
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  };

  const features = [
    t('trialBanner.feat_credits', { credits: proCreditsLabel }),
    t('trialBanner.feat_analytics'),
    t('trialBanner.feat_strategist'),
    t('trialBanner.feat_video'),
    t('trialBanner.feat_brand'),
  ];

  return (
    <div
      className="relative overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f1c2e] p-5 sm:p-6"
      style={{ boxShadow: 'inset 3px 0 0 0 var(--hero-accent)' }}
    >
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-3 right-3 min-h-[40px] min-w-[40px] inline-flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors touch-manipulation"
        aria-label={t('trialBanner.close')}
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pr-8">
        <div
          className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: 'var(--hero-accent)' }}
        >
          <Sparkles className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('trialBanner.title')}
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t('trialBanner.subtitle', { credits: proCreditsLabel })}
          </p>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {features.map((feat) => (
              <span key={feat} className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                {feat}
              </span>
            ))}
          </div>
        </div>

        <div className="shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleStartTrial}
            disabled={loading}
            className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-3 text-white text-sm font-semibold rounded-lg hover:brightness-110 transition disabled:opacity-50 touch-manipulation"
            style={{ backgroundColor: 'var(--hero-accent)' }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('trialBanner.redirecting')}
              </>
            ) : (
              t('trialBanner.cta')
            )}
          </button>
          <p className="mt-1.5 text-[11px] text-slate-400 text-center sm:text-right">
            {t('trialBanner.fine_print')}
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};
