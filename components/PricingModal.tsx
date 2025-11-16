import React, { useState } from 'react';
import { PostIcon } from './icons/PostIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { CampaignIcon } from './icons/CampaignIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToPlan } from '../services/subscriptionService';
import { UserPlan } from '../types';


interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscriptionSuccess: () => void;
}

const PlanCard: React.FC<{
    plan: UserPlan;
    planName: string;
    price: string;
    description: string;
    features: { icon: React.FC<any>, text: string, limit?: string }[];
    isRecommended?: boolean;
    currentPlan: UserPlan;
    onSubscribe: (plan: UserPlan) => Promise<void>;
    isLoading: boolean;
}> = ({ plan, planName, price, description, features, isRecommended, currentPlan, onSubscribe, isLoading }) => {
    const isCurrent = plan === currentPlan;
    
    let buttonText = 'Wybierz';
    let buttonDisabled = isLoading;
    if (isCurrent) {
        buttonText = 'Obecny plan';
        buttonDisabled = true;
    }

    const cardClasses = `border-2 rounded-xl p-6 flex flex-col h-full transition-all duration-300 relative ${isRecommended ? 'border-blue-500 bg-blue-50 dark:bg-gray-800/50 transform md:scale-105' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`;
    
    let buttonClasses = `w-full mt-auto py-3 px-4 text-sm font-bold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed `;
    if (isCurrent) {
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
                    <span className="px-4 py-1 text-xs font-semibold text-white bg-blue-500 rounded-full uppercase tracking-wider">Polecany</span>
                </div>
            )}
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center">{planName}</h3>
            <p className="text-4xl font-bold text-gray-900 dark:text-white text-center my-4">{price}<span className="text-base font-normal text-gray-500 dark:text-gray-400">/miesiąc</span></p>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 h-10">{description}</p>
            
            <div className="space-y-4 mb-8">
                {features.map(({ icon: Icon, text, limit }, index) => (
                    <div key={index} className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{text}</span>
                        {limit && <span className="ml-auto text-sm font-semibold text-gray-800 dark:text-gray-100">{limit}</span>}
                    </div>
                ))}
            </div>
            
            <button className={buttonClasses} onClick={() => onSubscribe(plan)} disabled={buttonDisabled}>
                {isLoading ? 'Przetwarzanie...' : buttonText}
            </button>
        </div>
    );
};


export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onSubscriptionSuccess }) => {
  const { user, updateUserPlan } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (newPlan: UserPlan) => {
    if (!user) {
        setError("Musisz być zalogowany, aby zmienić plan.");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
        const updatedUser = await subscribeToPlan(user.id, newPlan);
        updateUserPlan(updatedUser.plan);
        onSubscriptionSuccess();
        onClose();
    } catch (err: any) {
        setError(err.message || 'Nie udało się zaktualizować subskrypcji.');
    } finally {
        setIsLoading(false);
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
        description: 'Pełen pakiet mocy dla profesjonalistów i małych firm. Optymalizuj strategię i wyprzedź konkurencję.',
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
        description: 'Skalowalne rozwiązanie dla agencji i dużych zespołów. Zarządzaj wieloma klientami bez ograniczeń.',
        features: [
            { icon: PostIcon, text: 'Posty tekstowe', limit: '2000' },
            { icon: PhotoIcon, text: 'Posty z obrazem', limit: '300' },
            { icon: VideoCameraIcon, text: 'Generowanie wideo', limit: '30' },
            { icon: CampaignIcon, text: 'Nielimitowane kampanie AI' },
            { icon: CheckCircleIcon, text: 'Funkcje zespołowe' },
            { icon: CheckCircleIcon, text: 'Nielimitowane Profile Głosu Marki' },
        ],
    }
  ];

  return (
    <div
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fade-in"
      style={{ animationDuration: '0.3s' }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-8 w-full max-w-7xl m-4 transform transition-all relative overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">&times;</button>
        
        <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Wybierz plan, który do Ciebie pasuje</h2>
            <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">Odblokuj pełen potencjał AI w swoich mediach społecznościowych.</p>
        </div>

        {error && <div className="mt-6 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-3 rounded-md text-sm text-center">{error}</div>}

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 items-stretch">
            {plans.map(plan => 
                <PlanCard 
                    key={plan.planName} 
                    {...plan} 
                    currentPlan={user?.plan || UserPlan.Free} 
                    onSubscribe={handleSubscribe}
                    isLoading={isLoading}
                />
            )}
        </div>
         <div className="text-center mt-12">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Potrzebujesz więcej?</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Skontaktuj się z nami w sprawie planu Business z niestandardowymi limitami, integracjami i dedykowanym wsparciem.</p>
            <button className="mt-4 px-5 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors">
                Porozmawiaj z działem sprzedaży
            </button>
        </div>
      </div>
    </div>
  );
};
