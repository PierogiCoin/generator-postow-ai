/**
 * UI EXAMPLES - Przykłady użycia nowego Design System
 * 
 * Ten plik zawiera ready-to-use przykłady komponentów.
 * Skopiuj i dostosuj do swoich potrzeb!
 */

import React from 'react';
import { ModernButton, ModernCard, ModernInput } from './components/ui';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { HeartIcon } from './components/icons/HeartIcon';

// ============================================
// PRZYKŁAD 1: Hero Section z Animacjami
// ============================================
export const HeroExample = () => (
  <section className="text-center py-20 px-4">
    <div className="animate-fade-in-down">
      <h1 className="text-5xl md:text-7xl font-bold gradient-text animate-float">
        Twój Niesamowity Tytuł
      </h1>
    </div>
    
    <p className="mt-6 text-xl text-slate-600 dark:text-slate-300 animate-fade-in-up max-w-2xl mx-auto">
      Opis który sprzedaje Twój produkt w prosty i zrozumiały sposób.
    </p>
    
    <div className="mt-8 flex gap-4 justify-center animate-fade-in">
      <ModernButton variant="gradient" size="lg" icon={<SparklesIcon className="w-6 h-6" />}>
        Rozpocznij Za Darmo
      </ModernButton>
      <ModernButton variant="outline" size="lg">
        Zobacz Demo
      </ModernButton>
    </div>
  </section>
);

// ============================================
// PRZYKŁAD 2: Feature Cards Grid
// ============================================
export const FeatureCardsExample = () => {
  const features = [
    { title: 'Szybkie', description: 'Lightning fast performance', color: 'from-blue-500 to-cyan-500' },
    { title: 'Bezpieczne', description: 'Enterprise-grade security', color: 'from-purple-500 to-pink-500' },
    { title: 'Skalowalne', description: 'Grows with your business', color: 'from-orange-500 to-red-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
      {features.map((feature, i) => (
        <ModernCard 
          key={`feature-${feature.title}`} 
          glass 
          hover 
          padding="lg"
          className="animate-scale-in"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg animate-float`}>
            <SparklesIcon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold gradient-text mb-2">{feature.title}</h3>
          <p className="text-slate-600 dark:text-slate-300">{feature.description}</p>
        </ModernCard>
      ))}
    </div>
  );
};

// ============================================
// PRZYKŁAD 3: Stats Dashboard
// ============================================
export const StatsDashboardExample = () => {
  const stats = [
    { label: 'Użytkownicy', value: '10K+', color: 'bg-gradient-to-br from-blue-500 to-cyan-500' },
    { label: 'Posty', value: '50K+', color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
    { label: 'Zasięg', value: '1M+', color: 'bg-gradient-to-br from-orange-500 to-red-500' },
    { label: 'Zadowolenie', value: '99%', color: 'bg-gradient-to-br from-green-500 to-teal-500' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
      {stats.map((stat, i) => (
        <ModernCard 
          key={`stat-${stat.label}`} 
          glass 
          hover 
          padding="md"
          className="animate-slide-in-up"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center shadow-lg`}>
              <HeartIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold gradient-text">{stat.value}</p>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{stat.label}</p>
            </div>
          </div>
        </ModernCard>
      ))}
    </div>
  );
};

// ============================================
// PRZYKŁAD 4: Form z Walidacją
// ============================================
export const FormExample = () => {
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Your logic here
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <ModernCard glass padding="lg" className="max-w-md mx-auto animate-scale-in">
      <h2 className="text-2xl font-bold gradient-text mb-6">Dołącz do nas</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <ModernInput
          label="Adres Email"
          type="email"
          placeholder="twoj@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          fullWidth
          icon={<HeartIcon className="w-5 h-5" />}
        />
        
        <ModernButton 
          variant="gradient" 
          size="lg" 
          fullWidth 
          loading={loading}
          icon={<SparklesIcon className="w-5 h-5" />}
        >
          {loading ? 'Wysyłanie...' : 'Rozpocznij'}
        </ModernButton>
      </form>
    </ModernCard>
  );
};

