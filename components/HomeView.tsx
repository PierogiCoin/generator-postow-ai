import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUIStore } from '../stores/uiStore';
import { useTranslation } from 'react-i18next';
import { CampaignIcon } from './icons/CampaignIcon';
import { ChartPieIcon } from './icons/ChartPieIcon';
import { TargetIcon } from './icons/TargetIcon';
import { PencilIcon } from './icons/PencilIcon';
import { SendIcon } from './icons/SendIcon';
import { ModernButton } from './ui';
import {
  usePrefersReducedMotion,
  scrollToAnchor,
  Reveal,
  SectionHeader,
} from './homeViewUtils';

interface HomeViewProps {}

const primaryCtaClass =
  'rounded-lg px-8 py-3.5 !bg-[var(--hero-accent)] ![background-image:none] hover:brightness-110 text-white font-semibold shadow-none focus:!ring-[var(--hero-accent)]';

const HeroPreview: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const { t } = useTranslation();

  return (
    <div
      className={`mt-12 md:mt-16 w-full ${reducedMotion ? '' : 'animate-home-preview'}`}
      aria-hidden="true"
    >
      <div className="border-t border-white/10 bg-[#050d16]">
        <div className="max-w-6xl mx-auto">
          <div className="flex min-h-[360px] flex-col lg:flex-row">
            <div className="w-full lg:w-[40%] p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col gap-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
                  {t('home.hero.preview_topic_label')}
                </p>
                <div className="min-h-[72px] px-3 py-2.5 rounded-md border border-white/10 bg-white/[0.03] text-sm text-slate-200 leading-relaxed">
                  {t('home.hero.preview_topic')}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
                  {t('home.hero.preview_platform_label')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span
                    className="px-3 py-1.5 rounded-md text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--hero-accent)' }}
                  >
                    {t('home.hero.preview_platform_ig')}
                  </span>
                  <span className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-400 border border-white/10">
                    {t('home.hero.preview_platform_li')}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
                  {t('home.hero.preview_tone_label')}
                </p>
                <div className="h-10 px-3 rounded-md border border-white/10 bg-white/[0.03] flex items-center text-sm text-slate-300">
                  {t('home.hero.preview_tone')}
                </div>
              </div>
              <div
                className="mt-auto h-11 rounded-md text-white font-semibold text-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--hero-accent)' }}
              >
                <PencilIcon className="w-4 h-4" />
                {t('home.hero.preview_generate')}
              </div>
            </div>

            <div className="w-full lg:w-[60%] p-6 md:p-8 flex flex-col gap-4" style={{ backgroundColor: 'var(--hero-navy-muted)' }}>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-sm font-semibold text-white">{t('home.hero.preview_label')}</span>
                <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--hero-accent)' }}>
                  {t('home.hero.preview_status')}
                </span>
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 mb-1.5">
                    {t('home.hero.preview_hook')}
                  </p>
                  <p className="font-display text-lg font-bold text-white leading-snug">
                    {t('home.hero.preview_topic')}
                  </p>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed max-w-lg">
                  {t('home.hero.preview_body')}
                </p>
                <p className="text-sm font-medium" style={{ color: 'var(--hero-accent)' }}>
                  {t('home.hero.preview_cta_line')}
                </p>
                <div className="flex gap-3 pt-1 text-xs text-slate-500">
                  <span>{t('home.hero.preview_tag_ai')}</span>
                  <span>{t('home.hero.preview_tag_marketing')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HeroSection: React.FC<{ onNavigateToApp: () => void; reducedMotion: boolean; isLoggedIn: boolean }> = ({
  onNavigateToApp,
  reducedMotion,
  isLoggedIn,
}) => {
  const { t } = useTranslation();

  return (
    <section className="relative w-full home-hero-wash text-white overflow-hidden">
      <div className="absolute inset-0 home-grid-bg opacity-60 pointer-events-none" aria-hidden="true" />
      <div
        className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #050d16, transparent)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-28 md:pt-32 pb-0 text-center">
        <p
          className={`font-display text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-white ${reducedMotion ? '' : 'animate-home-rise'}`}
          style={reducedMotion ? undefined : { animationDelay: '0ms' }}
        >
          {t('home.hero.brand')}
        </p>
        <div
          className={`mx-auto mt-5 h-px w-24 ${reducedMotion ? 'bg-[var(--hero-accent)]' : 'animate-home-line bg-[var(--hero-accent)]'}`}
          aria-hidden="true"
        />
        <h1
          className={`mt-6 text-xl sm:text-2xl md:text-3xl font-medium text-slate-200 tracking-tight leading-snug max-w-2xl mx-auto ${reducedMotion ? '' : 'animate-home-rise'}`}
          style={reducedMotion ? undefined : { animationDelay: '120ms' }}
        >
          {t('home.hero.title')}
        </h1>
        <p
          className={`mt-4 max-w-lg mx-auto text-base md:text-lg text-slate-400 leading-relaxed ${reducedMotion ? '' : 'animate-home-rise'}`}
          style={reducedMotion ? undefined : { animationDelay: '220ms' }}
        >
          {t('home.hero.subtitle')}
        </p>
        <div
          className={`mt-9 flex flex-col sm:flex-row justify-center items-center gap-3 ${reducedMotion ? '' : 'animate-home-rise'}`}
          style={reducedMotion ? undefined : { animationDelay: '320ms' }}
        >
          <ModernButton variant="primary" size="lg" onClick={onNavigateToApp} className={primaryCtaClass}>
            {t(isLoggedIn ? 'home.hero.cta_logged_in' : 'home.hero.cta')}
          </ModernButton>
          <ModernButton
            variant="outline"
            size="lg"
            onClick={() => scrollToAnchor('how-it-works', reducedMotion)}
            className="rounded-lg px-8 py-3.5 border-white/20 text-slate-200 bg-transparent hover:bg-white/5 hover:border-white/35 transition-colors duration-300"
          >
            {t('home.hero.secondary_cta')}
          </ModernButton>
        </div>

        <HeroPreview reducedMotion={reducedMotion} />
      </div>
    </section>
  );
};

const TrustBar: React.FC = () => {
  const { t } = useTranslation();

  const items = [
    t('home.trust.item_generate'),
    t('home.trust.item_plan'),
    t('home.trust.item_analyze'),
  ];

  return (
    <section className="py-12 border-b border-slate-200/70 dark:border-white/5 bg-[var(--hero-surface)]">
      <div className="max-w-6xl mx-auto px-4">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em]">
          {t('home.trust.title')}
        </p>
        <ul className="mt-5 flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-x-10 sm:gap-y-2">
          {items.map((item) => (
            <li key={item} className="font-display text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

const HowItWorksSection = () => {
  const { t } = useTranslation();

  const steps = [
    { n: '01', icon: TargetIcon, title: t('home.how_it_works.step1_title'), description: t('home.how_it_works.step1_desc') },
    { n: '02', icon: PencilIcon, title: t('home.how_it_works.step2_title'), description: t('home.how_it_works.step2_desc') },
    { n: '03', icon: SendIcon, title: t('home.how_it_works.step3_title'), description: t('home.how_it_works.step3_desc') },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 scroll-mt-28">
      <SectionHeader title={t('home.how_it_works.title')} subtitle={t('home.how_it_works.subtitle')} />
      <ol className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.n} className="relative">
              <span className="font-display text-5xl font-extrabold text-slate-200 dark:text-white/10 leading-none select-none">
                {step.n}
              </span>
              <div className="mt-4 flex items-center gap-2.5" style={{ color: 'var(--hero-accent)' }}>
                <Icon className="w-5 h-5" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{step.title}</h3>
              </div>
              <p className="mt-3 text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed">
                {step.description}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

const FeatureVisual: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => (
  <div className="overflow-hidden border border-slate-200/80 dark:border-white/10 bg-[#071018]">
    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
      <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{label}</span>
    </div>
    <div className="p-5 md:p-6" style={{ backgroundColor: 'var(--hero-navy-muted)' }}>
      {children}
    </div>
  </div>
);

const FeatureHighlight: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  imageMockup: React.ReactNode;
  reverse?: boolean;
}> = ({ icon: Icon, title, description, imageMockup, reverse = false }) => (
  <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center py-12 ${reverse ? 'lg:grid-flow-col-dense' : ''}`}>
    <div className={`space-y-4 ${reverse ? 'lg:col-start-2' : ''}`}>
      <div style={{ color: 'var(--hero-accent)' }}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-display text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
        {title}
      </h3>
      <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed max-w-md">
        {description}
      </p>
    </div>
    <div className={`mt-2 lg:mt-0 ${reverse ? 'lg:col-start-1' : ''}`}>{imageMockup}</div>
  </div>
);

const FeaturesSection = () => {
  const { t } = useTranslation();

  return (
    <section id="features" className="py-12 md:py-20 space-y-4 scroll-mt-28 border-t border-slate-200/70 dark:border-white/5">
      <SectionHeader title={t('home.features.title')} subtitle={t('home.features.subtitle')} />

      <FeatureHighlight
        icon={PencilIcon}
        title={t('home.features.generator_title')}
        description={t('home.features.generator_desc')}
        imageMockup={
          <FeatureVisual label={t('home.features.generator_mock_label')}>
            <div className="space-y-3">
              <div className="h-2.5 rounded-sm w-2/5" style={{ backgroundColor: 'var(--hero-accent)' }} />
              <div className="space-y-1.5 pt-1">
                <div className="h-2 bg-white/15 rounded-sm" />
                <div className="h-2 bg-white/10 rounded-sm w-5/6" />
                <div className="h-2 bg-white/10 rounded-sm w-4/6" />
              </div>
              <div className="aspect-[16/10] border border-white/10 rounded-sm flex items-center justify-center bg-white/[0.03]">
                <PencilIcon className="w-7 h-7 text-slate-500" />
              </div>
            </div>
          </FeatureVisual>
        }
      />

      <FeatureHighlight
        icon={CampaignIcon}
        title={t('home.features.planner_title')}
        description={t('home.features.planner_desc')}
        reverse
        imageMockup={
          <FeatureVisual label={t('home.features.planner_mock_label')}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {t('home.features.planner_mock_label')}
              </span>
              <span className="text-[10px] font-semibold tracking-wide" style={{ color: 'var(--hero-accent)' }}>
                {t('home.features.planner_mock_badge')}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 14 }).map((_, i) => (
                <div
                  key={`grid-${i}`}
                  className={`aspect-square rounded-sm border flex items-center justify-center ${
                    i % 3 === 0 ? 'border-[var(--hero-accent)]/50' : 'border-white/10 bg-white/[0.03]'
                  }`}
                  style={i % 3 === 0 ? { backgroundColor: 'var(--hero-accent-soft)' } : undefined}
                >
                  <span className="text-[9px] text-slate-500 font-mono">{i + 1}</span>
                </div>
              ))}
            </div>
          </FeatureVisual>
        }
      />

      <FeatureHighlight
        icon={ChartPieIcon}
        title={t('home.features.analytics_title')}
        description={t('home.features.analytics_desc')}
        imageMockup={
          <FeatureVisual label={t('home.features.analytics_mock_label')}>
            <div className="flex items-end gap-2 h-28 w-full px-1 pt-2">
              {[35, 55, 75, 45, 95, 65, 80, 50].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%`, backgroundColor: 'var(--hero-accent)' }}
                  className="flex-1 rounded-t-sm opacity-85"
                />
              ))}
            </div>
          </FeatureVisual>
        }
      />
    </section>
  );
};

