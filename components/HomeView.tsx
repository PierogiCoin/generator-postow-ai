import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from './icons/SparklesIcon';
import { CampaignIcon } from './icons/CampaignIcon';
import { ChartPieIcon } from './icons/ChartPieIcon';
import { TargetIcon } from './icons/TargetIcon';
import { PencilIcon } from './icons/PencilIcon';
import { SendIcon } from './icons/SendIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { ModernButton, ModernCard } from './ui';

interface HomeViewProps {
  // onNavigateToApp is no longer needed
}

type HomeAnchor = 'how-it-works' | 'features' | 'testimonials' | 'faq';

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    // Safari fallback
    const legacyMedia = media as unknown as { addListener?: (fn: () => void) => void; removeListener?: (fn: () => void) => void };
    legacyMedia.addListener?.(update);
    return () => legacyMedia.removeListener?.(update);
  }, []);

  return reduced;
};

const useInViewOnce = <T extends Element>(
  options?: Pick<IntersectionObserverInit, 'rootMargin' | 'threshold'>
) => {
  const ref = React.useRef<T | null>(null);
  const [isInView, setIsInView] = React.useState(false);
  const rootMargin = options?.rootMargin;
  const threshold = options?.threshold;

  React.useEffect(() => {
    const node = ref.current;
    if (!node || isInView) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setIsInView(true);
        observer.disconnect();
      }
    }, { rootMargin, threshold });

    observer.observe(node);
    return () => observer.disconnect();
  }, [isInView, rootMargin, threshold]);

  return { ref, isInView };
};

const useCountUp = (endValue: number, start: boolean, durationMs = 900) => {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    if (!start) return;
    if (!Number.isFinite(endValue)) return;

    let frameId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(endValue * eased));
      if (t < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [durationMs, endValue, start]);

  return value;
};

const scrollToAnchor = (anchor: HomeAnchor, preferReducedMotion: boolean) => {
  const node = document.getElementById(anchor);
  if (!node) return;
  node.scrollIntoView({ behavior: preferReducedMotion ? 'auto' : 'smooth', block: 'start' });
};

const Reveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  reducedMotion: boolean;
}> = ({ children, className = '', reducedMotion }) => {
  const { ref, isInView } = useInViewOnce<HTMLDivElement>({ rootMargin: '120px 0px' });

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      className={`${className} ${isInView ? 'animate-slide-in' : 'opacity-0 translate-y-4'}`}
    >
      {children}
    </div>
  );
};

const SectionHeader: React.FC<{ title: string; subtitle: string; id?: string }> = ({ title, subtitle, id }) => (
  <div id={id} className="text-center">
    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
    <p className="mt-4 max-w-2xl mx-auto text-slate-600 dark:text-slate-300">{subtitle}</p>
  </div>
);

type PreviewMode = 'generator' | 'planner' | 'analytics';

