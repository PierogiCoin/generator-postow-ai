import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PostIcon } from './icons/PostIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { CampaignIcon } from './icons/CampaignIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { useAuth } from '../contexts/AuthContext';
import { analytics, AnalyticsEvents } from '../services/analytics';
import {
  isPaidPlan,
  redirectToCreditPackCheckout,
  redirectToSubscriptionCheckout,
  setPendingCheckoutPlan,
  type CheckoutInterval,
} from '../services/paymentService';
import { UserPlan } from '../types';
import {
  CREDIT_PACKS,
  SUBSCRIPTION_PLANS,
  formatCreditPackPrice,
  formatSubscriptionPrice,
  formatUsageLimit,
  type BillingInterval,
  type SubscriptionPlanConfig,
} from '../config/subscriptionPlans';
import { useEscapeClose } from '../hooks/useEscapeClose';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionSuccess: () => void;
  onSignUpRequest?: (plan: UserPlan) => void;
}

const FEATURE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  credits: CheckCircleIcon,
  text: PostIcon,
  image: PhotoIcon,
  video: VideoCameraIcon,
  campaign: CampaignIcon,
  schedule: CheckCircleIcon,
  analytics: CheckCircleIcon,
  brand: CheckCircleIcon,
  api: CheckCircleIcon,
  api_whitelabel: CheckCircleIcon,
  unlimited: CheckCircleIcon,
  platforms: CheckCircleIcon,
  support: CheckCircleIcon,
};

const primaryBtnClass =
  'w-full mt-auto py-3 px-4 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white hover:brightness-110';
const mutedBtnClass =
  'w-full mt-auto py-3 px-4 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200';
const secondaryBtnClass =
  'w-full mt-auto py-3 px-4 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10';

