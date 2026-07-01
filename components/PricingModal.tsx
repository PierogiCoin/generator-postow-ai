import React, { useState } from 'react';
import { PostIcon } from './icons/PostIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { CampaignIcon } from './icons/CampaignIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { useAuth } from '../contexts/AuthContext';
import {
  isPaidPlan,
  redirectToCreditPackCheckout,
  redirectToSubscriptionCheckout,
  setPendingCheckoutPlan,
} from '../services/paymentService';
import { UserPlan } from '../types';
import {
  CREDIT_PACKS,
  SUBSCRIPTION_PLANS,
  formatCreditPackPrice,
  formatSubscriptionPrice,
  type SubscriptionPlanConfig,
} from '../config/subscriptionPlans';

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
  unlimited: CheckCircleIcon,
  platforms: CheckCircleIcon,
  support: CheckCircleIcon,
};

const PlanCard: React.FC<{
  plan: SubscriptionPlanConfig;
  currentPlan: UserPlan;
  isGuest: boolean;
  loadingPlan: UserPlan | null;
  onSubscribe: (plan: UserPlan) => Promise<void>;
}> = ({ plan, currentPlan, isGuest, loadingPlan, onSubscribe }) => {
  const isCurrent = !isGuest && plan.id === currentPlan;
  const isLoading = loadingPlan === plan.id;
  const isFree = plan.id === UserPlan.Free;
  const priceDisplay = formatSubscriptionPrice(plan);

  let buttonText = isGuest && isPaidPlan(plan.id) ? 'Zarejestruj się i wybierz' : 'Przejdź do płatności';
  let buttonDisabled = isLoading;

  if (isCurrent) {
    buttonText = 'Obecny plan';
    buttonDisabled = true;
  } else if (isFree) {
    buttonText = isGuest ? 'Plan startowy' : 'Plan darmowy';
    buttonDisabled = true;
  }

  const cardClasses = `border-2 rounded-xl p-6 flex flex-col h-full transition-all duration-300 relative ${
    plan.recommended
      ? 'border-blue-500 bg-blue-50 dark:bg-gray-800/50 md:scale-[1.02]'
      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
  }`;

  let buttonClasses =
    'w-full mt-auto py-3 px-4 text-sm font-bold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ';
  if (isCurrent || isFree) {
    buttonClasses += 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  } else if (plan.recommended) {
    buttonClasses += 'bg-blue-600 text-white hover:bg-blue-700';
  } else {
    buttonClasses += 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800';
  }

  return (
    <div className={cardClasses}>
      {plan.recommended && (
        <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1 text-xs font-semibold text-white bg-blue-500 rounded-full uppercase tracking-wider">
            Polecany
          </span>
        </div>
      )}
      {plan.savingsPercent > 0 && !plan.recommended && (
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded-full">
            −{plan.savingsPercent}% / kredyt
          </span>
        </div>
      )}
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center">{plan.namePl}</h3>
      <div className="text-center my-4">
        <p className="text-4xl font-bold text-gray-900 dark:text-white">
          {priceDisplay.primary}
          <span className="text-base font-normal text-gray-500 dark:text-gray-400">/mies.</span>
        </p>
        {priceDisplay.secondary && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{priceDisplay.secondary}</p>
        )}
        {priceDisplay.perCredit && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{priceDisplay.perCredit}</p>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 min-h-[2.5rem]">{plan.descriptionPl}</p>

      <div className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature) => {
          const Icon = FEATURE_ICONS[feature.id] ?? CheckCircleIcon;
          return (
            <div key={feature.id} className="flex items-start gap-3">
              <Icon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{feature.labelPl}</span>
              {feature.limit && (
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                  {feature.limit}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className={buttonClasses}
        onClick={() => onSubscribe(plan.id)}
        disabled={buttonDisabled}
      >
        {isLoading ? 'Przekierowanie…' : buttonText}
      </button>
    </div>
  );
};

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  onSubscriptionSuccess,
  onSignUpRequest,
}) => {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<UserPlan | null>(null);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (newPlan: UserPlan) => {
    setError(null);

    if (newPlan === UserPlan.Free) return;
    if (!isPaidPlan(newPlan)) return;

    if (!user) {
      setPendingCheckoutPlan(newPlan);
      onSignUpRequest?.(newPlan);
      return;
    }

    if (user.plan === newPlan) return;

    setLoadingPlan(newPlan);
    try {
      await redirectToSubscriptionCheckout(newPlan);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Nie udało się rozpocząć płatności.');
      setLoadingPlan(null);
    }
  };

  const handleCreditPack = async (packId: string) => {
    setError(null);
    if (!user) {
      setError('Zaloguj się, aby kupić pakiet kredytów.');
      return;
    }
    setLoadingPack(packId);
    try {
      await redirectToCreditPackCheckout(packId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Nie udało się rozpocząć płatności.');
      setLoadingPack(null);
    }
  };

  if (!isOpen) return null;

  const displayPlans = SUBSCRIPTION_PLANS.filter((p) => p.id !== UserPlan.Enterprise);

  return (
    <div
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fade-in"
      style={{ animationDuration: '0.3s' }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-6 md:p-8 w-full max-w-7xl m-4 relative overflow-y-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-2xl leading-none"
          aria-label="Zamknij"
        >
          ×
        </button>

        <div className="text-center max-w-2xl mx-auto pr-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Plany subskrypcji</h2>
          <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">
            Wyższy plan = więcej kredytów i niższy koszt za kredyt. Płatność w USD (Stripe).
          </p>
        </div>

        {!user && (
          <div className="mt-6 max-w-2xl mx-auto rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-800 dark:text-blue-200 text-center">
            Wybierz plan — po rejestracji przeniesiemy Cię do bezpiecznej płatności Stripe.
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-3 rounded-md text-sm text-center max-w-2xl mx-auto">
            {error}
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-6 items-stretch">
          {displayPlans.map((plan) => (
            <PlanCard
              key={plan.stripeKey}
              plan={plan}
              currentPlan={user?.plan || UserPlan.Free}
              isGuest={!user}
              loadingPlan={loadingPlan}
              onSubscribe={handleSubscribe}
            />
          ))}
        </div>

        {/* Enterprise */}
        {(() => {
          const ent = SUBSCRIPTION_PLANS.find((p) => p.id === UserPlan.Enterprise)!;
          const entPrice = formatSubscriptionPrice(ent);
          return (
            <div className="mt-8 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gray-50 dark:bg-gray-800/40">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{ent.namePl}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{ent.descriptionPl}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {entPrice.primary}
                  <span className="text-sm font-normal text-gray-500">/mies.</span>
                </p>
                {entPrice.secondary && (
                  <p className="text-xs text-gray-400 mt-0.5">{entPrice.secondary}</p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                {user && (
                  <button
                    type="button"
                    disabled={loadingPlan === UserPlan.Enterprise}
                    onClick={() => handleSubscribe(UserPlan.Enterprise)}
                    className="px-5 py-2.5 text-sm font-bold rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-50"
                  >
                    {loadingPlan === UserPlan.Enterprise ? 'Przekierowanie…' : 'Wybierz Enterprise'}
                  </button>
                )}
                <a
                  href="mailto:support@aicontentpro.app?subject=Enterprise%20Generator%20Postów"
                  className="px-5 py-2.5 text-sm font-medium text-center rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-800"
                >
                  Kontakt sprzedaż
                </a>
              </div>
            </div>
          );
        })()}

        {/* Pakiety kredytów */}
        <div className="mt-12">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center">Pakiety kredytów</h3>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2 mb-6">
            Jednorazowy zakup — kredyty nie wygasają przy aktywnym koncie.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CREDIT_PACKS.map((pack) => {
              const packPrice = formatCreditPackPrice(pack);
              return (
              <div
                key={pack.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 bg-white dark:bg-gray-800 flex flex-col"
              >
                {pack.badge && (
                  <span className="self-start text-xs font-bold text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full mb-2">
                    {pack.badge}
                  </span>
                )}
                <h4 className="font-semibold text-gray-900 dark:text-white">{pack.namePl}</h4>
                <p className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
                  {pack.credits.toLocaleString('pl-PL')}
                  <span className="text-sm font-normal text-gray-500 ml-1">kredytów</span>
                </p>
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 mt-1">
                  {packPrice.primary}
                </p>
                <p className="text-xs text-gray-400">{packPrice.secondary}</p>
                {packPrice.perCredit && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">{packPrice.perCredit}</p>
                )}
                <button
                  type="button"
                  disabled={!user || loadingPack === pack.id}
                  onClick={() => handleCreditPack(pack.id)}
                  className="mt-4 w-full py-2 text-sm font-bold rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50"
                >
                  {loadingPack === pack.id ? 'Przekierowanie…' : 'Kup pakiet'}
                </button>
              </div>
            );
            })}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          PLN: ceny orientacyjne (kurs ~4,2 PLN/USD). Rozliczenie w USD na fakturze Stripe.
          Pakiety jednorazowe mają wyższy koszt/kredyt niż subskrypcja — subskrypcja się opłaca przy regularnym użyciu.
        </p>
      </div>
    </div>
  );
};
