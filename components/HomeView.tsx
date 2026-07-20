import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUIStore } from '../stores/uiStore';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from './icons/SparklesIcon';
import { CampaignIcon } from './icons/CampaignIcon';
import { ChartPieIcon } from './icons/ChartPieIcon';
import { TargetIcon } from './icons/TargetIcon';
import { PencilIcon } from './icons/PencilIcon';
import { SendIcon } from './icons/SendIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { ModernButton, ModernCard } from './ui';
import {
  usePrefersReducedMotion,
  useInViewOnce,
  useCountUp,
  scrollToAnchor,
  Reveal,
  SectionHeader,
} from './homeViewUtils';

interface HomeViewProps {}

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
          <div className="flex min-h-[320px] flex-col md:flex-row">
            <div className="w-full md:w-2/5 p-6 md:p-8 border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between gap-6">
              <div className="space-y-3">
                <div
                  className="h-1 w-24 rounded-sm"
                  style={{ backgroundColor: 'var(--hero-accent)' }}
                />
                <div className="space-y-2">
                  <div className="h-10 px-3 rounded-lg border border-white/10 bg-white/5 flex items-center text-sm text-slate-300">
                    {t('home.hero.preview_target')}
                  </div>
                  <div className="h-10 px-3 rounded-lg border border-white/10 bg-white/5 flex items-center text-sm text-slate-300">
                    {t('home.hero.preview_tone')}
                  </div>
                </div>
              </div>
              <div
                className="h-11 rounded-lg text-white font-semibold text-sm flex items-center justify-center"
                style={{ backgroundColor: 'var(--hero-accent)' }}
              >
                {t('home.hero.preview_generate')}
              </div>
            </div>

            <div
              className="w-full md:w-3/5 p-6 md:p-8 flex flex-col justify-between gap-4"
              style={{ backgroundColor: 'var(--hero-navy-muted)' }}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-md"
                    style={{ backgroundColor: 'var(--hero-accent)' }}
                  />
                  <span className="text-sm font-semibold text-white">{t('home.hero.preview_label')}</span>
                </div>
                <span
                  className="text-xs font-semibold tracking-wide"
                  style={{ color: 'var(--hero-accent)' }}
                >
                  {t('home.hero.preview_status')}
                </span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {t('home.hero.preview_body')}
              </p>
              <div className="flex gap-2">
                <span className="text-xs border border-white/10 px-2.5 py-1 rounded-md text-slate-400">
                  {t('home.hero.preview_tag_ai')}
                </span>
                <span className="text-xs border border-white/10 px-2.5 py-1 rounded-md text-slate-400">
                  {t('home.hero.preview_tag_marketing')}
                </span>
              </div>
              <div
                className="h-24 rounded-lg border border-white/10 flex items-center justify-center"
                style={{ backgroundColor: 'var(--hero-accent-soft)' }}
              >
                <PencilIcon className="w-7 h-7 text-slate-300" />
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
            className="rounded-xl px-7 py-3.5 !bg-[var(--hero-accent)] ![background-image:none] hover:brightness-110 text-white font-semibold shadow-md focus:!ring-[var(--hero-accent)]"
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

