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
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ModernButton } from './ui';
import {
  usePrefersReducedMotion,
  useInViewOnce,
  useCountUp,
  useSEO,
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
      <div className={`rounded-2xl hero-glow-card bg-[#050d16]/90 backdrop-blur-2xl overflow-hidden ${reducedMotion ? '' : 'animate-home-float'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex min-h-[360px] flex-col lg:flex-row">
            <div className="w-full lg:w-[40%] p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col gap-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-400 mb-2">
                  {t('home.hero.preview_topic_label')}
                </p>
                <div className="min-h-[72px] px-3.5 py-3 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-slate-200 leading-relaxed shadow-inner">
                  {t('home.hero.preview_topic')}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-2">
                  {t('home.hero.preview_platform_label')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg shadow-sky-500/20"
                    style={{ backgroundColor: 'var(--hero-accent)' }}
                  >
                    {t('home.hero.preview_platform_ig')}
                  </span>
                  <span className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 border border-white/10 bg-white/5">
                    {t('home.hero.preview_platform_li')}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-2">
                  {t('home.hero.preview_tone_label')}
                </p>
                <div className="h-10 px-3.5 rounded-xl border border-white/10 bg-white/[0.04] flex items-center text-sm text-slate-300">
                  {t('home.hero.preview_tone')}
                </div>
              </div>
              <div
                className="mt-auto h-11 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: 'var(--hero-accent)' }}
              >
                <PencilIcon className="w-4 h-4" />
                {t('home.hero.preview_generate')}
              </div>
            </div>

            <div className="w-full lg:w-[60%] p-6 md:p-8 flex flex-col gap-4 bg-gradient-to-br from-[#0b1728] to-[#050d16]">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-sky-400" />
                  {t('home.hero.preview_label')}
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400">
                  {t('home.hero.preview_status')}
                </span>
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-400/90 mb-1.5">
                    {t('home.hero.preview_hook')}
                  </p>
                  <p className="font-display text-xl font-extrabold text-white leading-snug">
                    {t('home.hero.preview_topic')}
                  </p>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed max-w-lg">
                  {t('home.hero.preview_body')}
                </p>
                <p className="text-sm font-semibold text-sky-400">
                  {t('home.hero.preview_cta_line')}
                </p>
                <div className="flex gap-2 pt-2 text-xs text-slate-400">
                  <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10">{t('home.hero.preview_tag_ai')}</span>
                  <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10">{t('home.hero.preview_tag_marketing')}</span>
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
    { icon: PencilIcon, label: t('home.trust.item_generate') },
    { icon: CampaignIcon, label: t('home.trust.item_plan') },
    { icon: ChartPieIcon, label: t('home.trust.item_analyze') },
  ];

  return (
    <section className="py-12 border-b border-slate-200/70 dark:border-white/5 bg-[var(--hero-surface)]">
      <div className="max-w-6xl mx-auto px-4">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em]">
          {t('home.trust.title')}
        </p>
        <ul className="mt-5 flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-x-10 sm:gap-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label} className="font-display text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5 group transition-transform duration-200 hover:scale-[1.03]">
                <Icon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-[var(--hero-accent)] transition-colors" />
                {item.label}
              </li>
            );
          })}
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
  <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center py-12 rounded-2xl px-4 -mx-4 transition-colors duration-300 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] ${reverse ? 'lg:grid-flow-col-dense' : ''}`}>
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
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: 'var(--hero-accent)' }} />
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 rounded-sm w-1/3" style={{ backgroundColor: 'var(--hero-accent)' }} />
                  <div className="h-1.5 bg-white/10 rounded-sm w-1/4" />
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="h-2 bg-white/15 rounded-sm" />
                <div className="h-2 bg-white/10 rounded-sm w-5/6" />
                <div className="h-2 bg-white/10 rounded-sm w-4/6" />
                <div className="h-2 bg-white/10 rounded-sm w-3/4" />
              </div>
              <div className="flex gap-1.5 pt-1">
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--hero-accent-soft)', color: 'var(--hero-accent)' }}>#ContentMarketing</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--hero-accent-soft)', color: 'var(--hero-accent)' }}>#SocialMedia</span>
              </div>
              <div className="aspect-[16/10] border border-white/10 rounded-sm flex items-center justify-center bg-white/[0.03] relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 50% 50%, var(--hero-accent), transparent 70%)' }} />
                <PencilIcon className="w-7 h-7 text-slate-500 relative z-10" />
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
                  className={`aspect-square rounded-sm border flex flex-col items-center justify-center gap-0.5 ${
                    i % 3 === 0 ? 'border-[var(--hero-accent)]/50' : 'border-white/10 bg-white/[0.03]'
                  }`}
                  style={i % 3 === 0 ? { backgroundColor: 'var(--hero-accent-soft)' } : undefined}
                >
                  <span className="text-[9px] text-slate-500 font-mono">{i + 1}</span>
                  {i % 3 === 0 && <div className="w-3/4 h-1 rounded-full" style={{ backgroundColor: 'var(--hero-accent)' }} />}
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
                <div key={i} className="flex-1 flex flex-col justify-end gap-1">
                  <div
                    style={{ height: `${h}%`, backgroundColor: 'var(--hero-accent)' }}
                    className="rounded-t-sm opacity-85"
                  />
                  {i === 4 && (
                    <span className="text-[8px] text-center" style={{ color: 'var(--hero-accent)' }}>95%</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
              <span className="text-[10px] text-slate-500">Mon</span>
              <span className="text-[10px] text-slate-500">Sun</span>
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

const AllFeaturesGrid = () => {
  const { t } = useTranslation();

  const featureItems = [
    { title: t('home.features_ecosystem.brand_voice_title'), desc: t('home.features_ecosystem.brand_voice_desc'), icon: SparklesIcon, gradient: 'from-amber-500 to-orange-500' },
    { title: t('home.features_ecosystem.tech_radar_title'), desc: t('home.features_ecosystem.tech_radar_desc'), icon: TargetIcon, gradient: 'from-sky-500 to-blue-600' },
    { title: t('home.features_ecosystem.omnichannel_title'), desc: t('home.features_ecosystem.omnichannel_desc'), icon: CampaignIcon, gradient: 'from-purple-500 to-indigo-600' },
    { title: t('home.features_ecosystem.video_title'), desc: t('home.features_ecosystem.video_desc'), icon: PencilIcon, gradient: 'from-pink-500 to-rose-600' },
    { title: t('home.features_ecosystem.repurpose_title'), desc: t('home.features_ecosystem.repurpose_desc'), icon: SendIcon, gradient: 'from-emerald-500 to-teal-600' },
    { title: t('home.features_ecosystem.safety_title'), desc: t('home.features_ecosystem.safety_desc'), icon: TargetIcon, gradient: 'from-red-500 to-orange-600' },
    { title: t('home.features_ecosystem.publishing_title'), desc: t('home.features_ecosystem.publishing_desc'), icon: SendIcon, gradient: 'from-indigo-500 to-cyan-500' },
    { title: t('home.features_ecosystem.analytics_title'), desc: t('home.features_ecosystem.analytics_desc'), icon: ChartPieIcon, gradient: 'from-blue-500 to-violet-600' },
  ];

  return (
    <section className="py-20 md:py-28 border-t border-slate-200/70 dark:border-white/5">
      <SectionHeader
        title={t('home.features_ecosystem.title')}
        subtitle={t('home.features_ecosystem.subtitle')}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {featureItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0b1728]/80 backdrop-blur-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                {item.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const ComparisonSection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-20 md:py-28 border-t border-slate-200/70 dark:border-white/5 bg-slate-900/40 rounded-3xl p-8 md:p-12 my-12">
      <SectionHeader
        title={t('home.comparison.title')}
        subtitle={t('home.comparison.subtitle')}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <div className="p-8 rounded-2xl border border-red-500/20 bg-red-500/5 dark:bg-red-950/20 space-y-4">
          <h3 className="font-display text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            {t('home.comparison.before_title')}
          </h3>
          <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <li className="flex items-start gap-2">❌ <span>{t('home.comparison.before_item1')}</span></li>
            <li className="flex items-start gap-2">❌ <span>{t('home.comparison.before_item2')}</span></li>
            <li className="flex items-start gap-2">❌ <span>{t('home.comparison.before_item3')}</span></li>
            <li className="flex items-start gap-2">❌ <span>{t('home.comparison.before_item4')}</span></li>
          </ul>
        </div>

        <div className="p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-4 shadow-xl shadow-emerald-500/5">
          <h3 className="font-display text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            {t('home.comparison.after_title')}
          </h3>
          <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
            <li className="flex items-start gap-2">✅ <span>{t('home.comparison.after_item1')}</span></li>
            <li className="flex items-start gap-2">✅ <span>{t('home.comparison.after_item2')}</span></li>
            <li className="flex items-start gap-2">✅ <span>{t('home.comparison.after_item3')}</span></li>
            <li className="flex items-start gap-2">✅ <span>{t('home.comparison.after_item4')}</span></li>
          </ul>
        </div>
      </div>
    </section>
  );
};

const StatsSection: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const { t } = useTranslation();
  const { ref, isInView } = useInViewOnce<HTMLDivElement>({ rootMargin: '80px 0px' });

  const stats = [
    { value: parseInt(t('home.stats.stat1_value'), 10) || 10, suffix: t('home.stats.stat1_suffix'), label: t('home.stats.stat1_label') },
    { value: parseInt(t('home.stats.stat2_value'), 10) || 50, suffix: t('home.stats.stat2_suffix'), label: t('home.stats.stat2_label') },
    { value: parseInt(t('home.stats.stat3_value'), 10) || 5000, suffix: t('home.stats.stat3_suffix'), label: t('home.stats.stat3_label') },
    { value: parseInt(t('home.stats.stat4_value'), 10) || 3, suffix: t('home.stats.stat4_suffix'), label: t('home.stats.stat4_label') },
  ];

  return (
    <section className="py-20 md:py-28 border-y border-slate-200/70 dark:border-white/5 scroll-mt-28">
      <SectionHeader title={t('home.stats.title')} subtitle={t('home.stats.subtitle')} />
      <div ref={ref} className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} start={isInView} reducedMotion={reducedMotion} />
        ))}
      </div>
    </section>
  );
};

