import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from './icons/SparklesIcon';
import { CampaignIcon } from './icons/CampaignIcon';
import { ChartPieIcon } from './icons/ChartPieIcon';
import { IdentificationIcon } from './icons/IdentificationIcon';
import { TargetIcon } from './icons/TargetIcon';
import { PencilIcon } from './icons/PencilIcon';
import { SendIcon } from './icons/SendIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';

interface HomeViewProps {
  // onNavigateToApp is no longer needed
}

const HeroSection: React.FC<{ onNavigateToApp: () => void }> = ({ onNavigateToApp }) => {
  const { t } = useTranslation();

  return (
    <section className="text-center pt-16 md:pt-24 pb-16 px-4">
      <div className="animate-fade-in-down">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          {t('home.hero.title_part1')}
          <span className="block gradient-text mt-2 animate-float">
            {t('home.hero.title_part2')}
          </span>
        </h1>
      </div>
      <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-slate-600 dark:text-slate-300 animate-fade-in-up">
        {t('home.hero.subtitle')}
      </p>
      <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4 animate-fade-in">
        <button
          onClick={onNavigateToApp}
          className="flex items-center gap-3 px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-2xl shadow-xl transform hover:scale-105 hover:shadow-2xl transition-all active:scale-95 card-hover"
        >
          <SparklesIcon className="w-6 h-6 animate-pulse" />
          {t('home.hero.cta')}
        </button>
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 animate-fade-in">{t('home.hero.sub_cta')}</p>
      
      <div className="mt-16 max-w-5xl mx-auto animate-scale-in">
          <div className="relative rounded-3xl shadow-2xl glass p-3 card-hover">
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
                  <div className="h-full w-full flex">
                      <div className="w-1/3 p-4 border-r border-slate-200 dark:border-slate-700">
                          <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 dark:from-purple-900/50 dark:to-blue-900/50 rounded-full w-3/4 mb-4 shimmer"></div>
                          <div className="space-y-3">
                              <div className="h-10 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl shimmer"></div>
                              <div className="h-10 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl w-5/6 shimmer"></div>
                              <div className="h-10 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl shimmer"></div>
                          </div>
                      </div>
                      <div className="w-2/3 p-4">
                          <div className="h-4 bg-gradient-to-r from-purple-200 to-blue-200 dark:from-purple-900/50 dark:to-blue-900/50 rounded-full w-1/2 mb-4 shimmer"></div>
                          <div className="aspect-square bg-gradient-to-br from-purple-100 via-pink-100 to-blue-200 dark:from-purple-900/50 dark:via-pink-900/50 dark:to-blue-900/50 rounded-2xl flex items-center justify-center shadow-inner">
                              <SparklesIcon className="w-16 h-16 text-purple-500 dark:text-purple-400 opacity-50 animate-float"/>
                          </div>
                      </div>
                  </div>
              </div>
               <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-2xl flex items-center justify-center text-white shadow-2xl animate-float rotate-12">
                  <SparklesIcon className="w-10 h-10"/>
              </div>
          </div>
      </div>
    </section>
  );
};

const TrustBar = () => (
    <section className="py-8">
        <div className="container mx-auto">
            <p className="text-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Zaufali nam najlepsi
            </p>
            <div className="mt-4 flex justify-center items-center gap-8 md:gap-12 flex-wrap text-gray-400 dark:text-gray-600">
                <span className="font-bold text-lg">TechFlow</span>
                <span className="font-bold text-lg">Innovate Inc.</span>
                <span className="font-bold text-lg">MarketingPRO</span>
                <span className="font-bold text-lg">StartUp Weekly</span>
                <span className="font-bold text-lg">Creative Solutions</span>
            </div>
        </div>
    </section>
);


