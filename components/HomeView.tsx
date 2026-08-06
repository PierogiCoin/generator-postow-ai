import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUIStore } from '../stores/uiStore';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  MousePointerClick,
  Sparkles,
  PenLine,
  CalendarCheck,
  Target,
  Rocket,
  Bot,
  ShieldCheck,
} from 'lucide-react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { MenuIcon } from './icons/MenuIcon';
import { ModernButton } from './ui';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import {
  usePrefersReducedMotion,
  useSEO,
  scrollToAnchor,
  Reveal,
  useScrollPosition,
} from './homeViewUtils';
import { IndustryFunnelHero } from './IndustryFunnelHero';
import { RoiCalculator } from './home/RoiCalculator';
import { LiveSocialProofToasts } from './home/LiveSocialProofToasts';
import type { IndustryPackId } from '../utils/industryPacks';

interface HomeViewProps {}

const primaryCtaClass =
  'rounded-lg px-8 py-3.5 !bg-[var(--hero-accent)] ![background-image:none] hover:brightness-110 text-white font-semibold shadow-none focus:!ring-[var(--hero-accent)]';

const ScrollProgressBar: React.FC = () => {
  const { progress } = useScrollPosition();

  return (
    <div className="fixed top-0 left-0 right-0 h-0.5 z-[60] pointer-events-none">
      <div
        className="h-full transition-[width] duration-75 ease-out"
        style={{ width: `${progress}%`, backgroundColor: 'var(--hero-accent)' }}
      />
    </div>
  );
};