const HeroPreview: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const [mode, setMode] = React.useState<PreviewMode>('generator');

  const tabs: Array<{ key: PreviewMode; label: string }> = [
    { key: 'generator', label: 'Generator' },
    { key: 'planner', label: 'Planer' },
    { key: 'analytics', label: 'Analityka' },
  ];

  const renderCanvas = () => {
    if (mode === 'planner') {
      return (
        <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
          <div className="p-5 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="h-3 w-32 rounded-full bg-gradient-to-r from-purple-200 to-blue-200 dark:from-purple-900/50 dark:to-blue-900/50 shimmer" />
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-slate-200 dark:bg-slate-700" />
              <div className="h-6 w-6 rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="h-3 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.35rem' }}>
              {Array.from({ length: 21 }).map((_, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-lg ${
                    i % 5 === 0
                      ? 'bg-gradient-to-br from-purple-300 to-blue-300 dark:from-purple-800 dark:to-blue-800 shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (mode === 'analytics') {
      return (
        <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
          <div className="p-5 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="h-3 w-44 rounded-full bg-gradient-to-r from-purple-200 to-blue-200 dark:from-purple-900/50 dark:to-blue-900/50 shimmer" />
            <div className="h-8 w-20 rounded-xl bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="p-5 space-y-5">
            <div className="rounded-2xl bg-white/70 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/60 p-4">
              <div className="h-3 w-28 rounded-full bg-slate-200 dark:bg-slate-700 mb-3" />
              <div className="flex items-end gap-2 h-24">
                <div className="w-1/6 h-1/2 bg-gradient-to-t from-blue-300 to-blue-400 dark:from-blue-800 dark:to-blue-700 rounded-t-lg" />
                <div className="w-1/6 h-2/3 bg-gradient-to-t from-blue-300 to-blue-400 dark:from-blue-800 dark:to-blue-700 rounded-t-lg" />
                <div className="w-1/6 h-full bg-gradient-to-t from-purple-300 to-purple-400 dark:from-purple-800 dark:to-purple-700 rounded-t-lg" />
                <div className="w-1/6 h-3/4 bg-gradient-to-t from-blue-300 to-blue-400 dark:from-blue-800 dark:to-blue-700 rounded-t-lg" />
                <div className="w-1/6 h-2/5 bg-gradient-to-t from-blue-300 to-blue-400 dark:from-blue-800 dark:to-blue-700 rounded-t-lg" />
                <div className="w-1/6 h-3/5 bg-gradient-to-t from-blue-300 to-blue-400 dark:from-blue-800 dark:to-blue-700 rounded-t-lg" />
              </div>
            </div>
            <div className="rounded-2xl bg-white/70 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/60 p-4 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-3 w-32 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 shadow-lg" />
            </div>
          </div>
        </div>
      );
    }

    // generator
    return (
      <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
        <div className="h-full w-full flex">
          <div className="w-1/3 p-5 border-r border-slate-200 dark:border-slate-700">
            <div className="h-3 bg-gradient-to-r from-purple-200 to-blue-200 dark:from-purple-900/50 dark:to-blue-900/50 rounded-full w-4/5 mb-5 shimmer" />
            <div className="space-y-3">
              <div className="h-11 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-2xl shimmer" />
              <div className="h-11 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-2xl w-5/6 shimmer" />
              <div className="h-11 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-2xl shimmer" />
            </div>
          </div>
          <div className="w-2/3 p-5">
            <div className="h-3 bg-gradient-to-r from-purple-200 to-blue-200 dark:from-purple-900/50 dark:to-blue-900/50 rounded-full w-1/2 mb-5 shimmer" />
            <div className="aspect-square bg-gradient-to-br from-purple-100 via-pink-100 to-blue-200 dark:from-purple-900/50 dark:via-pink-900/50 dark:to-blue-900/50 rounded-3xl flex items-center justify-center shadow-inner">
              <SparklesIcon className={`w-16 h-16 text-purple-500 dark:text-purple-400 opacity-50 ${reducedMotion ? '' : 'animate-float'}`} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-14 max-w-5xl mx-auto">
      <ModernCard glass hover className="relative p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 shadow-lg flex items-center justify-center text-white">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Podgląd na żywo</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Przełączaj moduły i zobacz styl UI</p>
            </div>
          </div>

          <div role="tablist" aria-label="Podgląd modułów" className="inline-flex rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 p-1 border border-slate-200/60 dark:border-slate-700/60">
            {tabs.map((t) => {
              const active = t.key === mode;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => setMode(t.key)}
                  className={`px-3 py-2 text-sm font-semibold rounded-xl transition ${
                    active
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-950`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative rounded-3xl shadow-2xl overflow-hidden">
          {renderCanvas()}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-7 -right-7 w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-2xl flex items-center justify-center text-white shadow-2xl rotate-12"
          >
            <SparklesIcon className={`w-10 h-10 ${reducedMotion ? '' : 'animate-float'}`} />
          </div>
        </div>
      </ModernCard>
    </div>
  );
};

const HeroSection: React.FC<{ onNavigateToApp: () => void; reducedMotion: boolean }> = ({ onNavigateToApp, reducedMotion }) => {
  const { t } = useTranslation();

  return (
    <section className="text-center pt-16 md:pt-24 pb-16 px-4">
      <div className="animate-fade-in-down">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
          {t('home.hero.title_part1')}
          <span className={`block gradient-text mt-2 ${reducedMotion ? '' : 'animate-float'}`}>
            {t('home.hero.title_part2')}
          </span>
        </h1>
      </div>
      <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-slate-600 dark:text-slate-300 animate-fade-in-up">
        {t('home.hero.subtitle')}
      </p>
      <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4 animate-fade-in">
        <ModernButton
          variant="gradient"
          size="lg"
          onClick={onNavigateToApp}
          icon={<SparklesIcon className={`w-6 h-6 ${reducedMotion ? '' : 'animate-pulse'}`} />}
          className="rounded-2xl px-8 py-4"
        >
          {t('home.hero.cta')}
        </ModernButton>
        <ModernButton
          variant="outline"
          size="lg"
          onClick={() => scrollToAnchor('how-it-works', reducedMotion)}
          className="rounded-2xl px-8 py-4"
        >
          Zobacz jak to działa
        </ModernButton>
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 animate-fade-in">{t('home.hero.sub_cta')}</p>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => scrollToAnchor('features', reducedMotion)}
          className="px-4 py-2 rounded-full text-sm font-semibold bg-white/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-950"
        >
          Funkcje
        </button>
        <button
          type="button"
          onClick={() => scrollToAnchor('testimonials', reducedMotion)}
          className="px-4 py-2 rounded-full text-sm font-semibold bg-white/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-950"
        >
          Opinie
        </button>
        <button
          type="button"
          onClick={() => scrollToAnchor('faq', reducedMotion)}
          className="px-4 py-2 rounded-full text-sm font-semibold bg-white/70 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900/60 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-950"
        >
          FAQ
        </button>
      </div>

      <div className="animate-scale-in">
        <HeroPreview reducedMotion={reducedMotion} />
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
            <div className="mt-6 marquee">
              <div className="marquee-track text-gray-400 dark:text-gray-600">
                {[
                  'TechFlow',
                  'Innovate Inc.',
                  'MarketingPRO',
                  'StartUp Weekly',
                  'Creative Solutions',
                  'StudioNine',
                  'EcomLabs',
                  'Growth Guild',
                ].map((brand) => (
                  <span
                    key={brand}
                    className="px-6 py-3 rounded-2xl font-bold text-lg bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-700/40"
                  >
                    {brand}
                  </span>
                ))}
                {[
                  'TechFlow',
                  'Innovate Inc.',
                  'MarketingPRO',
                  'StartUp Weekly',
                  'Creative Solutions',
                  'StudioNine',
                  'EcomLabs',
                  'Growth Guild',
                ].map((brand) => (
                  <span
                    key={`${brand}-dup`}
                    className="px-6 py-3 rounded-2xl font-bold text-lg bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-700/40"
                  >
                    {brand}
                  </span>
                ))}
              </div>
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
        <section id="how-it-works" className="py-16 md:py-24">
            <SectionHeader
              title="Prostota w 3 krokach"
              subtitle="Od pomysłu do gotowego posta w mniej niż minutę. Bez przełączania narzędzi, bez chaosu — tylko konkretny workflow."
            />
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                {steps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                        <ModernCard
                          key={index}
                          glass
                          hover
                          className="text-center p-7 relative overflow-hidden"
                        >
                          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60">
                            <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-56 bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-blue-500/20 blur-3xl" />
                          </div>
                          <div className="relative">
                            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 rounded-2xl mx-auto mb-4 border border-slate-200/60 dark:border-slate-700/60">
                              <Icon className="w-8 h-8 text-blue-600 dark:text-blue-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">{step.description}</p>
                          </div>
                        </ModernCard>
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
        <section id="testimonials" className="py-16 md:py-24 bg-gray-50/60 dark:bg-gray-900/40 rounded-3xl">
            <SectionHeader
              title="Nie wierz nam na słowo"
              subtitle="Zobacz, co mówią nasi klienci o transformacji swojej pracy i efektach w liczbach."
            />
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {testimonials.map((t, i) => (
                    <ModernCard key={i} glass hover className="p-7">
                      <div className="flex items-center gap-2 mb-4">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <span key={idx} aria-hidden="true" className="text-amber-400 text-base">
                            ★
                          </span>
                        ))}
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">5.0</span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-200 italic leading-relaxed">"{t.quote}"</p>
                      <div className="flex items-center gap-3 mt-6">
                        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 shadow-lg flex items-center justify-center text-white">
                          <UserCircleIcon className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{t.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{t.role}</p>
                        </div>
                      </div>
                    </ModernCard>
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
          <ModernButton variant="gradient" size="lg" onClick={onNavigateToApp} className="rounded-2xl px-9 py-4">
            Wypróbuj AI Content Pro za darmo
          </ModernButton>
        </div>
      </section>
);

const StatsSection: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const { ref, isInView } = useInViewOnce<HTMLDivElement>({ rootMargin: '160px 0px' });
  const shouldAnimate = isInView && !reducedMotion;

  const hours = useCountUp(12, shouldAnimate);
  const growth = useCountUp(300, shouldAnimate);
  const posts = useCountUp(30, shouldAnimate);

  return (
    <section ref={ref} className="py-10 md:py-14">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ModernCard glass hover className="p-7">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 shadow-lg flex items-center justify-center text-white">
              <SparklesIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {reducedMotion ? '12+' : `${hours}+`}h
              </p>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Oszczędności tygodniowo</p>
            </div>
          </div>
        </ModernCard>
        <ModernCard glass hover className="p-7">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg flex items-center justify-center text-white">
              <ChartPieIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {reducedMotion ? '300%' : `${growth}%`}
              </p>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Średni wzrost zaangażowania</p>
            </div>
          </div>
        </ModernCard>
        <ModernCard glass hover className="p-7">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500 to-blue-500 shadow-lg flex items-center justify-center text-white">
              <CampaignIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {reducedMotion ? '30+' : `${posts}+`}
              </p>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Treści na kampanię</p>
            </div>
          </div>
        </ModernCard>
      </div>
    </section>
  );
};

const FAQSection: React.FC<{ reducedMotion: boolean; onNavigateToApp: () => void }> = ({ reducedMotion, onNavigateToApp }) => {
  const faqs = [
    {
      q: 'Czy muszę mieć doświadczenie w marketingu?',
      a: 'Nie. Narzędzie prowadzi Cię krok po kroku: od celu i grupy docelowej po gotowy post z CTA i hasztagami.',
    },
    {
      q: 'Czy mogę edytować treści przed publikacją?',
      a: 'Tak. Generujesz propozycję, a potem dopracowujesz ją do swojego stylu. Możesz też wykonać kolejne wersje w różnych tonach.',
    },
    {
      q: 'Jak szybko zobaczę efekty?',
      a: 'Najczęściej od razu: lepsza regularność, spójniejszy przekaz i szybsze iteracje. Do tego analityka pomaga podkręcać wyniki.',
    },
  ];

  const [openIndex, setOpenIndex] = React.useState<number>(0);

  return (
    <section id="faq" className="py-16 md:py-24">
      <SectionHeader title="FAQ" subtitle="Najczęstsze pytania. Jeśli chcesz — od razu wskakuj do generatora i przetestuj." />
      <div className="mt-10 max-w-3xl mx-auto space-y-3">
        {faqs.map((item, index) => {
          const open = openIndex === index;
          return (
            <ModernCard key={index} glass hover className="p-0 overflow-hidden">
              <button
                type="button"
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-950"
                onClick={() => setOpenIndex(open ? -1 : index)}
                aria-expanded={open}
              >
                <span className="font-semibold text-slate-900 dark:text-white">{item.q}</span>
                <span
                  aria-hidden="true"
                  className={`h-8 w-8 rounded-xl border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-center text-slate-500 dark:text-slate-300 ${
                    reducedMotion ? '' : 'transition-transform duration-300'
                  } ${open ? 'rotate-45' : ''}`}
                >
                  +
                </span>
              </button>
              <div
                className={`px-6 overflow-hidden text-slate-600 dark:text-slate-300 ${
                  reducedMotion ? '' : 'transition-all duration-300'
                } ${open ? 'max-h-40 pb-6 opacity-100' : 'max-h-0 pb-0 opacity-0'}`}
              >
                <p className="leading-relaxed">{item.a}</p>
              </div>
            </ModernCard>
          );
        })}
      </div>
      <div className="mt-10 flex justify-center">
        <ModernButton variant="gradient" size="lg" onClick={onNavigateToApp} className="rounded-2xl px-9 py-4">
          Przejdź do generatora
        </ModernButton>
      </div>
    </section>
  );
};

export const HomeView: React.FC<HomeViewProps> = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reducedMotion = usePrefersReducedMotion();
  
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
    <div className="relative animate-fade-in">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[48rem] h-[48rem] bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-blue-500/15 blur-3xl" />
        <div className="absolute top-40 -left-24 w-96 h-96 bg-gradient-to-br from-blue-500/12 to-purple-500/12 blur-3xl" />
        <div className="absolute bottom-0 -right-24 w-[34rem] h-[34rem] bg-gradient-to-br from-pink-500/12 to-blue-500/10 blur-3xl" />
      </div>

      <div className="relative">
        <HeroSection onNavigateToApp={handleNavigateToApp} reducedMotion={reducedMotion} />
        <Reveal reducedMotion={reducedMotion}>
          <TrustBar />
        </Reveal>
        <div className="max-w-6xl mx-auto px-4">
          <Reveal reducedMotion={reducedMotion}>
            <StatsSection reducedMotion={reducedMotion} />
          </Reveal>
        </div>
        <div className="max-w-6xl mx-auto px-4">
          <Reveal reducedMotion={reducedMotion}>
            <HowItWorksSection />
          </Reveal>
        </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-4">
      <section id="features" className="py-16 md:py-24 space-y-24">
        <SectionHeader
          title="Moduły, które robią robotę"
          subtitle="Wszystko, czego potrzebujesz do tworzenia, planowania i optymalizacji treści — w jednym, spójnym UI."
        />
        <FeatureHighlight
            icon={SparklesIcon}
            title="Generator Treści AI"
            description="Twórz unikalne posty, reklamy i pomysły wideo dopasowane do Twojej marki. Nasz zaawansowany silnik AI rozumie kontekst i generuje treści, które angażują, informują i sprzedają."
            imageMockup={
                <ModernCard glass hover className="p-4">
                    <p className="text-xs font-semibold text-gray-400 mb-2">Podgląd dla Facebook</p>
                    <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                        </div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    </div>
                </ModernCard>
            }
        />
        <FeatureHighlight 
            icon={CampaignIcon}
            title="Planer Kampanii AI"
            description="Przestań zgadywać. Zdefiniuj swój cel marketingowy, a nasza AI stworzy dla Ciebie kompletny, wielodniowy harmonogram postów z konkretnymi pomysłami na treść, grafikę i wezwania do działania."
            imageMockup={
                <ModernCard glass hover className="p-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '0.25rem' }}>
                        {Array.from({ length: 14 }).map((_, i) => (
                            <div key={i} className={`aspect-square rounded ${i % 3 === 0 ? 'bg-blue-300 dark:bg-blue-800' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                        ))}
                    </div>
                </ModernCard>
            }
            reverse
        />
        <FeatureHighlight 
            icon={ChartPieIcon}
            title="Analityka i Optymalizacja"
            description="Połącz kropki między treścią a wynikami. Importuj swoje dane, a AI zidentyfikuje najskuteczniejsze posty, optymalne czasy publikacji i dostarczy praktycznych wskazówek do maksymalizacji zasięgu."
            imageMockup={
                 <ModernCard glass hover className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    <div className="flex items-end gap-2 h-24">
                        <div className="w-1/4 h-1/2 bg-blue-300 dark:bg-blue-800 rounded-t-md"></div>
                        <div className="w-1/4 h-3/4 bg-blue-300 dark:bg-blue-800 rounded-t-md"></div>
                        <div className="w-1/4 h-full bg-blue-300 dark:bg-blue-800 rounded-t-md"></div>
                        <div className="w-1/4 h-1/3 bg-blue-300 dark:bg-blue-800 rounded-t-md"></div>
                    </div>
                 </ModernCard>
            }
        />
      </section>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        <Reveal reducedMotion={reducedMotion}>
          <TestimonialsSection />
        </Reveal>
        <Reveal reducedMotion={reducedMotion}>
          <FAQSection reducedMotion={reducedMotion} onNavigateToApp={handleNavigateToApp} />
        </Reveal>
        <Reveal reducedMotion={reducedMotion}>
          <FinalCTASection onNavigateToApp={handleNavigateToApp} />
        </Reveal>
      </div>
      </div>
    </div>
  );
};