// ============================================
// PRZYKŁAD 5: Pricing Cards
// ============================================
export const PricingExample = () => {
  const plans = [
    { name: 'Start', price: '0', features: ['10 postów/mies', 'Podstawowe AI', '1 platforma'] },
    { name: 'Pro', price: '49', features: ['Bez limitów', 'Zaawansowane AI', 'Wszystkie platformy', 'Analytics'], popular: true },
    { name: 'Agency', price: '149', features: ['Wszystko z Pro', 'Zespoły', 'White label', 'API access'] },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
      {plans.map((plan, i) => (
        <ModernCard
          key={`plan-${plan.name}`}
          glass={!plan.popular}
          hover
          padding="lg"
          className={`animate-scale-in relative ${plan.popular ? 'ring-4 ring-purple-500 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20' : ''}`}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {plan.popular && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full text-white text-sm font-bold shadow-lg">
              Najpopularniejszy
            </div>
          )}
          
          <h3 className="text-2xl font-bold gradient-text mb-2">{plan.name}</h3>
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-5xl font-bold gradient-text">{plan.price}</span>
            <span className="text-slate-600 dark:text-slate-400">zł/mies</span>
          </div>
          
          <ul className="space-y-3 mb-8">
            {plan.features.map((feature, j) => (
              <li key={j} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <SparklesIcon className="w-5 h-5 text-purple-500" />
                {feature}
              </li>
            ))}
          </ul>
          
          <ModernButton
            variant={plan.popular ? 'gradient' : 'outline'}
            fullWidth
            icon={<SparklesIcon className="w-5 h-5" />}
          >
            Wybierz Plan
          </ModernButton>
        </ModernCard>
      ))}
    </div>
  );
};

// ============================================
// PRZYKŁAD 6: Mobile Bottom Sheet
// ============================================
export const MobileBottomSheetExample = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 glass rounded-t-3xl p-6 animate-slide-in-up max-h-[80vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-6" />
        
        <h2 className="text-2xl font-bold gradient-text mb-4">Opcje</h2>
        
        <div className="space-y-3">
          {['Edytuj', 'Udostępnij', 'Zaplanuj', 'Usuń'].map((action, i) => (
            <button
              key={`action-${action}`}
              className="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// PRZYKŁAD 7: Loading States
// ============================================
export const LoadingStatesExample = () => (
  <div className="space-y-8 p-6">
    {/* Skeleton Card */}
    <ModernCard glass padding="lg">
      <div className="space-y-4">
        <div className="h-6 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-lg w-3/4 shimmer" />
        <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-lg shimmer" />
        <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-lg w-5/6 shimmer" />
      </div>
    </ModernCard>

    {/* Spinner Button */}
    <ModernButton variant="gradient" size="lg" loading>
      Ładowanie...
    </ModernButton>

    {/* Pulse */}
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full animate-pulse" />
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2" />
      </div>
    </div>
  </div>
);

// ============================================
// PRZYKŁAD 8: Toast Notifications
// ============================================
export const ToastExample = ({ message, type = 'success' }: { message: string; type?: 'success' | 'error' | 'info' }) => {
  const colors = {
    success: 'from-green-500 to-emerald-500',
    error: 'from-red-500 to-pink-500',
    info: 'from-blue-500 to-cyan-500',
  };

  return (
    <div className="fixed top-20 right-4 glass p-4 rounded-2xl shadow-2xl animate-slide-in-right max-w-sm">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${colors[type]} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <SparklesIcon className="w-5 h-5 text-white" />
        </div>
        <p className="text-slate-800 dark:text-white font-medium">{message}</p>
      </div>
    </div>
  );
};

// ============================================
// UŻYCIE W APLIKACJI
// ============================================

/*
// 1. Importuj komponenty
import { HeroExample, FeatureCardsExample, StatsDashboardExample } from './UI_EXAMPLES';

// 2. Użyj w swoim komponencie
export const MyPage = () => (
  <div>
    <HeroExample />
    <FeatureCardsExample />
    <StatsDashboardExample />
  </div>
);

// 3. Lub skopiuj i dostosuj kod do swoich potrzeb!
*/