const UseCasesSection = () => {
  const { t } = useTranslation();

  const items = [
    { title: t('home.use_cases.item1_title'), description: t('home.use_cases.item1_desc') },
    { title: t('home.use_cases.item2_title'), description: t('home.use_cases.item2_desc') },
    { title: t('home.use_cases.item3_title'), description: t('home.use_cases.item3_desc') },
  ];

  return (
    <section id="use-cases" className="py-20 md:py-28 border-y border-slate-200/70 dark:border-white/5 scroll-mt-28">
      <SectionHeader title={t('home.use_cases.title')} subtitle={t('home.use_cases.subtitle')} />
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
        {items.map((item, idx) => (
          <li key={item.title} className="border-t border-slate-300 dark:border-white/15 pt-5">
            <span className="text-xs font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--hero-accent)' }}>
              {String(idx + 1).padStart(2, '0')}
            </span>
            <h3 className="mt-3 font-display text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {item.title}
            </h3>
            <p className="mt-2 text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {item.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};

const FAQSection: React.FC<{ onNavigateToApp: () => void; isLoggedIn: boolean }> = ({ onNavigateToApp, isLoggedIn }) => {
  const { t } = useTranslation();
  const faqs = [
    { q: t('home.faq.q1'), a: t('home.faq.a1') },
    { q: t('home.faq.q2'), a: t('home.faq.a2') },
    { q: t('home.faq.q3'), a: t('home.faq.a3') },
  ];

  const [openIndex, setOpenIndex] = React.useState<number>(0);

  return (
    <section id="faq" className="py-20 md:py-28 scroll-mt-28">
      <SectionHeader title={t('home.faq.title')} subtitle={t('home.faq.subtitle')} />
      <div className="mt-2 max-w-3xl border-y border-slate-300 dark:border-white/10">
        {faqs.map((item, idx) => {
          const open = openIndex === idx;
          return (
            <div key={idx} className="border-b border-slate-200 dark:border-white/10 last:border-b-0">
              <button
                type="button"
                className="w-full text-left px-0 py-5 flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-accent)]"
                onClick={() => setOpenIndex(open ? -1 : idx)}
                aria-expanded={open}
              >
                <span className="font-semibold text-slate-900 dark:text-white text-base md:text-lg pr-4">{item.q}</span>
                <span
                  className={`text-2xl leading-none font-light text-slate-400 transition-transform duration-300 ${open ? 'rotate-45' : ''}`}
                  style={open ? { color: 'var(--hero-accent)' } : undefined}
                  aria-hidden="true"
                >
                  +
                </span>
              </button>
              <div
                className={`text-slate-600 dark:text-slate-300 transition-all duration-300 overflow-hidden ${
                  open ? 'max-h-48 pb-5 opacity-100' : 'max-h-0 pb-0 opacity-0'
                }`}
              >
                <p className="leading-relaxed text-sm md:text-base max-w-2xl">{item.a}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-12">
        <ModernButton variant="primary" size="lg" onClick={onNavigateToApp} className={primaryCtaClass}>
          {t(isLoggedIn ? 'home.hero.cta_logged_in' : 'home.hero.cta')}
        </ModernButton>
      </div>
    </section>
  );
};

const FinalCTASection: React.FC<{ onNavigateToApp: () => void; isLoggedIn: boolean }> = ({ onNavigateToApp, isLoggedIn }) => {
  const { t } = useTranslation();

  return (
    <section className="relative w-full home-hero-wash overflow-hidden">
      <div className="absolute inset-0 home-grid-bg opacity-50 pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-20 md:py-28 text-center space-y-5">
        <h2 className="font-display text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
          {t('home.final_cta.title')}
        </h2>
        <p className="text-slate-400 text-base md:text-lg max-w-lg mx-auto leading-relaxed">
          {t(isLoggedIn ? 'home.final_cta.subtitle_logged_in' : 'home.final_cta.subtitle')}
        </p>
        <div className="pt-3">
          <ModernButton variant="primary" size="lg" onClick={onNavigateToApp} className={primaryCtaClass}>
            {t(isLoggedIn ? 'home.hero.cta_logged_in' : 'home.final_cta.button')}
          </ModernButton>
        </div>
      </div>
    </section>
  );
};

export const HomeView: React.FC<HomeViewProps> = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setAuthModal } = useUIStore();
  const reducedMotion = usePrefersReducedMotion();

  const handleNavigateToApp = () => {
    if (user) {
      navigate('/generator');
    } else {
      setAuthModal('signup');
    }
  };

  const isLoggedIn = Boolean(user);

  return (
    <div className="relative pb-0 -mt-0">
      <HeroSection onNavigateToApp={handleNavigateToApp} reducedMotion={reducedMotion} isLoggedIn={isLoggedIn} />
      <Reveal reducedMotion={reducedMotion}>
        <TrustBar />
      </Reveal>

      <div className="max-w-6xl mx-auto px-4">
        <Reveal reducedMotion={reducedMotion}>
          <HowItWorksSection />
        </Reveal>

        <Reveal reducedMotion={reducedMotion}>
          <FeaturesSection />
        </Reveal>

        <Reveal reducedMotion={reducedMotion}>
          <UseCasesSection />
        </Reveal>

        <Reveal reducedMotion={reducedMotion}>
          <FAQSection onNavigateToApp={handleNavigateToApp} isLoggedIn={isLoggedIn} />
        </Reveal>
      </div>

      <Reveal reducedMotion={reducedMotion}>
        <FinalCTASection onNavigateToApp={handleNavigateToApp} isLoggedIn={isLoggedIn} />
      </Reveal>
    </div>
  );
};