const LandingNav: React.FC<{ onSignup: () => void; onLogin: () => void; onPricing: () => void; isLoggedIn: boolean }> = ({ onSignup, onLogin, onPricing, isLoggedIn }) => {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScrollPosition();
  const scrolled = scrollY > 20;

  const items = [
    { label: t('home.journey.nav_how_it_works', 'Jak to działa'), id: 'jak-to-dziala' },
    { label: t('home.journey.nav_why_us', 'Dlaczego my'), id: 'dlaczego-my' },
    { label: t('home.journey.nav_industries', 'Branże'), id: 'branze' },
  ];

  const handleNavClick = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileOpen(false);
  };

  return (
    <nav
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'border-b border-sky-500/20 bg-[#07090c]/90 backdrop-blur-xl shadow-lg shadow-sky-500/5'
          : 'border-b border-white/5 bg-[#07090c]/80 backdrop-blur-md'
      }`}
      aria-label={t('home.nav.ariaLabel')}
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="font-display text-sm font-bold tracking-tight text-white shrink-0 hover:opacity-90 transition-opacity"
        >
          {t('home.hero.brand')}
        </button>
        <div className="hidden sm:flex items-center gap-1 overflow-x-auto">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { onPricing(); }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            {t('home.nav.pricing')}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            {!isLoggedIn && (
              <button
                type="button"
                onClick={onLogin}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                {t('header.login')}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="sm:hidden p-1.5 text-slate-400 hover:text-white transition-colors"
            aria-label={t('home.nav.openMenu')}
            aria-expanded={mobileOpen}
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <ModernButton
            variant="primary"
            size="sm"
            onClick={onSignup}
            className="!bg-[var(--hero-accent)] ![background-image:none] hover:brightness-110 text-white text-xs font-bold rounded-xl px-3.5 py-2 shrink-0 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5"
          >
            {t(isLoggedIn ? 'home.journey.nav_app' : 'home.journey.nav_signup_boost', 'Odbierz darmowe kredyty ⚡')}
          </ModernButton>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-white/5 bg-[#07090c]/95 backdrop-blur-xl animate-fade-in">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className="px-3 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors text-left"
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { onPricing(); setMobileOpen(false); }}
              className="px-3 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors text-left"
            >
              {t('home.nav.pricing')}
            </button>
            {!isLoggedIn && (
              <button
                type="button"
                onClick={() => { onLogin(); setMobileOpen(false); }}
                className="px-3 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors text-left"
              >
                {t('header.login')}
              </button>
            )}
            <div className="flex items-center gap-4 px-3 pt-2 mt-1 border-t border-white/5">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

const PLATFORM_PREVIEWS = {
  linkedin: {
    badge: '💼 LinkedIn Post',
    formatting: 'Profesjonalna struktura, podział na sekcje & CTA biznesowe',
    content: (topic: string) => `💼 ${topic}\n\nTworzenie wartościowych treści na LinkedIn nie musi zajmować 4 godzin dziennie.\n\nOto 3 kroki do automatyzacji procesu publikacji:\n\n1️⃣ Wygeneruj ekspercki post i grafikę w 30 sekund\n2️⃣ Dostosuj ton do głosu Twojej marki (Brand Voice)\n3️⃣ Zaplanuj automatyczną publikację na cały tydzień\n\nJak u Was wygląda planowanie treści? Dajcie znać w komentarzu! 👇`,
    hashtags: '#Marketing #SocialMedia #B2B #Automation #AI',
  },
  instagram: {
    badge: '📸 Instagram Caption',
    formatting: 'Wizualny styl, nawiasy z punktami & angażujący zestaw hashtagów',
    content: (topic: string) => `✨ ${topic} ✨\n\nOto jak oszczędzić 10+ godzin tygodniowo na tworzeniu postów! 🚀\n\n- ⚡ Wpis i karuzela gotowa w 30s\n- 🎯 Zestaw wiralowych hashtagów z AI\n- 🎨 Automatyczny dobór estetyki wizualnej\n\nZapisz ten post na później i wypróbuj darmowe kredyty w bio! 📲`,
    hashtags: '#InstagramGrowth #ContentCreator #AIStyle #InstaTips',
  },
  tiktok: {
    badge: '🎵 TikTok Script & Caption',
    formatting: 'Wiralowy HAK w pierwszych 3 sekundach + scenariusz wideo',
    content: (topic: string) => `🎬 [HOOK wideo 0-3s]: "Stwórzmy post na cały tydzień w 30 sekund!"\n\n💡 Opis: ${topic}\n\nChcesz tworzyć virale bez spędzania całych dni przed ekranem? Algorytm AI generuje gotowe skrypty i podpisy w mgnieniu oka! 🔥`,
    hashtags: '#TikTokTips #ViralHack #AICreator #GrowthHack',
  },
};

const HERO_DEMO_TOPICS = [
  '3 sposoby na automatyzację publikacji w Social Media w 2026',
  'Jak budować zaangażowaną społeczność wokół marki bez budżetu',
];

const HeroLiveDemoWidget: React.FC = () => {
  const { t } = useTranslation();
  const [activePlatform, setActivePlatform] = useState<'linkedin' | 'instagram' | 'tiktok'>('linkedin');
  const [sampleIdx, setSampleIdx] = useState(0);

  const currentTopic = HERO_DEMO_TOPICS[sampleIdx];
  const platformData = PLATFORM_PREVIEWS[activePlatform];

  return (
    <div className="max-w-2xl mx-auto rounded-3xl bg-white/[0.03] border border-white/10 p-4 sm:p-6 backdrop-blur-2xl shadow-2xl text-left space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {t('home.demo.title', 'Podgląd Na Żywo (Demo AI)')}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10" role="tablist">
          {(['linkedin', 'instagram', 'tiktok'] as const).map((platform) => (
            <button
              key={platform}
              type="button"
              role="tab"
              aria-selected={activePlatform === platform}
              aria-label={`Pokaż podgląd dla ${platform}`}
              onClick={() => setActivePlatform(platform)}
              className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                activePlatform === platform
                  ? 'bg-[var(--hero-accent)] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {platform}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <span className="font-semibold text-sky-400 truncate max-w-xs sm:max-w-md">
            {platformData.badge}
          </span>
          <button
            type="button"
            onClick={() => setSampleIdx((prev) => (prev + 1) % HERO_DEMO_TOPICS.length)}
            className="text-xs text-emerald-400 hover:underline font-bold transition-all"
          >
            {t('home.demo.change_topic', 'Zmień przykład 🔄')}
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed font-sans shadow-inner space-y-2">
          <p>{platformData.content(currentTopic)}</p>
          <div className="pt-2 border-t border-white/5 text-sky-400/90 font-medium text-xs">
            {platformData.hashtags}
          </div>
        </div>

        <div className="text-[11px] text-slate-400 italic text-right">
          ⚡ {platformData.formatting}
        </div>
      </div>
    </div>
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

      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-[#050706] via-[#0a1210]/90 to-transparent" />
        <div
          className={`absolute left-1/2 -translate-x-1/2 bottom-[18%] w-[min(120vw,920px)] h-px landing-stream ${reducedMotion ? 'opacity-40' : 'animate-home-stream'}`}
        />
      </div>

      <div className="relative z-10 flex-1 flex items-center max-w-7xl mx-auto px-4 pt-24 pb-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center w-full">
          <div className="text-center lg:text-left">
            <h1
              className={`text-5xl sm:text-6xl font-bold tracking-tight leading-tight ${reducedMotion ? '' : 'animate-home-rise'}`}
            >
              <span className="bg-gradient-to-b from-white to-white/80 bg-clip-text text-transparent">
                Generuj posty na social media w 30 sekund
              </span>
            </h1>
            <p
              className={`mt-5 text-xl text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed ${reducedMotion ? '' : 'animate-home-rise'}`}
              style={reducedMotion ? undefined : { animationDelay: '120ms' }}
            >
              AI napisze, zaprojektuje grafikę i zaplanuje publikację — dopasowane do Twojej branży
            </p>
            <div
              className={`mt-8 flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-3 ${reducedMotion ? '' : 'animate-home-rise'}`}
              style={reducedMotion ? undefined : { animationDelay: '220ms' }}
            >
              <ModernButton
                variant="primary"
                size="lg"
                onClick={onStart}
                className="rounded-xl px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                {t(isLoggedIn ? 'home.journey.hero_cta_logged_in' : 'home.journey.hero_cta', 'Wypróbuj za darmo')}
                <ArrowRight className="w-5 h-5" />
              </ModernButton>
              <ModernButton
                variant="outline"
                size="lg"
                onClick={() => scrollToAnchor('demo', reducedMotion)}
                className="rounded-xl px-8 py-3.5 border-white/20 text-slate-200 bg-transparent hover:bg-white/5 hover:border-emerald-500/50"
              >
                Zobacz demo w akcji
              </ModernButton>
            </div>

            <div
              className={`mt-6 flex flex-wrap justify-center lg:justify-start gap-4 text-sm text-slate-500 ${reducedMotion ? '' : 'animate-home-rise'}`}
              style={reducedMotion ? undefined : { animationDelay: '320ms' }}
            >
              <span>⚡ 10 000+ postów</span>
              <span>🏢 50+ branż</span>
              <span>📱 5 platform</span>
              <span>⭐ 4.9/5</span>
            </div>
          </div>

          <div
            id="demo"
            className={`${reducedMotion ? '' : 'animate-home-rise'}`}
            style={reducedMotion ? undefined : { animationDelay: '240ms' }}
          >
            <p className="mb-3 text-sm text-slate-300 flex items-center gap-2">
              <span className="text-base">👁️</span> Zobacz, jak AI pisze posty na żywo
            </p>
            <HeroLiveDemoWidget />
          </div>
        </div>
      </div>
    </section>
  );
};

const HowItWorksSection: React.FC = () => {
  const { t } = useTranslation();

  const steps = [
    {
      icon: MousePointerClick,
      title: 'Wybierz branżę',
      desc: '50+ gotowych pakietów: gastronomia, beauty, SaaS, e-commerce i więcej',
    },
    {
      icon: Sparkles,
      title: 'AI generuje content',
      desc: 'Post, grafika, hashtagi i warianty A/B — wszystko w 30 sekund',
    },
    {
      icon: PenLine,
      title: 'Zatwierdź lub popraw',
      desc: 'Edytuj w wizualnym edytorze, dodaj swój brand voice',
    },
    {
      icon: CalendarCheck,
      title: 'Publikuj lub zaplanuj',
      desc: 'Wyślij od razu lub zaplanuj na najlepszą godzinę',
    },
  ];

  return (
    <section id="jak-to-dziala" className="scroll-mt-24 py-20 md:py-28 bg-[#050911] text-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-3">
            {t('home.journey.how_kicker', 'Jak to działa')}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Od pomysłu do posta w 4 krokach
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="relative p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="absolute top-5 right-5 font-display text-4xl font-extrabold text-white/5 leading-none select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="text-lg font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const WhyAICPSection: React.FC = () => {
  const { t } = useTranslation();

  const benefits = [
    {
      icon: Target,
      emoji: '🎯',
      title: 'Dopasowane do branży',
      desc: 'AI wie, że restauracja potrzebuje "menu dnia", a SaaS "case study". Nie generyczne bełkoty.',
    },
    {
      icon: Rocket,
      emoji: '🚀',
      title: 'Multi-platform',
      desc: 'Jeden post, warianty na LinkedIn, Instagram, TikTok, Facebook i X.',
    },
    {
      icon: Bot,
      emoji: '🤖',
      title: 'Automatyzacja',
      desc: 'RSS → post, produkt → post, planowanie kolejki, auto-publikacja.',
    },
    {
      icon: ShieldCheck,
      emoji: '🛡️',
      title: 'Jakość bez śmieci',
      desc: 'Anti-slop system, scoring treści, brand voice memory.',
    },
  ];

  return (
    <section id="dlaczego-my" className="scroll-mt-24 relative home-hero-wash text-white py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0 home-noise pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 max-w-6xl mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-3">
            {t('home.journey.why_kicker', 'Dlaczego AI Content Pro?')}
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
            Social media, które przynoszą klientów
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-colors"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xl">{b.emoji}</span>
                </div>
                <h3 className="text-lg font-semibold text-white">{b.title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{b.desc}</p>
              </div>
            );
          })}
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
    <section className="py-20 border-y border-slate-200/80 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 space-y-12">
        {/* Metric Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="p-6 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 shadow-sm space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-display flex items-center justify-center gap-1.5">
              <span>4.9</span>
              <span className="text-amber-400 text-2xl">★</span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              {t('home.journey.proof_rating_label', 'Średnia ocena z 10,000+ wpisów')}
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 shadow-sm space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-display">
              12h / tydz.
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              {t('home.journey.proof_time_saved', 'Zaoszczędzone na pisanie postów')}
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 shadow-sm space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-sky-400 font-display">
              +300%
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              {t('home.journey.proof_engagement', 'Wyższe zaangażowanie odbiorców')}
            </p>
          </div>
        </div>

        {/* Featured Testimonial Quote */}
        <div className="max-w-3xl mx-auto text-center p-8 rounded-3xl bg-slate-900/60 border border-white/10 shadow-xl space-y-4">
          <p className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed tracking-tight">
            „{t('home.journey.proof_quote')}”
          </p>
          <div className="text-xs sm:text-sm text-slate-400 font-semibold flex items-center justify-center gap-2">
            <span className="text-emerald-400">✓ Weryfikowany Twórca</span>
            <span>·</span>
            <span>{t('home.journey.proof_author')}</span>
            <span>·</span>
            <span className="text-slate-500">{t('home.journey.proof_role')}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

const FAQSection: React.FC = () => {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: t('home.journey.faq_1_q', 'Czy treści wygenerowane przez AI są unikalne i bezpieczne?'),
      a: t('home.journey.faq_1_a', 'Tak! Każda treść jest generowana od nowa i dopasowywana do specyfiki Twojej branży. Zapewniamy 100% autorskie formuły bez ryzyka plagiatu.'),
    },
    {
      q: t('home.journey.faq_2_q', 'Czy muszę podawać kartę kredytową przy rejestracji?'),
      a: t('home.journey.faq_2_a', 'Nie! Rejestracja jest całkowicie darmowa i nie wymaga podawania danych karty. Otrzymasz darmowe kredyty na start do przetestowania pełnych możliwości aplikacji.'),
    },
    {
      q: t('home.journey.faq_3_q', 'Jak AI dopasowuje się do unikalnego głosu mojej marki (Brand Voice)?'),
      a: t('home.journey.faq_3_a', 'Możesz zdefiniować ton wypowiedzi, słowa kluczowe oraz styl marki w ustawieniach. Silnik AI zapamiętuje te preferencje dla każdego kolejnego posta.'),
    },
    {
      q: t('home.journey.faq_4_q', 'Czy mogę automatycznie planować publikację w Social Media?'),
      a: t('home.journey.faq_4_a', 'Tak, AI Content Pro posiada wbudowany kalendarz oraz interfejs do bezpośredniej publikacji na platformach LinkedIn, Instagram, Facebook i TikTok.'),
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-[var(--hero-surface)] border-t border-white/5">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">
            {t('home.journey.faq_kicker', 'Często Zadawane Pytania')}
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('home.journey.faq_title', 'Wszystko, co musisz wiedzieć przed rozpoczęciem')}
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  aria-controls={`landing-faq-panel-${idx}`}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-semibold text-slate-900 dark:text-white hover:text-[var(--hero-accent)] transition-colors"
                >
                  <span className="text-base md:text-lg">{faq.q}</span>
                  <ChevronDownIcon
                    className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[var(--hero-accent)]' : 'text-slate-500'}`}
                    aria-hidden="true"
                  />
                </button>
                <div
                  id={`landing-faq-panel-${idx}`}
                  hidden={!isOpen}
                  className="px-5 pb-5 text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-white/5 pt-3"
                >
                  {faq.a}
                </div>
              </div>
            );
          })}
        </div>
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

        {/* Trust Badges */}
        <div className="pt-2 flex flex-wrap justify-center items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">⚡</span> {t('home.journey.final_trust_access')}
          </span>
          <span className="hidden sm:inline text-slate-700">•</span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">🔒</span> {t('home.journey.final_trust_security')}
          </span>
          <span className="hidden sm:inline text-slate-700">•</span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">💳</span> {t('home.journey.final_trust_no_card')}
          </span>
        </div>

        <p className="text-xs text-slate-500">{t('home.journey.final_note')}</p>
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
    title: `${t('home.hero.brand')} — Generuj posty na social media w 30 sekund`,
    description: 'AI napisze, zaprojektuje grafikę i zaplanuje publikację — dopasowane do Twojej branży.',
  });

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const isLoggedIn = false;

  const openSignupOrApp = () => {
    if (user) navigate('/dashboard');
    else setAuthModal('signup');
  };

  const handleFunnelContinue = (_selectedIds: IndustryPackId[]) => {
    openSignupOrApp();
  };

  const openPricing = () => {
    setIsPricingModalOpen(true);
  };

  return (
    <div className="relative pb-0">
      <ScrollProgressBar />
      <LandingNav onSignup={openSignupOrApp} onLogin={() => setAuthModal('login')} onPricing={openPricing} isLoggedIn={isLoggedIn} />
      <HeroSection reducedMotion={reducedMotion} isLoggedIn={isLoggedIn} onStart={openSignupOrApp} />

      <Reveal reducedMotion={reducedMotion}>
        <HowItWorksSection />
      </Reveal>

      <Reveal reducedMotion={reducedMotion}>
        <WhyAICPSection />
      </Reveal>

      <Reveal reducedMotion={reducedMotion}>
        <div className="bg-[var(--hero-surface)]">
          <IndustryFunnelHero
            reducedMotion={reducedMotion}
            isLoggedIn={isLoggedIn}
            userId={undefined}
            onContinue={handleFunnelContinue}
          />
        </div>
      </Reveal>

      <Reveal reducedMotion={reducedMotion}>
        <RoiCalculator onStart={openSignupOrApp} />
      </Reveal>

      <Reveal reducedMotion={reducedMotion}>
        <FAQSection />
      </Reveal>

      <Reveal reducedMotion={reducedMotion}>
        <FinalCTASection onNavigateToApp={openSignupOrApp} isLoggedIn={isLoggedIn} />
      </Reveal>

      {/* Floating Social Proof Activity Toast */}
      <LiveSocialProofToasts />
    </div>
  );
};
