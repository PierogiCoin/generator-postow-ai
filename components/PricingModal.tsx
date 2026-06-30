import React, { useState } from 'react';
import { PostIcon } from './icons/PostIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { CampaignIcon } from './icons/CampaignIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { useAuth } from '../contexts/AuthContext';
import {
  isPaidPlan,
  redirectToSubscriptionCheckout,
  setPendingCheckoutPlan,
} from '../services/paymentService';
import { UserPlan } from '../types';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionSuccess: () => void;
  onSignUpRequest?: (plan: UserPlan) => void;
}

const PlanCard: React.FC<{
  plan: UserPlan;
  planName: string;
  price: string;
  description: string;
  features: { icon: React.FC<{ className?: string }>; text: string; limit?: string }[];
  isRecommended?: boolean;
  currentPlan: UserPlan;
  isGuest: boolean;
  loadingPlan: UserPlan | null;
  onSubscribe: (plan: UserPlan) => Promise<void>;
}> = ({
  plan,
  planName,
  price,
  description,
  features,
  isRecommended,
  currentPlan,
  isGuest,
  loadingPlan,
  onSubscribe,
}) => {
  const isCurrent = !isGuest && plan === currentPlan;
  const isLoading = loadingPlan === plan;

  let buttonText = isGuest && isPaidPlan(plan) ? 'Zarejestruj się i wybierz' : 'Przejdź do płatności';
  let buttonDisabled = isLoading;

  if (isCurrent) {
    buttonText = 'Obecny plan';
    buttonDisabled = true;
  } else if (plan === UserPlan.Free) {
    buttonText = isGuest ? 'Plan startowy' : 'Plan darmowy';
    buttonDisabled = true;
  }

  const cardClasses = `border-2 rounded-xl p-6 flex flex-col h-full transition-all duration-300 relative ${isRecommended ? 'border-blue-500 bg-blue-50 dark:bg-gray-800/50 transform md:scale-105' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`;

  let buttonClasses =
    'w-full mt-auto py-3 px-4 text-sm font-bold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ';
  if (isCurrent || plan === UserPlan.Free) {
    buttonClasses += 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  } else if (isRecommended) {
    buttonClasses += 'bg-blue-600 text-white hover:bg-blue-700';
  } else {
    buttonClasses += 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800';
  }

  return (
    <div className={cardClasses}>
      {isRecommended && (
        <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1 text-xs font-semibold text-white bg-blue-500 rounded-full uppercase tracking-wider">
            Polecany
          </span>
        </div>
      )}
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center">{planName}</h3>
      <p className="text-4xl font-bold text-gray-900 dark:text-white text-center my-4">
        {price}
        <span className="text-base font-normal text-gray-500 dark:text-gray-400">/miesiąc</span>
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 h-10">{description}</p>

      <div className="space-y-4 mb-8">
        {features.map(({ icon: Icon, text, limit }) => (
          <div key={`feature-${text}`} className="flex items-center gap-3">
            <Icon className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{text}</span>
            {limit && (
              <span className="ml-auto text-sm font-semibold text-gray-800 dark:text-gray-100">{limit}</span>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        className={buttonClasses}
        onClick={() => onSubscribe(plan)}
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
      // Przekierowanie — onSubscriptionSuccess po powrocie z Stripe (webhook + dashboard)
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Nie udało się rozpocząć płatności.';
      setError(errorMessage);
      setLoadingPlan(null);
    }
  };

  if (!isOpen) return null;

  const plans = [
    {
      plan: UserPlan.Free,
      planName: 'Free',
      price: '0 zł',
      description: 'Idealny na start. Wypróbuj podstawowe funkcje i poczuj moc AI.',
      features: [
        { icon: PostIcon, text: 'Posty tekstowe', limit: '10' },
        { icon: PhotoIcon, text: 'Posty z obrazem', limit: '3' },
        { icon: CampaignIcon, text: 'Planowanie kampanii AI', limit: '1' },
      ],
    },
    {
      plan: UserPlan.Creator,
      planName: 'Creator',
      price: '49 zł',
      description: 'Dla twórców i freelancerów, którzy publikują regularnie.',
      features: [
        { icon: PostIcon, text: 'Posty tekstowe', limit: '100' },
        { icon: PhotoIcon, text: 'Posty z obrazem', limit: '20' },
        { icon: VideoCameraIcon, text: 'Generowanie wideo', limit: '2' },
        { icon: CampaignIcon, text: 'Planowanie kampanii AI', limit: '5' },
        { icon: CheckCircleIcon, text: '1 Głos Marki' },
      ],
    },
    {
      plan: UserPlan.Pro,
      planName: 'Pro',
      price: '99 zł',
      description: 'Pełen pakiet mocy dla profesjonalistów i małych firm.',
      features: [
        { icon: PostIcon, text: 'Posty tekstowe', limit: '500' },
        { icon: PhotoIcon, text: 'Posty z obrazem', limit: '100' },
        { icon: VideoCameraIcon, text: 'Generowanie wideo', limit: '10' },
        { icon: CampaignIcon, text: 'Planowanie kampanii AI', limit: '20' },
        { icon: CheckCircleIcon, text: 'Zaawansowana analityka i strategista AI' },
        { icon: CheckCircleIcon, text: '5 Profili Głosu Marki' },
      ],
      isRecommended: true,
    },
    {
      plan: UserPlan.Agency,
      planName: 'Agency',
      price: '249 zł',
      description: 'Skalowalne rozwiązanie dla agencji i dużych zespołów.',
      features: [
        { icon: PostIcon, text: 'Posty tekstowe', limit: '2000' },
        { icon: PhotoIcon, text: 'Posty z obrazem', limit: '300' },
        { icon: VideoCameraIcon, text: 'Generowanie wideo', limit: '30' },
        { icon: CampaignIcon, text: 'Nielimitowane kampanie AI' },
        { icon: CheckCircleIcon, text: 'Funkcje zespołowe' },
        { icon: CheckCircleIcon, text: 'Nielimitowane Profile Głosu Marki' },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fade-in"
      style={{ animationDuration: '0.3s' }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-8 w-full max-w-7xl m-4 transform transition-all relative overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          &times;
        </button>

        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Wybierz plan, który do Ciebie pasuje
          </h2>
          <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">
            Bezpieczna płatność przez Stripe. Anuluj w dowolnym momencie.
          </p>
        </div>

        {!user && (
          <div className="mt-6 max-w-2xl mx-auto rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-800 dark:text-blue-200 text-center">
            Wybierz plan — po rejestracji przeniesiemy Cię od razu do bezpiecznej płatności Stripe.
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-3 rounded-md text-sm text-center">
            {error}
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 items-stretch">
          {plans.map((plan) => (
            <PlanCard
              key={plan.planName}
              {...plan}
              currentPlan={user?.plan || UserPlan.Free}
              isGuest={!user}
              loadingPlan={loadingPlan}
              onSubscribe={handleSubscribe}
            />
          ))}
        </div>

        <div className="text-center mt-12">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Potrzebujesz więcej?</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Skontaktuj się w sprawie planu Business z niestandardowymi limitami i dedykowanym wsparciem.
          </p>
          <a
            href="mailto:support@aicontentpro.app"
            className="inline-block mt-4 px-5 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors"
          >
            Porozmawiaj z działem sprzedaży
          </a>
        </div>
      </div>
    </div>
  );
};
