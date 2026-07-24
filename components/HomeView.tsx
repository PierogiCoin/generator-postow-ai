import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUIStore } from '../stores/uiStore';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ModernButton } from './ui';
import {
  usePrefersReducedMotion,
  useSEO,
  scrollToAnchor,
  Reveal,
} from './homeViewUtils';
import { IndustryFunnelHero } from './IndustryFunnelHero';
import type { IndustryPackId } from '../utils/industryPacks';

interface HomeViewProps {}

const primaryCtaClass =
  'rounded-lg px-8 py-3.5 !bg-[var(--hero-accent)] ![background-image:none] hover:brightness-110 text-white font-semibold shadow-none focus:!ring-[var(--hero-accent)]';

const ScrollProgressBar: React.FC = () => {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-0.5 z-[60] pointer-events-none">
      <div
        className="h-full transition-[width] duration-75 ease-out"
        style={{ width: `${progress}%`, backgroundColor: 'var(--hero-accent)' }}
      />
    </div>
  );
};

const LandingNav: React.FC<{ onSignup: () => void; isLoggedIn: boolean }> = ({ onSignup, isLoggedIn }) => {
  const { t } = useTranslation();
  const items = [
    { label: t('home.journey.nav_problem'), id: 'problem' },
    { label: t('home.journey.nav_solution'), id: 'solution' },
    { label: t('home.journey.nav_methods'), id: 'methods' },
    { label: t('home.journey.nav_industries'), id: 'branze' },
  ];

  return (
    <nav
      className="sticky top-0 z-40 border-b border-white/5 bg-[#07090c]/80 backdrop-blur-md"
      aria-label={t('home.nav.ariaLabel')}
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="font-display text-sm font-bold tracking-tight text-white shrink-0"
        >
          {t('home.hero.brand')}
        </button>
        <div className="hidden sm:flex items-center gap-1 overflow-x-auto">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
        <ModernButton
          variant="primary"
          size="sm"
          onClick={onSignup}
          className="!bg-[var(--hero-accent)] ![background-image:none] text-white text-xs font-semibold rounded-lg px-3 py-2 shrink-0"
        >
          {t(isLoggedIn ? 'home.journey.nav_app' : 'home.journey.nav_signup')}
        </ModernButton>
      </div>
    </nav>
  );
};

