import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getSupabase } from '../services/supabaseClient';
import {
  Zap,
  Image,
  Video,
  FileText,
  TrendingUp,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PricingModal } from './PricingModal';
import { CreditBank } from './CreditBank';
import { getPlanByUserPlan } from '../config/subscriptionPlans';
import { UserPlan } from '../types';

interface UsageStats {
  totalCreditsUsed: number;
  byAction: Record<string, number>;
  byDay: Record<string, number>;
}

export function UsageMonitor() {
  const { t } = useTranslation();
  const { user, refreshUserCredits } = useAuth();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPricing, setShowPricing] = useState(false);

  const loadUsageStats = useCallback(async () => {
    setLoading(true);
    try {
      await refreshUserCredits();
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const response = await fetch('/api/payments/usage?days=30', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) return;
      const data = await response.json();
      setStats(data);
    } catch {
      // Silently fail, UI will show empty state
    } finally {
      setLoading(false);
    }
  }, [refreshUserCredits]);

  useEffect(() => {
    if (user) loadUsageStats();
    else setLoading(false);
  }, [user, loadUsageStats]);

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  const planConfig = getPlanByUserPlan((user?.plan as UserPlan) || UserPlan.Free);
  const maxCredits = planConfig.credits;
  const creditsRemaining = user?.credits ?? maxCredits;
  const creditsUsed = stats?.totalCreditsUsed ?? Math.max(0, maxCredits - creditsRemaining);
  const usagePercent = maxCredits > 0 ? (creditsUsed / maxCredits) * 100 : 0;

  const isLowCredits = creditsRemaining < 100;
  const isCriticalCredits = creditsRemaining < 50;

  return (
    <>
      <div className="p-6 space-y-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{t('usage.title', 'Kredyty')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('usage.subtitle', 'Saldo z profilu · zużycie z ostatnich 30 dni')}
            </p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user?.plan === 'free' ? 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}>
            {user?.plan?.toUpperCase()} Plan
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className={`w-5 h-5 ${isCriticalCredits ? 'text-red-500' :
                  isLowCredits ? 'text-yellow-500' :
                    'text-primary'
                }`} />
              <span className="font-medium">{t('usage.remaining', 'Pozostało')}</span>
            </div>
            <span className="text-2xl font-bold">{creditsRemaining.toLocaleString('pl-PL')}</span>
          </div>

          {maxCredits > 0 && (
            <>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${isCriticalCredits ? 'bg-red-500' : isLowCredits ? 'bg-yellow-500' : 'bg-blue-600'}`}
                  style={{ width: `${Math.min(100, Math.max(0, (creditsRemaining / maxCredits) * 100))}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {t('usage.usedOfPlan', '{{used}} zużyto (szac.) · plan {{max}}', {
                  used: creditsUsed,
                  max: maxCredits,
                })}
              </p>
            </>
          )}

          {isLowCredits && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {isCriticalCredits
                    ? t('usage.critical', 'Bardzo niskie saldo kredytów!')
                    : t('usage.low', 'Kredyty się kończą')}
                </p>
                <button
                  onClick={() => setShowPricing(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  {t('usage.buyCredits', 'Dokup kredyty')}
                </button>
              </div>
            </div>
          )}
        </div>

        <CreditBank />

        {stats && Object.keys(stats.byAction).length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t('usage.breakdown', 'Zużycie (30 dni)')}
            </h4>

            <div className="space-y-2">
              {Object.entries(stats.byAction)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([action, credits]) => {
                  const Icon = getActionIcon(action);
                  return (
                    <div
                      key={action}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="capitalize">
                          {action.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>
                      <span className="font-medium text-muted-foreground">
                        {credits} {t('usage.creditsShort', 'kr.')}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <button
            onClick={() => setShowPricing(true)}
            className="flex-1 px-4 py-2 text-sm font-medium border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {t('usage.viewPlans', 'Plany')}
          </button>
          {user?.plan !== 'free' && (
            <button
              onClick={async () => {
                try {
                  const supabase = getSupabase();
                  const { data: { session } } = await supabase.auth.getSession();
                  const token = session?.access_token;
                  if (!token) return;
                  const response = await fetch('/api/payments/portal', {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  });
                  const data = await response.json();
                  if (data.url) {
                    window.open(data.url, '_blank', 'noopener,noreferrer');
                  }
                } catch {
                  // Portal open failed
                }
              }}
              className="flex-1 px-4 py-2 text-sm font-medium border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t('usage.manageBilling', 'Rozliczenia')}
            </button>
          )}
        </div>
      </div>

      <PricingModal
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
        onSubscriptionSuccess={() => {
          setShowPricing(false);
          void loadUsageStats();
        }}
      />
    </>
  );
}

function getActionIcon(action: string) {
  if (action.includes('image') || action.includes('Image')) return Image;
  if (action.includes('video') || action.includes('Video')) return Video;
  if (action.includes('post') || action.includes('Post')) return FileText;
  return Zap;
}