const StatCard: React.FC<{ value: number; suffix: string; label: string; start: boolean; reducedMotion: boolean }> = ({
  value, suffix, label, start, reducedMotion,
}) => {
  const count = useCountUp(value, start && !reducedMotion);
  return (
    <div className="text-center sm:text-left">
      <p className="font-display text-4xl md:text-5xl font-extrabold tracking-tight" style={{ color: 'var(--hero-accent)' }}>
        {count.toLocaleString()}{suffix}
      </p>
      <p className="mt-2 text-sm md:text-base text-slate-600 dark:text-slate-300 leading-snug">
        {label}
      </p>
    </div>
  );
};

const TestimonialsSection = () => {
  const { t } = useTranslation();

  const testimonials = [
    { quote: t('home.testimonials.item1_quote'), name: t('home.testimonials.item1_name'), role: t('home.testimonials.item1_role') },
    { quote: t('home.testimonials.item2_quote'), name: t('home.testimonials.item2_name'), role: t('home.testimonials.item2_role') },
    { quote: t('home.testimonials.item3_quote'), name: t('home.testimonials.item3_name'), role: t('home.testimonials.item3_role') },
  ];

  return (
    <section className="py-20 md:py-28 scroll-mt-28">
      <SectionHeader title={t('home.testimonials.title')} subtitle={t('home.testimonials.subtitle')} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {testimonials.map((item, i) => (
          <figure
            key={i}
            className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-slate-900/30 p-6 md:p-7 transition-all duration-300 hover:shadow-lg hover:border-[var(--hero-accent)]/30 dark:hover:border-[var(--hero-accent)]/30"
          >
            <blockquote className="text-slate-700 dark:text-slate-200 text-sm md:text-base leading-relaxed">
              &ldquo;{item.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm text-white flex-shrink-0"
                style={{ backgroundColor: 'var(--hero-accent)' }}
              >
                {item.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white text-sm">{item.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.role}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};

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

const MobileLandingNav: React.FC<{ onPricingClick: () => void }> = ({ onPricingClick }) => {
  const { t } = useTranslation();
  const items = [
    { label: t('home.nav.howItWorks'), anchor: 'how-it-works' as const },
    { label: t('home.nav.features'), anchor: 'features' as const },
    { label: t('home.nav.pricing'), onClick: onPricingClick },
    { label: t('home.nav.faq'), anchor: 'faq' as const },
  ];

  return (
    <nav className="md:hidden sticky top-16 z-40 bg-[var(--hero-surface)]/90 backdrop-blur-md border-b border-slate-200/70 dark:border-white/5" aria-label={t('home.nav.ariaLabel')}>
      <div className="flex gap-1 overflow-x-auto px-4 py-2 scrollbar-hide">
        {items.map((item) =>
          'anchor' in item ? (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                const el = document.getElementById(item.anchor!);
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-full border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              {item.label}
            </button>
          )
        )}
      </div>
    </nav>
  );
};

const PricingPreviewSection: React.FC<{ onSeeFullPricing: () => void; onChoosePlan: () => void }> = ({
  onSeeFullPricing,
  onChoosePlan,
}) => {
  const { t } = useTranslation();

  const plans = [
    {
      name: t('home.pricing_preview.plan_free_name'),
      price: t('home.pricing_preview.plan_free_price'),
      desc: t('home.pricing_preview.plan_free_desc'),
      featured: false,
      cta: t('home.pricing_preview.cta_free'),
    },
    {
      name: t('home.pricing_preview.plan_creator_name'),
      price: '$19',
      desc: t('home.pricing_preview.plan_creator_desc'),
      featured: false,
      cta: t('home.pricing_preview.cta_choose'),
    },
    {
      name: t('home.pricing_preview.plan_pro_name'),
      price: '$49',
      desc: t('home.pricing_preview.plan_pro_desc'),
      featured: true,
      cta: t('home.pricing_preview.cta_choose'),
    },
    {
      name: t('home.pricing_preview.plan_business_name'),
      price: '$149',
      desc: t('home.pricing_preview.plan_business_desc'),
      featured: false,
      cta: t('home.pricing_preview.cta_choose'),
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-28 scroll-mt-28 border-t border-slate-200/70 dark:border-white/5">
      <SectionHeader title={t('home.pricing_preview.title')} subtitle={t('home.pricing_preview.subtitle')} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-2xl border p-6 flex flex-col transition-all duration-300 hover:shadow-lg ${
              plan.featured
                ? 'border-[var(--hero-accent)] bg-[var(--hero-accent-soft)]'
                : 'border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-slate-900/30 hover:border-[var(--hero-accent)]/30'
            }`}
          >
            {plan.featured && (
              <span
                className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full text-white"
                style={{ backgroundColor: 'var(--hero-accent)' }}
              >
                {t('home.pricing_preview.recommended_badge')}
              </span>
            )}
            <p className="font-display text-lg font-bold text-slate-900 dark:text-white">{plan.name}</p>
            <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {plan.price}
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {plan.price !== '$0' && t('home.pricing_preview.per_month')}
              </span>
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed flex-1">{plan.desc}</p>
            <button
              type="button"
              onClick={onChoosePlan}
              className={`mt-5 w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
                plan.featured
                  ? 'text-white hover:brightness-110'
                  : 'border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
              style={plan.featured ? { backgroundColor: 'var(--hero-accent)' } : undefined}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={onSeeFullPricing}
          className="text-sm font-semibold hover:underline"
          style={{ color: 'var(--hero-accent)' }}
        >
          {t('home.pricing_preview.see_full_pricing')} →
        </button>
      </div>
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
          const panelId = `faq-panel-${idx}`;
          return (
            <div key={idx} className="border-b border-slate-200 dark:border-white/10 last:border-b-0">
              <button
                type="button"
                className="w-full text-left px-0 py-5 flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-accent)]"
                onClick={() => setOpenIndex(open ? -1 : idx)}
                aria-expanded={open}
                aria-controls={panelId}
              >
                <span className="font-semibold text-slate-900 dark:text-white text-base md:text-lg pr-4">{item.q}</span>
                <ChevronDownIcon
                  className={`w-5 h-5 flex-shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                  style={open ? { color: 'var(--hero-accent)' } : undefined}
                  aria-hidden="true"
                />
              </button>
              <div
                id={panelId}
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
      <div
        className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, #050d16, transparent)' }}
        aria-hidden="true"
      />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-24 md:py-32 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-2" style={{ backgroundColor: 'var(--hero-accent-soft)' }}>
          <SparklesIcon className="w-7 h-7" style={{ color: 'var(--hero-accent)' }} />
        </div>
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
  const { setAuthModal, setIsPricingModalOpen } = useUIStore();
  const reducedMotion = usePrefersReducedMotion();
  const { t } = useTranslation();

  useSEO({
    title: `${t('home.hero.brand')} — ${t('home.hero.title')}`,
    description: t('home.hero.subtitle'),
  });

  const handleNavigateToApp = () => {
    if (user) {
      navigate('/generator');
    } else {
      setAuthModal('signup');
    }
  };

  const isLoggedIn = Boolean(user);

  const handlePricingClick = () => {
    const el = document.getElementById('pricing');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSeeFullPricing = () => {
    setIsPricingModalOpen(true);
  };

  const handleChoosePlan = () => {
    if (user) {
      setIsPricingModalOpen(true);
    } else {
      setAuthModal('signup');
    }
  };

  return (
    <div className="relative pb-0 -mt-0">
      <ScrollProgressBar />
      <MobileLandingNav onPricingClick={handlePricingClick} />
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
          <AllFeaturesGrid />
        </Reveal>

        <Reveal reducedMotion={reducedMotion}>
          <ComparisonSection />
        </Reveal>

        <Reveal reducedMotion={reducedMotion}>
          <StatsSection reducedMotion={reducedMotion} />
        </Reveal>

        <Reveal reducedMotion={reducedMotion}>
          <UseCasesSection />
        </Reveal>

        <Reveal reducedMotion={reducedMotion}>
          <TestimonialsSection />
        </Reveal>

        <Reveal reducedMotion={reducedMotion}>
          <PricingPreviewSection onSeeFullPricing={handleSeeFullPricing} onChoosePlan={handleChoosePlan} />
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