const StatsSection: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const { ref, isInView } = useInViewOnce<HTMLDivElement>({ rootMargin: '160px 0px' });
  const shouldAnimate = isInView && !reducedMotion;

  const hours = useCountUp(12, shouldAnimate);
  const growth = useCountUp(300, shouldAnimate);
  const posts = useCountUp(30, shouldAnimate);

  const stats = [
    {
      value: String(hours),
      suffix: '+h',
      label: 'Oszczędności tygodniowo',
      glowClass: 'neon-glow-pink',
      icon: SparklesIcon,
      iconColor: 'text-fuchsia-500',
      gradient: 'from-fuchsia-500 to-pink-500'
    },
    {
      value: String(growth),
      suffix: '%',
      label: 'Średni wzrost zaangażowania',
      glowClass: 'neon-glow-cyan',
      icon: ChartPieIcon,
      iconColor: 'text-cyan-500',
      gradient: 'from-cyan-500 to-indigo-500'
    },
    {
      value: String(posts),
      suffix: '+',
      label: 'Treści na kampanię',
      glowClass: 'neon-glow-lime',
      icon: CampaignIcon,
      iconColor: 'text-lime-500',
      gradient: 'from-lime-500 to-emerald-500'
    }
  ];

  return (
    <section ref={ref} className="py-16 md:py-24 max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <ModernCard
              key={idx}
              glass
              hover
              className={`p-8 rounded-3xl border transition-all duration-500 ${stat.glowClass}`}
            >
              <div className="flex items-center gap-5">
                <div className={`h-14 w-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center ${stat.iconColor} border border-slate-200/50 dark:border-white/5 shadow-inner`}>
                  <Icon className="w-7 h-7" />
                </div>
                <div>
                  <p className={`text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r ${stat.gradient} tracking-tight`}>
                    {stat.value}{stat.suffix}
                  </p>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-300 mt-1">
                    {stat.label}
                  </p>
                </div>
              </div>
            </ModernCard>
          );
        })}
      </div>
    </section>
  );
};