const PlanCard: React.FC<{
  plan: SubscriptionPlanConfig;
  currentPlan: UserPlan;
  isGuest: boolean;
  loadingPlan: UserPlan | null;
  billingInterval: BillingInterval;
  onSubscribe: (plan: UserPlan) => Promise<void>;
}> = ({ plan, currentPlan, isGuest, loadingPlan, billingInterval, onSubscribe }) => {
  const { t } = useTranslation();
  const isCurrent = !isGuest && plan.id === currentPlan;
  const isLoading = loadingPlan === plan.id;
  const isFree = plan.id === UserPlan.Free;
  const priceDisplay = formatSubscriptionPrice(plan, billingInterval);

  let buttonText = isGuest && isPaidPlan(plan.id) ? t('pricing.cta_register') : t('pricing.cta_pay');
  let buttonDisabled = isLoading;
  let buttonClass = plan.recommended ? primaryBtnClass : secondaryBtnClass;

  if (isCurrent) {
    buttonText = t('pricing.cta_current');
    buttonDisabled = true;
    buttonClass = mutedBtnClass;
  } else if (isFree) {
    if (isGuest) {
      buttonText = t('pricing.cta_start_free');
      buttonDisabled = false;
      buttonClass = secondaryBtnClass;
    } else {
      buttonText = t('pricing.cta_free_plan');
      buttonDisabled = true;
      buttonClass = mutedBtnClass;
    }
  }

  const cardClasses = `border-2 rounded-xl p-6 flex flex-col h-full transition-all duration-300 relative ${
    plan.recommended
      ? 'border-[var(--hero-accent)] bg-[var(--hero-accent-soft)] dark:bg-slate-800/60 md:scale-[1.02]'
      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
  }`;

  return (
    <div className={cardClasses}>
      {plan.recommended && (
        <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
          <span
            className="px-4 py-1 text-xs font-semibold text-white rounded-full uppercase tracking-wider"
            style={{ backgroundColor: 'var(--hero-accent)' }}
          >
            {t('pricing.recommended')}
          </span>
        </div>
      )}
      {plan.savingsPercent > 0 && !plan.recommended && (
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md">
            {t('pricing.savings_per_credit', { percent: plan.savingsPercent })}
          </span>
        </div>
      )}
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white text-center">{plan.namePl}</h3>
      <div className="text-center my-4">
        <p className="text-4xl font-bold text-slate-900 dark:text-white">
          {priceDisplay.primary}
          <span className="text-base font-normal text-slate-500 dark:text-slate-400">
            {billingInterval === 'year' ? t('pricing.per_month_equiv') : t('pricing.per_month')}
          </span>
        </p>
        {priceDisplay.secondary && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{priceDisplay.secondary}</p>
        )}
        {priceDisplay.perCredit && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--hero-accent)' }}>
            {priceDisplay.perCredit}
          </p>
        )}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6 min-h-[2.5rem]">
        {t(`pricing.plan_desc.${plan.stripeKey}`, { defaultValue: plan.descriptionPl })}
      </p>

      <div className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature) => {
          const Icon = FEATURE_ICONS[feature.id] ?? CheckCircleIcon;
          return (
            <div key={feature.id} className="flex items-start gap-3">
              <span className="flex-shrink-0 mt-0.5 text-[var(--hero-accent)]">
                <Icon className="w-5 h-5" />
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">
                {t(`pricing.feature.${feature.id}`, { defaultValue: feature.labelPl })}
              </span>
              {feature.limit && (
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                  {feature.limit}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className={buttonClass}
        style={plan.recommended && !isCurrent && !isFree ? { backgroundColor: 'var(--hero-accent)' } : undefined}
        onClick={() => onSubscribe(plan.id)}
        disabled={buttonDisabled}
      >
        {isLoading ? t('pricing.redirecting') : buttonText}
      </button>
    </div>
  );
};

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  onSubscriptionSuccess: _onSubscriptionSuccess,
  onSignUpRequest,
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<UserPlan | null>(null);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('month');
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  useEscapeClose(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      analytics.track(AnalyticsEvents.PRICING_MODAL_OPENED, {
        currentPlan: user?.plan || 'free',
        isGuest: !user,
      });
    }
  }, [isOpen, user]);

  const handleSubscribe = async (newPlan: UserPlan) => {
    setError(null);

    if (newPlan === UserPlan.Free) {
      if (!user) {
        onSignUpRequest?.(UserPlan.Free);
      }
      return;
    }
    if (!isPaidPlan(newPlan)) return;

    if (!user) {
      setPendingCheckoutPlan(newPlan, billingInterval as CheckoutInterval);
      onSignUpRequest?.(newPlan);
      return;
    }

    if (user.plan === newPlan) return;

    setLoadingPlan(newPlan);
    try {
      await redirectToSubscriptionCheckout(newPlan, billingInterval as CheckoutInterval);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('pricing.error_checkout'));
      setLoadingPlan(null);
    }
  };

  const handleCreditPack = async (packId: string) => {
    setError(null);
    if (!user) {
      setError(t('pricing.error_login_pack'));
      return;
    }
    setLoadingPack(packId);
    try {
      await redirectToCreditPackCheckout(packId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('pricing.error_checkout'));
      setLoadingPack(null);
    }
  };

  if (!isOpen) return null;

  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'pl-PL';
  const primaryPlans = SUBSCRIPTION_PLANS.filter((p) =>
    [UserPlan.Free, UserPlan.Creator, UserPlan.Pro, UserPlan.Business].includes(p.id)
  );
  const agencyPlan = SUBSCRIPTION_PLANS.find((p) => p.id === UserPlan.Agency)!;
  const displayPlans = showAllPlans ? [...primaryPlans, agencyPlan] : primaryPlans;

  const formatLimitCell = (n: number, emptyZero = false) => {
    if (emptyZero && n === 0) return '—';
    if (!Number.isFinite(n)) return t('pricing.unlimited');
    return formatUsageLimit(n);
  };

  const comparisonRows: Array<{
    label: string;
    render: (plan: SubscriptionPlanConfig) => React.ReactNode;
  }> = [
    {
      label: t('pricing.feature.credits'),
      render: (plan) => plan.credits.toLocaleString(locale),
    },
    {
      label: t('pricing.feature.text'),
      render: (plan) => formatLimitCell(plan.usageLimits.text),
    },
    {
      label: t('pricing.feature.image'),
      render: (plan) => formatLimitCell(plan.usageLimits.image),
    },
    {
      label: t('pricing.feature.video'),
      render: (plan) => formatLimitCell(plan.usageLimits.video, true),
    },
    {
      label: t('pricing.feature.schedule'),
      render: (plan) =>
        plan.flags.scheduling ? (
          <CheckCircleIcon className="w-5 h-5 text-emerald-500 mx-auto" />
        ) : (
          <span className="text-slate-300 dark:text-slate-600">—</span>
        ),
    },
    {
      label: t('pricing.compare.analytics'),
      render: (plan) =>
        plan.flags.analytics ? (
          <CheckCircleIcon className="w-5 h-5 text-emerald-500 mx-auto" />
        ) : (
          <span className="text-slate-300 dark:text-slate-600">—</span>
        ),
    },
    {
      label: t('pricing.compare.strategist'),
      render: (plan) =>
        plan.flags.strategist ? (
          <CheckCircleIcon className="w-5 h-5 text-emerald-500 mx-auto" />
        ) : (
          <span className="text-slate-300 dark:text-slate-600">—</span>
        ),
    },
    {
      label: t('pricing.feature.brand'),
      render: (plan) => (plan.flags.brandVoices === -1 ? '∞' : String(plan.flags.brandVoices)),
    },
    {
      label: t('pricing.feature.api'),
      render: (plan) =>
        plan.flags.apiAccess ? (
          <CheckCircleIcon className="w-5 h-5 text-emerald-500 mx-auto" />
        ) : (
          <span className="text-slate-300 dark:text-slate-600">—</span>
        ),
    },
    {
      label: t('pricing.compare.price'),
      render: (plan) => formatSubscriptionPrice(plan, billingInterval).primary,
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fade-in"
      style={{ animationDuration: '0.3s' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-modal-title"
        className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-7xl m-4 relative overflow-y-auto max-h-[92vh] custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-2xl leading-none"
          aria-label={t('pricing.close')}
        >
          ×
        </button>

        <div className="text-center max-w-2xl mx-auto pr-8">
          <h2 id="pricing-modal-title" className="text-3xl font-bold text-slate-900 dark:text-white">
            {t('pricing.title')}
          </h2>
          <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">{t('pricing.subtitle')}</p>
        </div>

        {!user && (
          <div
            className="mt-6 max-w-2xl mx-auto rounded-xl border px-4 py-3 text-sm text-center"
            style={{
              backgroundColor: 'var(--hero-accent-soft)',
              borderColor: 'var(--hero-accent)',
              color: 'var(--hero-navy)',
            }}
          >
            <span className="dark:text-slate-200">{t('pricing.guest_banner')}</span>
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <div
            role="group"
            aria-label={t('pricing.billing_toggle_label')}
            className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800/60"
          >
            <button
              type="button"
              onClick={() => setBillingInterval('month')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                billingInterval === 'month'
                  ? 'text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/5'
              }`}
              style={billingInterval === 'month' ? { backgroundColor: 'var(--hero-accent)' } : undefined}
            >
              {t('pricing.billing_monthly')}
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval('year')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                billingInterval === 'year'
                  ? 'text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/5'
              }`}
              style={billingInterval === 'year' ? { backgroundColor: 'var(--hero-accent)' } : undefined}
            >
              {t('pricing.billing_yearly')}
              <span className="ml-1.5 text-[10px] font-bold opacity-90">{t('pricing.billing_yearly_badge')}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-3 rounded-md text-sm text-center max-w-2xl mx-auto">
            {error}
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
          {displayPlans.map((plan) => (
            <PlanCard
              key={plan.stripeKey}
              plan={plan}
              currentPlan={user?.plan || UserPlan.Free}
              isGuest={!user}
              loadingPlan={loadingPlan}
              billingInterval={billingInterval}
              onSubscribe={handleSubscribe}
            />
          ))}
        </div>

        {!showAllPlans && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setShowAllPlans(true)}
              className="text-sm font-semibold hover:underline"
              style={{ color: 'var(--hero-accent)' }}
            >
              {t('pricing.show_agency')}
            </button>
          </div>
        )}

        <div className="mt-10">
          <button
            type="button"
            onClick={() => setShowComparison((v) => !v)}
            aria-expanded={showComparison}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left"
          >
            <span className="text-base font-bold text-slate-900 dark:text-white">{t('pricing.compare_title')}</span>
            <span className="text-xs font-bold text-slate-500">
              {showComparison ? t('pricing.hide') : t('pricing.show')}
            </span>
          </button>
          {showComparison && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold text-slate-500 dark:text-slate-400">
                      {t('pricing.compare_feature')}
                    </th>
                    {displayPlans.map((plan) => (
                      <th
                        key={plan.stripeKey}
                        className={`text-center py-3 px-4 font-bold ${
                          plan.recommended ? '' : 'text-slate-900 dark:text-white'
                        }`}
                        style={plan.recommended ? { color: 'var(--hero-accent)' } : undefined}
                      >
                        {plan.namePl}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">{row.label}</td>
                      {displayPlans.map((plan) => (
                        <td
                          key={plan.stripeKey}
                          className="text-center py-3 px-4 text-slate-600 dark:text-slate-400 font-semibold"
                        >
                          {row.render(plan)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {(() => {
          const ent = SUBSCRIPTION_PLANS.find((p) => p.id === UserPlan.Enterprise)!;
          const entPrice = formatSubscriptionPrice(ent, billingInterval);
          return (
            <div className="mt-8 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50 dark:bg-slate-800/40">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{ent.namePl}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {t('pricing.plan_desc.enterprise', { defaultValue: ent.descriptionPl })}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2 whitespace-nowrap">
                  {entPrice.primary}
                  <span className="text-sm font-normal text-slate-500">
                    {billingInterval === 'year' ? t('pricing.per_month_equiv') : t('pricing.per_month')}
                  </span>
                </p>
                {entPrice.secondary && (
                  <p className="text-xs text-slate-400 mt-0.5">{entPrice.secondary}</p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                {user && (
                  <button
                    type="button"
                    disabled={loadingPlan === UserPlan.Enterprise}
                    onClick={() => handleSubscribe(UserPlan.Enterprise)}
                    className="px-5 py-2.5 text-sm font-semibold rounded-xl text-white hover:brightness-110 disabled:opacity-50"
                    style={{ backgroundColor: 'var(--hero-accent)' }}
                  >
                    {loadingPlan === UserPlan.Enterprise ? t('pricing.redirecting') : t('pricing.cta_enterprise')}
                  </button>
                )}
                <a
                  href="mailto:support@aicontentpro.app?subject=Enterprise%20AI%20Content%20Pro"
                  className="px-5 py-2.5 text-sm font-medium text-center rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-800"
                >
                  {t('pricing.contact_sales')}
                </a>
              </div>
            </div>
          );
        })()}

        <div className="mt-10">
          <button
            type="button"
            onClick={() => setShowCredits((v) => !v)}
            aria-expanded={showCredits}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left"
          >
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('pricing.packs_title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('pricing.packs_subtitle')}</p>
            </div>
            <span className="text-xs font-bold text-slate-500 shrink-0">
              {showCredits ? t('pricing.hide') : t('pricing.show')}
            </span>
          </button>
          {showCredits && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              {CREDIT_PACKS.map((pack) => {
                const packPrice = formatCreditPackPrice(pack);
                return (
                  <div
                    key={pack.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 bg-white dark:bg-slate-800 flex flex-col min-h-[280px]"
                  >
                    <div className="min-h-[24px] mb-2">
                      {pack.badge && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                          {pack.badge}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      {t(`pricing.pack.${pack.id}`, { defaultValue: pack.namePl })}
                    </h4>
                    <p className="text-2xl font-bold mt-2 text-slate-900 dark:text-white whitespace-nowrap">
                      {pack.credits.toLocaleString(locale)}
                      <span className="text-sm font-normal text-slate-500 ml-1">{t('pricing.credits_label')}</span>
                    </p>
                    <p className="text-lg font-semibold mt-1 whitespace-nowrap" style={{ color: 'var(--hero-accent)' }}>
                      {packPrice.primary}
                    </p>
                    <p className="text-xs text-slate-400 min-h-[16px]">{packPrice.secondary}</p>
                    {packPrice.perCredit && (
                      <p className="text-xs min-h-[16px]" style={{ color: 'var(--hero-accent)' }}>
                        {packPrice.perCredit}
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={!user || loadingPack === pack.id}
                      onClick={() => handleCreditPack(pack.id)}
                      className="mt-auto w-full py-2 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-50"
                    >
                      {loadingPack === pack.id ? t('pricing.redirecting') : t('pricing.cta_buy_pack')}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">{t('pricing.disclaimer')}</p>
      </div>
    </div>
  );
};

export default PricingModal;
