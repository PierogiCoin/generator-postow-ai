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
  'rounded-xl px-7 py-3.5 !bg-[var(--hero-accent)] ![background-image:none] hover:brightness-110 text-white font-semibold shadow-md focus:!ring-[var(--hero-accent)]';

const HeroPreview: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div
      className="mt-14 w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]"
      aria-hidden="true"
    >
      <div
        className="border-y border-slate-200/60 dark:border-white/10"
        style={{ backgroundColor: 'var(--hero-navy)' }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex min-h-[340px] flex-col md:flex-row">
            {/* Form side — mirrors generator quick flow */}
            <div className="w-full md:w-[42%] p-6 md:p-8 border-b md:border-b-0 md:border-r border-white/10 flex flex-col gap-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  {t('home.hero.preview_topic_label')}
                </p>
                <div className="min-h-[72px] px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-sm text-slate-200 leading-relaxed">
                  {t('home.hero.preview_topic')}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  {t('home.hero.preview_platform_label')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white border"
                    style={{ backgroundColor: 'var(--hero-accent)', borderColor: 'var(--hero-accent)' }}
                  >
                    {t('home.hero.preview_platform_ig')}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 border border-white/10 bg-white/5">
                    {t('home.hero.preview_platform_li')}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  {t('home.hero.preview_tone_label')}
                </p>
                <div className="h-10 px-3 rounded-lg border border-white/10 bg-white/5 flex items-center text-sm text-slate-300">
                  {t('home.hero.preview_tone')}
                </div>
              </div>
              <div
                className="mt-auto h-11 rounded-lg text-white font-semibold text-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--hero-accent)' }}
              >
                <PencilIcon className="w-4 h-4" />
                {t('home.hero.preview_generate')}
              </div>
            </div>

            {/* Result side — structured post output */}
            <div
              className="w-full md:w-[58%] p-6 md:p-8 flex flex-col gap-4"
              style={{ backgroundColor: 'var(--hero-navy-muted)' }}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-sm font-semibold text-white">{t('home.hero.preview_label')}</span>
                <span
                  className="text-xs font-semibold tracking-wide px-2 py-0.5 rounded-md"
                  style={{ color: 'var(--hero-accent)', backgroundColor: 'var(--hero-accent-soft)' }}
                >
                  {t('home.hero.preview_status')}
                </span>
              </div>
              <div className="space-y-3 flex-1">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {t('home.hero.preview_hook')}
                  </p>
                  <p className="text-sm font-semibold text-white leading-snug">
                    {t('home.hero.preview_topic')}
                  </p>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {t('home.hero.preview_body')}
                </p>
                <p className="text-sm font-medium" style={{ color: 'var(--hero-accent)' }}>
                  {t('home.hero.preview_cta_line')}
                </p>
                <div className="flex gap-2 pt-1">
                  <span className="text-xs border border-white/10 px-2.5 py-1 rounded-md text-slate-400">
                    {t('home.hero.preview_tag_ai')}
                  </span>
                  <span className="text-xs border border-white/10 px-2.5 py-1 rounded-md text-slate-400">
                    {t('home.hero.preview_tag_marketing')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HeroSection: React.FC<{ onNavigateToApp: () => void; reducedMotion: boolean; isLoggedIn: boolean }> = ({ onNavigateToApp, reducedMotion, isLoggedIn }) => {
  const { t } = useTranslation();

  return (
    <section className="pt-10 md:pt-16 pb-0 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[420px] pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 w-[280px] h-[280px] rounded-full blur-[120px] opacity-40"
          style={{ backgroundColor: 'var(--hero-accent)' }}
        />
        <div
          className="absolute top-1/3 right-1/4 w-[260px] h-[260px] rounded-full blur-[120px] opacity-25"
          style={{ backgroundColor: 'var(--hero-navy)' }}
        />
      </div>

      <div className="relative z-10 text-center px-4">
        <p className="text-2xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white animate-fade-in">
          {t('home.hero.brand')}
        </p>
        <h1 className="mt-4 text-3xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight max-w-3xl mx-auto">
          {t('home.hero.title')}
        </h1>
        <p className="mt-5 max-w-xl mx-auto text-base md:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
          {t('home.hero.subtitle')}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-3">
          <ModernButton
            variant="primary"
            size="lg"
            onClick={onNavigateToApp}
            className={primaryCtaClass}
          >
            {t(isLoggedIn ? 'home.hero.cta_logged_in' : 'home.hero.cta')}
          </ModernButton>
          <ModernButton
            variant="outline"
            size="lg"
            onClick={() => scrollToAnchor('how-it-works', reducedMotion)}
            className="rounded-xl px-7 py-3.5 border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-all duration-300"
          >
            {t('home.hero.secondary_cta')}
          </ModernButton>
        </div>

        <HeroPreview />
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
    <section className="py-10 border-b border-slate-200/50 dark:border-white/5 bg-slate-50/40 dark:bg-slate-950/30">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          {t('home.trust.title')}
        </p>
        <ul className="mt-5 flex flex-wrap justify-center gap-x-8 gap-y-3">
          {items.map((item) => (
            <li
              key={item}
              className="text-sm md:text-base font-medium text-slate-700 dark:text-slate-300"
            >
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
    { icon: TargetIcon, title: t('home.how_it_works.step1_title'), description: t('home.how_it_works.step1_desc') },
    { icon: PencilIcon, title: t('home.how_it_works.step2_title'), description: t('home.how_it_works.step2_desc') },
    { icon: SendIcon, title: t('home.how_it_works.step3_title'), description: t('home.how_it_works.step3_desc') },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 scroll-mt-28 border-t border-slate-200/50 dark:border-white/5">
      <SectionHeader
        title={t('home.how_it_works.title')}
        subtitle={t('home.how_it_works.subtitle')}
      />
      <ol className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <li key={idx} className="text-center">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-xl mx-auto mb-5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5"
                style={{ color: 'var(--hero-accent)' }}
              >
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{step.title}</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{step.description}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

const FeatureMockFrame: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => (
  <div
    className="rounded-xl border border-white/10 overflow-hidden"
    style={{ backgroundColor: 'var(--hero-navy)' }}
  >
    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
      <span className="text-xs font-semibold text-slate-300">{label}</span>
      <span className="flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-white/15" />
        <span className="w-2 h-2 rounded-full bg-white/15" />
        <span className="w-2 h-2 rounded-full bg-white/15" />
      </span>
    </div>
    <div className="p-5" style={{ backgroundColor: 'var(--hero-navy-muted)' }}>
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
  <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center py-10 ${reverse ? 'lg:grid-flow-col-dense' : ''}`}>
    <div className={`space-y-4 ${reverse ? 'lg:col-start-2' : ''}`}>
      <div className="inline-flex items-center gap-3">
        <div
          className="flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5"
          style={{ color: 'var(--hero-accent)' }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {title}
        </h3>
      </div>
      <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed max-w-md">
        {description}
      </p>
    </div>
    <div className={`mt-4 lg:mt-0 ${reverse ? 'lg:col-start-1' : ''}`}>
      {imageMockup}
    </div>
  </div>
);

const FeaturesSection = () => {
  const { t } = useTranslation();

  return (
    <section id="features" className="py-20 md:py-28 space-y-8 scroll-mt-28 border-t border-slate-200/50 dark:border-white/5">
      <SectionHeader
        title={t('home.features.title')}
        subtitle={t('home.features.subtitle')}
      />

      <FeatureHighlight
        icon={PencilIcon}
        title={t('home.features.generator_title')}
        description={t('home.features.generator_desc')}
        imageMockup={
          <FeatureMockFrame label={t('home.features.generator_mock_label')}>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md" style={{ backgroundColor: 'var(--hero-accent)' }} />
                <div className="h-2.5 bg-white/20 rounded w-1/3" />
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="h-2 bg-white/10 rounded" />
                <div className="h-2 bg-white/10 rounded w-5/6" />
                <div className="h-2 bg-white/10 rounded w-4/6" />
              </div>
              <div
                className="aspect-[16/10] border border-white/10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--hero-accent-soft)' }}
              >
                <PencilIcon className="w-7 h-7 text-slate-300" />
              </div>
            </div>
          </FeatureMockFrame>
        }
      />

      <FeatureHighlight
        icon={CampaignIcon}
        title={t('home.features.planner_title')}
        description={t('home.features.planner_desc')}
        reverse
        imageMockup={
          <FeatureMockFrame label={t('home.features.planner_mock_label')}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {t('home.features.planner_mock_label')}
              </span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-white/10 text-slate-200"
                style={{ backgroundColor: 'var(--hero-accent-soft)', color: 'var(--hero-accent)' }}
              >
                {t('home.features.planner_mock_badge')}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 14 }).map((_, i) => (
                <div
                  key={`grid-${i}`}
                  className={`aspect-square rounded-md border flex items-center justify-center ${
                    i % 3 === 0
                      ? 'border-[var(--hero-accent)]/40'
                      : 'border-white/10 bg-white/5'
                  }`}
                  style={i % 3 === 0 ? { backgroundColor: 'var(--hero-accent-soft)' } : undefined}
                >
                  <span className="text-[9px] text-slate-400 font-mono">{i + 1}</span>
                </div>
              ))}
            </div>
          </FeatureMockFrame>
        }
      />

      <FeatureHighlight
        icon={ChartPieIcon}
        title={t('home.features.analytics_title')}
        description={t('home.features.analytics_desc')}
        imageMockup={
          <FeatureMockFrame label={t('home.features.analytics_mock_label')}>
            <div className="flex items-end gap-2 h-28 w-full px-1 pt-2">
              {[35, 55, 75, 45, 95, 65, 80, 50].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%`, backgroundColor: 'var(--hero-accent)' }}
                  className="flex-1 rounded-t-sm opacity-80"
                />
              ))}
            </div>
          </FeatureMockFrame>
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
    <section id="use-cases" className="py-20 md:py-28 border-y border-slate-200/50 dark:border-white/5 scroll-mt-28">
      <SectionHeader
        title={t('home.use_cases.title')}
        subtitle={t('home.use_cases.subtitle')}
      />
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-4 max-w-5xl mx-auto">
        {items.map((item) => (
          <li key={item.title} className="text-center md:text-left">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{item.description}</p>
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
      <div className="mt-4 max-w-3xl mx-auto space-y-0 border-y border-slate-200 dark:border-white/10">
        {faqs.map((item, idx) => {
          const open = openIndex === idx;
          return (
            <div key={idx} className="border-b border-slate-200 dark:border-white/10 last:border-b-0">
              <button
                type="button"
                className="w-full text-left px-1 py-5 flex items-center justify-between gap-4 focus:outline-none"
                onClick={() => setOpenIndex(open ? -1 : idx)}
                aria-expanded={open}
              >
                <span className="font-semibold text-slate-900 dark:text-white text-base md:text-lg">{item.q}</span>
                <span
                  className={`h-8 w-8 shrink-0 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-300 font-bold transition-transform duration-300 ${open ? 'rotate-45' : ''}`}
                  style={open ? { color: 'var(--hero-accent)', borderColor: 'var(--hero-accent)' } : undefined}
                >
                  +
                </span>
              </button>
              <div className={`px-1 text-slate-600 dark:text-slate-300 transition-all duration-300 overflow-hidden ${open ? 'max-h-48 pb-5 opacity-100' : 'max-h-0 pb-0 opacity-0'}`}>
                <p className="leading-relaxed text-sm md:text-base">{item.a}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-12 flex justify-center">
        <ModernButton
          variant="primary"
          size="lg"
          onClick={onNavigateToApp}
          className={primaryCtaClass}
        >
          {t(isLoggedIn ? 'home.hero.cta_logged_in' : 'home.hero.cta')}
        </ModernButton>
      </div>
    </section>
  );
};

const FinalCTASection: React.FC<{ onNavigateToApp: () => void; isLoggedIn: boolean }> = ({ onNavigateToApp, isLoggedIn }) => {
  const { t } = useTranslation();

  return (
    <section
      className="text-center py-16 md:py-24 relative overflow-hidden rounded-2xl my-12 border border-white/10"
      style={{ backgroundColor: 'var(--hero-navy)' }}
    >
      <div className="relative z-10 max-w-2xl mx-auto px-4 space-y-5">
        <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight leading-tight">
          {t('home.final_cta.title')}
        </h2>
        <p className="text-slate-300 text-base md:text-lg max-w-lg mx-auto">
          {t(isLoggedIn ? 'home.final_cta.subtitle_logged_in' : 'home.final_cta.subtitle')}
        </p>
        <div className="pt-2">
          <ModernButton
            variant="primary"
            size="lg"
            onClick={onNavigateToApp}
            className={primaryCtaClass}
          >
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
    <div className="relative animate-fade-in pb-16">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] blur-[150px] opacity-30"
          style={{ background: 'radial-gradient(circle, var(--hero-accent) 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-96 -left-24 w-[32rem] h-[32rem] blur-[150px] opacity-20"
          style={{ background: 'radial-gradient(circle, var(--hero-navy) 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative">
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

          <Reveal reducedMotion={reducedMotion}>
            <FinalCTASection onNavigateToApp={handleNavigateToApp} isLoggedIn={isLoggedIn} />
          </Reveal>
        </div>
      </div>
    </div>
  );
};