const HowItWorksSection = () => {
    const steps = [
        {
            icon: TargetIcon,
            title: "1. Opisz swój cel",
            description: "Powiedz AI, o czym ma być post, kto jest Twoją publicznością i jaki ton chcesz uzyskać."
        },
        {
            icon: PencilIcon,
            title: "2. Wybierz styl",
            description: "Dopasuj platformę, typ treści i styl wizualny, aby idealnie trafić w gusta odbiorców."
        },
        {
            icon: SendIcon,
            title: "3. Generuj i publikuj",
            description: "Otrzymaj gotowe treści w kilka sekund. Skopiuj, zaplanuj lub edytuj, aby były idealne."
        }
    ];

    return (
        <section className="py-16 md:py-24">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Prostota w 3 krokach</h2>
                <p className="mt-4 max-w-xl mx-auto text-gray-500 dark:text-gray-400">
                    Od pomysłu do gotowego posta w mniej niż minutę.
                </p>
            </div>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                {steps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                        <div key={index} className="text-center p-6 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50">
                            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full mx-auto mb-4">
                                <Icon className="w-8 h-8 text-blue-600 dark:text-blue-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">{step.description}</p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

const FeatureHighlight: React.FC<{
  icon: React.FC<any>;
  title: string;
  description: string;
  imageMockup: React.ReactNode;
  reverse?: boolean;
}> = ({ icon: Icon, title, description, imageMockup, reverse = false }) => (
  <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${reverse ? 'lg:grid-flow-col-dense' : ''}`}>
    <div className={`${reverse ? 'lg:col-start-2' : ''}`}>
      <div className="inline-flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
          <Icon className="w-5 h-5 text-blue-600 dark:text-blue-300" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-gray-500 dark:text-gray-400">{description}</p>
    </div>
    <div className={`mt-10 lg:mt-0 ${reverse ? 'lg:col-start-1' : ''}`}>
      {imageMockup}
    </div>
  </div>
);

const TestimonialsSection = () => {
    const testimonials = [
        {
            quote: "AI Content Pro zrewolucjonizowało naszą strategię w mediach społecznościowych. Oszczędzamy godziny każdego tygodnia, a nasze zaangażowanie wzrosło o 300%!",
            name: "Anna Kowalska",
            role: "Marketing Manager, Innovate Inc."
        },
        {
            quote: "Jako freelancer, to narzędzie jest dla mnie bezcenne. Planer kampanii i analityka AI dają mi przewagę, której potrzebowałem, aby konkurować z większymi agencjami.",
            name: "Piotr Nowak",
            role: "Social Media Freelancer"
        },
    ];

    return (
        <section className="py-16 md:py-24 bg-gray-50 dark:bg-gray-900/50">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Nie wierz nam na słowo</h2>
                <p className="mt-4 max-w-xl mx-auto text-gray-500 dark:text-gray-400">
                    Zobacz, co mówią nasi klienci o transformacji swojej pracy.
                </p>
            </div>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {testimonials.map((t, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <p className="text-gray-600 dark:text-gray-300 italic">"{t.quote}"</p>
                        <div className="flex items-center gap-3 mt-4">
                            <UserCircleIcon className="w-10 h-10 text-gray-400"/>
                            <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{t.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t.role}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

const FinalCTASection: React.FC<{ onNavigateToApp: () => void }> = ({ onNavigateToApp }) => (
    <section className="text-center py-16 md:py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Gotowy zrewolucjonizować swoje media społecznościowe?</h2>
        <p className="mt-4 max-w-xl mx-auto text-gray-500 dark:text-gray-400">
          Dołącz do tysięcy twórców i marketerów, którzy oszczędzają czas i osiągają lepsze wyniki.
        </p>
        <div className="mt-8">
          <button
            onClick={onNavigateToApp}
            className="flex items-center gap-2 px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-purple-500 to-blue-500 rounded-md hover:opacity-90 transition-opacity shadow-lg transform hover:scale-105"
          >
            Wypróbuj AI Content Pro za darmo
          </button>
        </div>
      </section>
);


export const HomeView: React.FC<HomeViewProps> = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  
  const handleNavigateToApp = () => {
      if(user) {
        navigate('/generator');
      } else {
        // In a real app, you might want to open a sign-up modal
        // For now, we'll just navigate, and the protected route will handle it
        navigate('/generator');
      }
  };

  return (
    <div className="animate-fade-in">
      <HeroSection onNavigateToApp={handleNavigateToApp} />
      <TrustBar />
      <HowItWorksSection />

      {/* Features Section */}
      <section className="py-16 md:py-24 space-y-24">
        <FeatureHighlight 
            icon={SparklesIcon}
            title="Generator Treści AI"
            description="Twórz unikalne posty, reklamy i pomysły wideo dopasowane do Twojej marki. Nasz zaawansowany silnik AI rozumie kontekst i generuje treści, które angażują, informują i sprzedają."
            imageMockup={
                <div className="rounded-xl p-4 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
                    <p className="text-xs font-semibold text-gray-400 mb-2">Podgląd dla Facebook</p>
                    <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                        </div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    </div>
                </div>
            }
        />
        <FeatureHighlight 
            icon={CampaignIcon}
            title="Planer Kampanii AI"
            description="Przestań zgadywać. Zdefiniuj swój cel marketingowy, a nasza AI stworzy dla Ciebie kompletny, wielodniowy harmonogram postów z konkretnymi pomysłami na treść, grafikę i wezwania do działania."
            imageMockup={
                <div className="rounded-xl p-4 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: 14 }).map((_, i) => (
                            <div key={i} className={`aspect-square rounded ${i % 3 === 0 ? 'bg-blue-300 dark:bg-blue-800' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                        ))}
                    </div>
                </div>
            }
            reverse
        />
        <FeatureHighlight 
            icon={ChartPieIcon}
            title="Analityka i Optymalizacja"
            description="Połącz kropki między treścią a wynikami. Importuj swoje dane, a AI zidentyfikuje najskuteczniejsze posty, optymalne czasy publikacji i dostarczy praktycznych wskazówek do maksymalizacji zasięgu."
            imageMockup={
                 <div className="rounded-xl p-4 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    <div className="flex items-end gap-2 h-24">
                        <div className="w-1/4 h-1/2 bg-blue-300 dark:bg-blue-800 rounded-t-md"></div>
                        <div className="w-1/4 h-3/4 bg-blue-300 dark:bg-blue-800 rounded-t-md"></div>
                        <div className="w-1/4 h-full bg-blue-300 dark:bg-blue-800 rounded-t-md"></div>
                        <div className="w-1/4 h-1/3 bg-blue-300 dark:bg-blue-800 rounded-t-md"></div>
                    </div>
                 </div>
            }
        />
      </section>

      <TestimonialsSection />
      <FinalCTASection onNavigateToApp={handleNavigateToApp} />
    </div>
  );
};