const HeroSection: React.FC<{
  reducedMotion: boolean;
  isLoggedIn: boolean;
  onStart: () => void;
}> = ({ reducedMotion, isLoggedIn, onStart }) => {
  const { t } = useTranslation();

  return (
    <section className="relative min-h-[100svh] w-full home-hero-wash text-white overflow-hidden flex flex-col">
      <div className="absolute inset-0 home-noise pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-0 home-grid-bg opacity-40 pointer-events-none" aria-hidden="true" />

      {/* Dominant full-bleed visual plane */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-[#050706] via-[#0a1210]/90 to-transparent" />
        <div
          className={`absolute left-1/2 -translate-x-1/2 bottom-[18%] w-[min(120vw,920px)] h-px landing-stream ${reducedMotion ? 'opacity-40' : 'animate-home-stream'}`}
        />
        <div className="absolute left-[8%] bottom-[22%] right-[8%] max-w-5xl mx-auto opacity-50">
          <div className="space-y-3 font-display text-[clamp(1.1rem,3.5vw,2rem)] font-bold leading-tight tracking-tight text-white/25">
            <p className={reducedMotion ? '' : 'animate-home-float'}>{t('home.journey.hero_visual_1')}</p>
            <p className={`pl-[8%] ${reducedMotion ? '' : 'animate-home-float'}`} style={reducedMotion ? undefined : { animationDelay: '0.6s' }}>
              {t('home.journey.hero_visual_2')}
            </p>
            <p className={`pl-[16%] text-[var(--hero-accent)]/70 ${reducedMotion ? '' : 'animate-home-float'}`} style={reducedMotion ? undefined : { animationDelay: '1.2s' }}>
              {t('home.journey.hero_visual_3')}
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-4xl mx-auto px-4 pt-16 pb-28 text-center">
        <p
          className={`font-display text-5xl sm:text-6xl md:text-8xl font-extrabold tracking-tight text-white ${reducedMotion ? '' : 'animate-home-rise'}`}
        >
          {t('home.hero.brand')}
        </p>
        <div
          className={`mx-auto mt-5 h-px w-20 bg-[var(--hero-accent)] ${reducedMotion ? '' : 'animate-home-line'}`}
          aria-hidden="true"
        />
        <h1
          className={`mt-7 text-xl sm:text-2xl md:text-3xl font-medium text-slate-200 tracking-tight leading-snug max-w-2xl mx-auto ${reducedMotion ? '' : 'animate-home-rise'}`}
          style={reducedMotion ? undefined : { animationDelay: '120ms' }}
        >
          {t('home.journey.hero_title')}
        </h1>
        <p
          className={`mt-4 max-w-lg mx-auto text-base md:text-lg text-slate-400 leading-relaxed ${reducedMotion ? '' : 'animate-home-rise'}`}
          style={reducedMotion ? undefined : { animationDelay: '220ms' }}
        >
          {t('home.journey.hero_subtitle')}
        </p>
        <div
          className={`mt-10 flex flex-col sm:flex-row justify-center items-center gap-3 ${reducedMotion ? '' : 'animate-home-rise'}`}
          style={reducedMotion ? undefined : { animationDelay: '320ms' }}
        >
          <ModernButton variant="primary" size="lg" onClick={onStart} className={primaryCtaClass}>
            {t(isLoggedIn ? 'home.journey.hero_cta_logged_in' : 'home.journey.hero_cta')}
          </ModernButton>
          <ModernButton
            variant="outline"
            size="lg"
            onClick={() => scrollToAnchor('problem', reducedMotion)}
            className="rounded-lg px-8 py-3.5 border-white/20 text-slate-200 bg-transparent hover:bg-white/5 hover:border-white/35"
          >
            {t('home.journey.hero_secondary')}
          </ModernButton>
        </div>
      </div>

      <button
        type="button"
        onClick={() => scrollToAnchor('problem', reducedMotion)}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-slate-500 hover:text-[var(--hero-accent)] transition-colors"
        aria-label={t('home.journey.hero_secondary')}
      >
        <ChevronDownIcon className={`w-6 h-6 ${reducedMotion ? '' : 'animate-home-float'}`} />
      </button>
    </section>
  );
};

const ProblemSection: React.FC = () => {
  const { t } = useTranslation();
  const pains = [
    t('home.journey.pain_1'),
    t('home.journey.pain_2'),
    t('home.journey.pain_3'),
  ];

  return (
    <section id="problem" className="scroll-mt-24 py-20 md:py-28 bg-[var(--hero-surface)]">
      <div className="max-w-3xl mx-auto px-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--hero-accent)]">
          {t('home.journey.problem_kicker')}
        </p>
        <h2 className="mt-3 font-display text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.1]">
          {t('home.journey.problem_title')}
        </h2>
        <p className="mt-4 text-base md:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
          {t('home.journey.problem_subtitle')}
        </p>
        <ul className="mt-12 space-y-0">
          {pains.map((pain, i) => (
            <li
              key={pain}
              className="border-t border-slate-300/70 dark:border-white/10 py-6 flex gap-5 items-start"
            >
              <span className="font-display text-2xl font-bold text-[var(--hero-accent)] tabular-nums shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-lg md:text-xl font-medium text-slate-800 dark:text-slate-100 leading-snug pt-0.5">
                {pain}
              </p>
            </li>
          ))}
        </ul>
        <div className="border-t border-slate-300/70 dark:border-white/10" />
      </div>
    </section>
  );
};

const SolutionSection: React.FC<{ onContinue: () => void; isLoggedIn: boolean }> = ({
  onContinue,
  isLoggedIn,
}) => {
  const { t } = useTranslation();

  return (
    <section id="solution" className="scroll-mt-24 relative home-hero-wash text-white py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0 home-noise pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 max-w-3xl mx-auto px-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--hero-accent)]">
          {t('home.journey.solution_kicker')}
        </p>
        <h2 className="mt-3 font-display text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
          {t('home.journey.solution_title')}
        </h2>
        <p className="mt-5 text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl">
          {t('home.journey.solution_subtitle')}
        </p>
        <p className="mt-8 text-sm md:text-base text-slate-400 leading-relaxed max-w-xl border-l-2 border-[var(--hero-accent)] pl-4">
          {t('home.journey.solution_promise')}
        </p>
        <div className="mt-10">
          <ModernButton variant="primary" size="lg" onClick={onContinue} className={primaryCtaClass}>
            {t(isLoggedIn ? 'home.journey.solution_cta_logged_in' : 'home.journey.solution_cta')}
          </ModernButton>
        </div>
      </div>
    </section>
  );
};

const MethodsSection: React.FC = () => {
  const { t } = useTranslation();
  const methods = [
    { title: t('home.journey.method_1_title'), desc: t('home.journey.method_1_desc') },
    { title: t('home.journey.method_2_title'), desc: t('home.journey.method_2_desc') },
    { title: t('home.journey.method_3_title'), desc: t('home.journey.method_3_desc') },
  ];

  return (
    <section id="methods" className="scroll-mt-24 py-20 md:py-28 bg-[var(--hero-surface)]">
      <div className="max-w-5xl mx-auto px-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--hero-accent)]">
          {t('home.journey.methods_kicker')}
        </p>
        <h2 className="mt-3 font-display text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.1] max-w-2xl">
          {t('home.journey.methods_title')}
        </h2>
        <p className="mt-4 text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
          {t('home.journey.methods_subtitle')}
        </p>

        <ol className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          {methods.map((m, i) => (
            <li key={m.title} className="relative">
              <span className="font-display text-5xl font-extrabold text-slate-200 dark:text-white/10 leading-none select-none">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{m.title}</h3>
              <p className="mt-3 text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {m.desc}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

const ProofStrip: React.FC = () => {
  const { t } = useTranslation();
  return (
    <section className="py-16 border-y border-slate-200/80 dark:border-white/5 bg-white/50 dark:bg-white/[0.02]">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <p className="font-display text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-snug tracking-tight">
          „{t('home.journey.proof_quote')}”
        </p>
        <p className="mt-4 text-sm text-slate-500">
          {t('home.journey.proof_author')} · {t('home.journey.proof_role')}
        </p>
      </div>
    </section>
  );
};

const FinalCTASection: React.FC<{ onNavigateToApp: () => void; isLoggedIn: boolean }> = ({
  onNavigateToApp,
  isLoggedIn,
}) => {
  const { t } = useTranslation();

  return (
    <section className="relative w-full home-hero-wash overflow-hidden">
      <div className="absolute inset-0 home-noise pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-24 md:py-32 text-center space-y-6">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-2"
          style={{ backgroundColor: 'var(--hero-accent-soft)' }}
        >
          <SparklesIcon className="w-7 h-7" style={{ color: 'var(--hero-accent)' }} />
        </div>
        <h2 className="font-display text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
          {t('home.journey.final_title')}
        </h2>
        <p className="text-slate-400 text-base md:text-lg max-w-lg mx-auto leading-relaxed">
          {t(isLoggedIn ? 'home.journey.final_subtitle_logged_in' : 'home.journey.final_subtitle')}
        </p>
        <div className="pt-3">
          <ModernButton variant="primary" size="lg" onClick={onNavigateToApp} className={primaryCtaClass}>
            {t(isLoggedIn ? 'home.journey.nav_app' : 'home.journey.final_cta')}
          </ModernButton>
        </div>
        <p className="text-xs text-slate-500">{t('home.journey.final_note')}</p>
      </div>
    </section>
  );
};

export const HomeView: React.FC<HomeViewProps> = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setAuthModal } = useUIStore();
  const reducedMotion = usePrefersReducedMotion();
  const { t } = useTranslation();

  useSEO({
    title: `${t('home.hero.brand')} — ${t('home.journey.hero_title')}`,
    description: t('home.journey.hero_subtitle'),
  });

  const isLoggedIn = Boolean(user);

  const openSignupOrApp = () => {
    if (user) navigate('/dashboard');
    else setAuthModal('signup');
  };

  const handleFunnelContinue = (_selectedIds: IndustryPackId[]) => {
    openSignupOrApp();
  };

  const startJourney = () => {
    scrollToAnchor('problem', reducedMotion);
  };

  const goToIndustries = () => {
    scrollToAnchor('branze', reducedMotion);
  };

  return (
    <div className="relative pb-0">
      <ScrollProgressBar />
      <LandingNav onSignup={openSignupOrApp} isLoggedIn={isLoggedIn} />
      <HeroSection reducedMotion={reducedMotion} isLoggedIn={isLoggedIn} onStart={startJourney} />

      <Reveal reducedMotion={reducedMotion}>
        <ProblemSection />
      </Reveal>

      <Reveal reducedMotion={reducedMotion}>
        <SolutionSection onContinue={goToIndustries} isLoggedIn={isLoggedIn} />
      </Reveal>

      <Reveal reducedMotion={reducedMotion}>
        <MethodsSection />
      </Reveal>

      <Reveal reducedMotion={reducedMotion}>
        <div className="bg-[var(--hero-surface)]">
          <IndustryFunnelHero
            reducedMotion={reducedMotion}
            isLoggedIn={isLoggedIn}
            userId={user?.id}
            onContinue={handleFunnelContinue}
          />
        </div>
      </Reveal>

      <Reveal reducedMotion={reducedMotion}>
        <ProofStrip />
      </Reveal>

      <Reveal reducedMotion={reducedMotion}>
        <FinalCTASection onNavigateToApp={openSignupOrApp} isLoggedIn={isLoggedIn} />
      </Reveal>
    </div>
  );
};