const HowItWorksSection = () => {
  const steps = [
    {
      icon: TargetIcon,
      title: "1. Opisz swój cel",
      description: "Powiedz AI, o czym ma być post, kto jest Twoją publicznością i jaki ton chcesz uzyskać.",
      glow: 'neon-glow-cyan'
    },
    {
      icon: PencilIcon,
      title: "2. Wybierz styl",
      description: "Dopasuj platformę, typ treści i styl wizualny, aby idealnie trafić w gusta odbiorców.",
      glow: 'neon-glow-pink'
    },
    {
      icon: SendIcon,
      title: "3. Generuj i publikuj",
      description: "Otrzymaj gotowe treści w kilka sekund. Skopiuj, zaplanuj lub edytuj, aby były idealne.",
      glow: 'neon-glow-lime'
    }
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 scroll-mt-28 border-t border-slate-200/50 dark:border-white/5">
      <SectionHeader
        title="Prostota w 3 krokach"
        subtitle="Od pomysłu do gotowego posta w mniej niż minutę. Bez przełączania narzędzi, bez chaosu — tylko konkretny workflow."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <ModernCard
              key={idx}
              glass
              hover
              className={`p-8 text-center rounded-3xl border relative overflow-hidden group transition-all duration-500 ${step.glow}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-2xl mx-auto mb-6 border border-slate-200/50 dark:border-white/5 shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{step.title}</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{step.description}</p>
              </div>
            </ModernCard>
          );
        })}
      </div>
    </section>
  );
};

const FeatureHighlight: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  imageMockup: React.ReactNode;
  reverse?: boolean;
}> = ({ icon: Icon, title, description, imageMockup, reverse = false }) => (
  <div className={`grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-12 ${reverse ? 'lg:grid-flow-col-dense' : ''}`}>
    <div className={`space-y-6 ${reverse ? 'lg:col-start-2' : ''}`}>
      <div className="inline-flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-sm">
          <Icon className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
        </div>
        <h3 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-sans">
          {title}
        </h3>
      </div>
      <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed font-normal">
        {description}
      </p>
    </div>
    <div className={`mt-8 lg:mt-0 ${reverse ? 'lg:col-start-1' : ''}`}>
      {imageMockup}
    </div>
  </div>
);

const TestimonialsSection = () => {
  const { t } = useTranslation();
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
    <section id="testimonials" className="py-20 md:py-28 bg-slate-50/40 dark:bg-slate-900/20 border-y border-slate-200/50 dark:border-white/5 scroll-mt-28">
      <SectionHeader
        title="Zaufali nam profesjonaliści"
        subtitle="Zobacz, jak transformacja pracy i inteligentne generowanie przekłada się na realne oszczędności."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
        {testimonials.map((t, idx) => (
          <ModernCard key={idx} glass hover className="p-8 rounded-3xl border border-slate-200/50 dark:border-white/5 flex flex-col justify-between h-full bg-white/50">
            <div>
              <div className="flex items-center gap-1.5 mb-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-amber-400 text-lg">★</span>
                ))}
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-2">5.0</span>
              </div>
              <p className="text-slate-700 dark:text-slate-200 italic leading-relaxed text-base">"{t.quote}"</p>
            </div>
            <div className="flex items-center gap-4 mt-8 pt-6 border-t border-slate-200/50 dark:border-white/5">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-fuchsia-500 to-indigo-500 flex items-center justify-center text-white font-bold text-base shadow">
                {t.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{t.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.role}</p>
              </div>
            </div>
          </ModernCard>
        ))}
      </div>
    </section>
  );
};

const FAQSection: React.FC<{ reducedMotion: boolean; onNavigateToApp: () => void; isLoggedIn: boolean }> = ({ reducedMotion, onNavigateToApp, isLoggedIn }) => {
  const { t } = useTranslation();
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
    <section id="faq" className="py-20 md:py-28 scroll-mt-28">
      <SectionHeader title="Najczęstsze Pytania" subtitle="Dowiedz się więcej o działaniu generatora AI lub od razu wypróbuj aplikację za darmo." />
      <div className="mt-12 max-w-3xl mx-auto space-y-4">
        {faqs.map((item, idx) => {
          const open = openIndex === idx;
          return (
            <ModernCard
              key={idx}
              glass
              hover
              className="p-0 overflow-hidden border border-slate-200/50 dark:border-white/5 rounded-2xl bg-white/30 dark:bg-white/5"
            >
              <button
                type="button"
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 focus:outline-none"
                onClick={() => setOpenIndex(open ? -1 : idx)}
                aria-expanded={open}
              >
                <span className="font-bold text-slate-900 dark:text-white text-base md:text-lg">{item.q}</span>
                <span className={`h-8 w-8 rounded-full border border-slate-200/60 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-300 font-bold transition-transform duration-300 ${open ? 'rotate-45 bg-fuchsia-500/10 border-fuchsia-500/30' : ''}`}>
                  +
                </span>
              </button>
              <div className={`px-6 text-slate-600 dark:text-slate-300 transition-all duration-300 overflow-hidden ${open ? 'max-h-48 pb-6 opacity-100' : 'max-h-0 pb-0 opacity-0'}`}>
                <p className="leading-relaxed text-sm md:text-base">{item.a}</p>
              </div>
            </ModernCard>
          );
        })}
      </div>
      <div className="mt-12 flex justify-center">
        <ModernButton
          variant="gradient"
          size="lg"
          onClick={onNavigateToApp}
          className="rounded-full px-8 py-4 bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white font-bold shadow-lg"
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
    <section className="text-center py-20 md:py-32 relative overflow-hidden rounded-3xl my-16 bg-gradient-to-br from-indigo-900/40 via-slate-950 to-fuchsia-950/40 border border-white/5">
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      <div className="relative z-10 max-w-2xl mx-auto px-4 space-y-6">
        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
          {t('home.final_cta.title')}
        </h2>
        <p className="text-slate-400 text-base md:text-lg max-w-lg mx-auto">
          {t(isLoggedIn ? 'home.final_cta.subtitle_logged_in' : 'home.final_cta.subtitle')}
        </p>
        <div className="pt-4">
          <ModernButton
            variant="gradient"
            size="lg"
            onClick={onNavigateToApp}
            className="rounded-full px-10 py-4.5 bg-gradient-to-r from-fuchsia-500 via-purple-600 to-indigo-500 text-white font-extrabold shadow-2xl hover:scale-105 transition-transform duration-300"
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
        
        <StatsSection reducedMotion={reducedMotion} />

        <div className="max-w-6xl mx-auto px-4">
          <Reveal reducedMotion={reducedMotion}>
            <HowItWorksSection />
          </Reveal>

          {/* Features Section */}
          <section id="features" className="py-20 md:py-28 space-y-24 scroll-mt-28 border-t border-slate-200/50 dark:border-white/5">
            <SectionHeader
              title="Moduły, które robią różnicę"
              subtitle="Wszystko, czego potrzebujesz do tworzenia, planowania i optymalizacji treści — w jednym, spójnym środowisku."
            />
            
            <FeatureHighlight
              icon={SparklesIcon}
              title="Generator Treści AI"
              description="Twórz unikalne posty, reklamy i pomysły wideo dopasowane do Twojej marki. Nasz zaawansowany silnik AI rozumie kontekst i generuje treści, które angażują, informują i sprzedają."
              imageMockup={
                <ModernCard glass hover className="p-5 rounded-3xl border border-slate-200/50 dark:border-white/5 neon-glow-pink">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Live Feed Preview</p>
                  <div className="bg-slate-900/50 rounded-2xl p-4 space-y-3 border border-white/5 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500"></div>
                      <div className="h-3 bg-white/20 rounded w-1/3"></div>
                    </div>
                    <div className="space-y-1.5 pt-2">
                      <div className="h-2.5 bg-white/10 rounded"></div>
                      <div className="h-2.5 bg-white/10 rounded w-5/6"></div>
                    </div>
                    <div className="aspect-[16/10] bg-slate-950/80 border border-white/5 rounded-xl flex items-center justify-center">
                      <SparklesIcon className="w-8 h-8 text-fuchsia-500/60" />
                    </div>
                  </div>
                </ModernCard>
              }
            />

            <FeatureHighlight
              icon={CampaignIcon}
              title="Planer Kampanii AI"
              description="Przestań zgadywać. Zdefiniuj swój cel marketingowy, a nasza AI stworzy dla Ciebie kompletny, wielodniowy harmonogram postów z konkretnymi pomysłami na treść, grafikę i wezwania do działania."
              imageMockup={
                <ModernCard glass hover className="p-5 rounded-3xl border border-slate-200/50 dark:border-white/5 neon-glow-cyan">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Content Calendar</p>
                    <span className="text-[9px] bg-cyan-500/25 text-cyan-300 font-bold px-2 py-0.5 rounded-full border border-cyan-500/20">Automatic</span>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 14 }).map((_, i) => (
                      <div
                        key={`grid-${i}`}
                        className={`aspect-square rounded-xl border transition-all duration-300 flex items-center justify-center ${
                          i % 3 === 0
                            ? 'bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border-cyan-500/40'
                            : 'bg-slate-900/40 border-white/5'
                        }`}
                      >
                        <span className="text-[9px] text-slate-400 font-mono">{i + 1}</span>
                      </div>
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
                <ModernCard glass hover className="p-5 rounded-3xl border border-slate-200/50 dark:border-white/5 neon-glow-lime">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Engagement Analytics</p>
                  <div className="flex items-end gap-2.5 h-28 w-full px-2 pt-2 bg-slate-900/50 border border-white/5 rounded-2xl shadow-inner">
                    {[35, 55, 75, 45, 95, 65, 80, 50].map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}%` }}
                        className="flex-1 bg-gradient-to-t from-lime-500 to-emerald-500 rounded-t-lg transition-all duration-500"
                      />
                    ))}
                  </div>
                </ModernCard>
              }
            />
          </section>

          <Reveal reducedMotion={reducedMotion}>
            <TestimonialsSection />
          </Reveal>

          <Reveal reducedMotion={reducedMotion}>
            <FAQSection reducedMotion={reducedMotion} onNavigateToApp={handleNavigateToApp} isLoggedIn={isLoggedIn} />
          </Reveal>

          <Reveal reducedMotion={reducedMotion}>
            <FinalCTASection onNavigateToApp={handleNavigateToApp} isLoggedIn={isLoggedIn} />
          </Reveal>
        </div>
      </div>
    </div>
  );
};
