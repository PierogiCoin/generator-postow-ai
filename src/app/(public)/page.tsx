"use client";

import React, { useRef, useState } from 'react';
import { useRouter, redirect } from 'next/navigation';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

import { useAuth } from '@/contexts/AuthContext';
import { useUIStore } from '@/stores/uiStore';
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
import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';
import { MenuIcon } from '@/components/icons/MenuIcon';
import { ModernButton } from '@/components/ui';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  usePrefersReducedMotion,
  useSEO,
  scrollToAnchor,
  Reveal,
  useScrollPosition,
} from '@/components/homeViewUtils';
import { IndustryFunnelHero } from '@/components/IndustryFunnelHero';
import { RoiCalculator } from '@/components/home/RoiCalculator';
import { PricingSection } from '@/components/home/PricingSection';
import type { IndustryPackId } from '@/utils/industryPacks';

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

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
          ? 'border-b border-[var(--hero-accent)]/25 bg-[#050706]/92 backdrop-blur-xl'
          : 'border-b border-white/5 bg-[#050706]/75 backdrop-blur-md'
      }`}
      aria-label={t('home.nav.ariaLabel')}
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="font-display text-base font-bold tracking-tight text-white shrink-0 hover:opacity-90 transition-opacity"
        >
          {t('home.hero.brand', 'AI Content Pro')}
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
            className="!bg-[var(--hero-accent)] ![background-image:none] hover:brightness-110 text-white text-xs font-bold rounded-lg px-3.5 py-2 shrink-0 active:scale-95 transition-all"
          >
            {t(isLoggedIn ? 'home.journey.nav_app' : 'home.journey.nav_signup_boost', 'Odbierz darmowe kredyty')}
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
    label: 'LinkedIn',
    formatting: 'Profesjonalna struktura, sekcje i CTA biznesowe',
    content: (topic: string) =>
      `${topic}\n\nTworzenie wartościowych treści na LinkedIn nie musi zajmować 4 godzin dziennie.\n\nTrzy kroki do automatyzacji publikacji:\n\n1. Wygeneruj ekspercki post i grafikę w 30 sekund\n2. Dostosuj ton do głosu marki (Brand Voice)\n3. Zaplanuj publikację na cały tydzień\n\nJak u Was wygląda planowanie treści?`,
    hashtags: '#Marketing #SocialMedia #B2B #Automation #AI',
  },
  instagram: {
    label: 'Instagram',
    formatting: 'Krótki caption, punkty i zestaw hashtagów',
    content: (topic: string) =>
      `${topic}\n\nJak oszczędzić 10+ godzin tygodniowo na tworzeniu postów:\n\n• Wpis i karuzela gotowa w 30s\n• Hashtagi dobrane pod zasięg\n• Estetyka dopasowana do marki\n\nZapisz ten post i wypróbuj darmowe kredyty.`,
    hashtags: '#InstagramGrowth #ContentCreator #AIStyle #InstaTips',
  },
  tiktok: {
    label: 'TikTok',
    formatting: 'Hak w pierwszych 3 sekundach + scenariusz',
    content: (topic: string) =>
      `[HOOK 0–3s]: „Stwórzmy post na cały tydzień w 30 sekund!”\n\nOpis: ${topic}\n\nAI generuje gotowe skrypty i podpisy — bez całych dni przed ekranem.`,
    hashtags: '#TikTokTips #ViralHack #AICreator #GrowthHack',
  },
};

const HERO_DEMO_TOPICS = [
  '3 sposoby na automatyzację publikacji w Social Media w 2026',
  'Jak budować zaangażowaną społeczność wokół marki bez budżetu',
];

const HeroLiveDemoWidget: React.FC<{ onGenerate: (topic: string) => void }> = ({ onGenerate }) => {
  const { t } = useTranslation();
  const [activePlatform, setActivePlatform] = useState<'linkedin' | 'instagram' | 'tiktok'>('linkedin');
  const [sampleIdx, setSampleIdx] = useState(0);
  const [demoTopic, setDemoTopic] = useState('');

  const currentTopic = HERO_DEMO_TOPICS[sampleIdx];
  const platformData = PLATFORM_PREVIEWS[activePlatform];

  return (
    <div className="relative w-full max-w-xl mx-auto lg:mx-0 text-left">
      <div
        className="absolute -inset-px rounded-2xl opacity-70 pointer-events-none"
        style={{
          background:
            'linear-gradient(145deg, rgba(26,174,138,0.45), transparent 42%, rgba(196,150,58,0.2))',
        }}
        aria-hidden="true"
      />
      <div className="relative rounded-2xl bg-[#0a1210]/95 border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-white/8">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-sm bg-[var(--hero-accent)] shrink-0" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300 truncate">
              {t('home.demo.title', 'Podgląd na żywo')}
            </span>
          </div>
          <div className="flex items-center gap-0.5" role="tablist" aria-label="Platforma">
            {(['linkedin', 'instagram', 'tiktok'] as const).map((platform) => (
              <button
                key={platform}
                type="button"
                role="tab"
                aria-selected={activePlatform === platform}
                aria-label={`Pokaż podgląd dla ${platform}`}
                onClick={() => setActivePlatform(platform)}
                className={`px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors ${
                  activePlatform === platform
                    ? 'text-white border-b-2 border-[var(--hero-accent)]'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {PLATFORM_PREVIEWS[platform].label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 sm:px-5 py-4 space-y-4">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-[var(--hero-accent)]">{platformData.label}</span>
            <button
              type="button"
              onClick={() => setSampleIdx((prev) => (prev + 1) % HERO_DEMO_TOPICS.length)}
              className="text-slate-400 hover:text-white transition-colors font-medium"
            >
              {t('home.demo.change_topic', 'Zmień przykład')}
            </button>
          </div>

          <div className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">
            <p>{platformData.content(currentTopic)}</p>
            <p className="mt-3 pt-3 border-t border-white/8 text-[var(--hero-accent)]/90 text-xs font-medium">
              {platformData.hashtags}
            </p>
          </div>

          <p className="text-[11px] text-slate-500">{platformData.formatting}</p>

          <div className="pt-1 space-y-2">
            <label className="sr-only" htmlFor="hero-demo-topic">
              Temat posta
            </label>
            <input
              id="hero-demo-topic"
              type="text"
              value={demoTopic}
              onChange={(e) => setDemoTopic(e.target.value)}
              placeholder="Temat, np. Nowa oferta w salonie beauty"
              className="bg-white/[0.04] border border-white/10 rounded-lg px-3.5 py-2.5 w-full text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[var(--hero-accent)]/50 focus:ring-1 focus:ring-[var(--hero-accent)]/25 transition-colors"
            />
            <button
              type="button"
              onClick={() => onGenerate(demoTopic.trim() || currentTopic)}
              className="w-full sm:w-auto bg-[var(--hero-accent)] hover:brightness-110 text-white font-semibold px-5 py-2.5 rounded-lg transition-[filter,transform] active:scale-[0.98]"
            >
              Wygeneruj przykładowy post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const HeroSection: React.FC<{
  reducedMotion: boolean;
  isLoggedIn: boolean;
  onStart: () => void;
  onGenerateDemo: (topic: string) => void;
}> = ({ reducedMotion, isLoggedIn, onStart, onGenerateDemo }) => {
  const { t } = useTranslation();
  const heroRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          reduceMotion: '(prefers-reduced-motion: reduce)',
          canAnimate: '(prefers-reduced-motion: no-preference)',
        },
        (context) => {
          const prefersReduce = Boolean(context.conditions?.reduceMotion) || reducedMotion;
          const rest = ['.hero-brand', '.hero-sub', '.hero-cta', '.hero-demo'];

          if (prefersReduce) {
            gsap.set(['.hero-headline', ...rest], { autoAlpha: 1, y: 0 });
            return;
          }

          const headline = heroRef.current?.querySelector('.hero-headline');
          if (!headline) return;

          const split = SplitText.create(headline, {
            type: 'words,chars',
            aria: 'auto',
            charsClass: 'hero-char',
            wordsClass: 'hero-word',
          });

          gsap.set('.hero-headline', { autoAlpha: 1 });
          gsap.set(split.chars, { autoAlpha: 0, y: 28 });
          gsap.set(rest, { autoAlpha: 0, y: 24 });

          const tl = gsap.timeline({
            defaults: { ease: 'power2.out' },
          });

          tl.to('.hero-brand', { autoAlpha: 1, y: 0, duration: 0.55 })
            .to(
              split.chars,
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.45,
                stagger: 0.018,
              },
              '-=0.2'
            )
            .to('.hero-sub', { autoAlpha: 1, y: 0, duration: 0.6 }, '-=0.25')
            .to('.hero-cta', { autoAlpha: 1, y: 0, duration: 0.6 }, '-=0.4')
            .to('.hero-demo', { autoAlpha: 1, y: 0, duration: 0.75 }, '-=0.4');
        }
      );

      return () => mm.revert();
    },
    { dependencies: [reducedMotion], scope: heroRef }
  );

  return (
    <section
      ref={heroRef}
      className="relative min-h-[100svh] w-full home-hero-wash text-white overflow-hidden flex flex-col"
    >
      <div className="absolute inset-0 home-noise pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-0 home-grid-bg opacity-30 pointer-events-none" aria-hidden="true" />

      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#050706] via-[#0a1210]/85 to-transparent" />
        <div
          className={`absolute left-1/2 -translate-x-1/2 bottom-[14%] w-[min(120vw,920px)] h-px landing-stream ${reducedMotion ? 'opacity-40' : 'animate-home-stream'}`}
        />
      </div>

      <div className="relative z-10 flex-1 flex items-center max-w-7xl mx-auto px-4 pt-20 pb-14 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">
          <div className="text-center lg:text-left">
            <p
              className={`hero-brand font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white ${reducedMotion ? '' : 'opacity-0'}`}
            >
              {t('home.hero.brand', 'AI Content Pro')}
            </p>
            <h1
              className={`hero-headline mt-4 text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-snug text-slate-100 max-w-xl mx-auto lg:mx-0 ${reducedMotion ? '' : 'opacity-0'}`}
            >
              Generuj posty na social media w 30 sekund
            </h1>
            <p
              className={`hero-sub mt-4 text-base sm:text-lg text-slate-400 max-w-md mx-auto lg:mx-0 leading-relaxed ${reducedMotion ? '' : 'opacity-0'}`}
            >
              AI napisze, zaprojektuje grafikę i zaplanuje publikację — dopasowane do Twojej branży.
            </p>
            <div
              className={`hero-cta mt-8 flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-4 ${reducedMotion ? '' : 'opacity-0'}`}
            >
              <ModernButton
                variant="primary"
                size="lg"
                onClick={onStart}
                className="rounded-lg px-8 py-3.5 !bg-[var(--hero-accent)] ![background-image:none] hover:brightness-110 text-white font-semibold flex items-center gap-2"
              >
                {t(isLoggedIn ? 'home.journey.hero_cta_logged_in' : 'home.journey.hero_cta', 'Wypróbuj za darmo')}
                <ArrowRight className="w-5 h-5" />
              </ModernButton>
              <button
                type="button"
                onClick={() => scrollToAnchor('demo', reducedMotion)}
                className="text-sm font-medium text-slate-400 hover:text-white transition-colors underline-offset-4 hover:underline"
              >
                Zobacz podgląd
              </button>
            </div>
          </div>

          <div id="demo" className={`hero-demo scroll-mt-24 ${reducedMotion ? '' : 'opacity-0'}`}>
            <HeroLiveDemoWidget onGenerate={onGenerateDemo} />
          </div>
        </div>
      </div>
    </section>
  );
};

const HowItWorksSection: React.FC = () => {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);

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

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          reduceMotion: '(prefers-reduced-motion: reduce)',
          canAnimate: '(prefers-reduced-motion: no-preference)',
        },
        (context) => {
          if (context.conditions?.reduceMotion) {
            gsap.set('.how-step', { autoAlpha: 1, y: 0 });
            return;
          }

          gsap.from('.how-step', {
            autoAlpha: 0,
            y: 36,
            duration: 0.65,
            ease: 'power2.out',
            stagger: 0.12,
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 75%',
              toggleActions: 'play none none none',
            },
          });
        }
      );

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      id="jak-to-dziala"
      className="landing-deferred scroll-mt-24 py-20 md:py-28 bg-[#050706] text-white"
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="max-w-2xl mb-14 text-center md:text-left mx-auto md:mx-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--hero-accent)]">
            {t('home.journey.how_kicker', 'Jak to działa')}
          </p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Od pomysłu do posta w 4 krokach
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="how-step relative">
                <div className="flex items-center gap-3 mb-4">
                  <Icon className="w-5 h-5 text-[var(--hero-accent)]" aria-hidden="true" />
                  <span className="font-display text-3xl font-extrabold text-white/10 leading-none select-none">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
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
      title: 'Dopasowane do branży',
      desc: 'AI wie, że restauracja potrzebuje „menu dnia”, a SaaS „case study”. Nie generyczne bełkoty.',
    },
    {
      icon: Rocket,
      title: 'Multi-platform',
      desc: 'Jeden post, warianty na LinkedIn, Instagram, TikTok, Facebook i X.',
    },
    {
      icon: Bot,
      title: 'Automatyzacja',
      desc: 'RSS → post, produkt → post, planowanie kolejki, auto-publikacja.',
    },
    {
      icon: ShieldCheck,
      title: 'Jakość bez śmieci',
      desc: 'Anti-slop system, scoring treści, brand voice memory.',
    },
  ];

  return (
    <section
      id="dlaczego-my"
      className="landing-deferred scroll-mt-24 relative home-hero-wash text-white py-20 md:py-28 overflow-hidden"
    >
      <div className="absolute inset-0 home-noise pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 max-w-6xl mx-auto px-4">
        <div className="max-w-2xl mb-14 text-center md:text-left mx-auto md:mx-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--hero-accent)]">
            {t('home.journey.why_kicker', 'Dlaczego AI Content Pro?')}
          </p>
          <h2 className="mt-3 font-display text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
            Social media, które przynoszą klientów
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title}>
                <Icon className="w-5 h-5 text-[var(--hero-accent)] mb-4" aria-hidden="true" />
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
  return (
    <section className="py-20 border-y border-slate-200/80 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 space-y-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="proof-card p-6 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 shadow-sm space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-display">
              AI
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              Generowanie postów pod ton marki
            </p>
          </div>
          <div className="proof-card p-6 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 shadow-sm space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-display">
              Kalendarz
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              Planuj publikacje z wyprzedzeniem
            </p>
          </div>
          <div className="proof-card p-6 rounded-2xl bg-white/40 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 shadow-sm space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-sky-400 font-display">5</div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              Platformy: FB, IG, LinkedIn, TikTok, X
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto text-center p-8 rounded-3xl bg-slate-900/60 border border-white/10 shadow-xl space-y-4">
          <p className="font-display text-lg sm:text-xl font-bold text-white leading-relaxed tracking-tight">
            Generuj, dopasuj do platformy i zaplanuj publikację — w jednym studio.
          </p>
          <p className="text-sm text-slate-400">
            Free bez karty. Lifetime Deal na{' '}
            <a href="/deal" className="text-[var(--hero-accent)] underline underline-offset-2">
              /deal
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
};

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Czy treści wygenerowane przez AI są unikalne i bezpieczne?',
      a: 'Tak! Każda treść jest generowana od nowa i dopasowywana do specyfiki Twojej branży. Zapewniamy 100% autorskie formuły bez ryzyka plagiatu.',
    },
    {
      q: 'Czy muszę podawać kartę kredytową przy rejestracji?',
      a: 'Nie! Rejestracja jest całkowicie darmowa i nie wymaga podawania danych karty. Otrzymasz darmowe kredyty na start do przetestowania pełnych możliwości aplikacji.',
    },
    {
      q: 'Jak AI dopasowuje się do unikalnego głosu mojej marki (Brand Voice)?',
      a: 'Możesz zdefiniować ton wypowiedzi, słowa kluczowe oraz styl marki w ustawieniach. Silnik AI zapamiętuje te preferencje dla każdego kolejnego posta.',
    },
    {
      q: 'Czy mogę automatycznie planować publikację w Social Media?',
      a: 'Tak — masz wbudowany kalendarz i możesz zaplanować publikację. Połączenie kont (Facebook, Instagram, LinkedIn, TikTok, X) i publikacja bezpośrednia działają po skonfigurowaniu OAuth dla danej platformy w ustawieniach konta.',
    },
    {
      q: 'Czy potrzebuję karty kredytowej, żeby wypróbować plan Pro?',
      a: 'Plan Free działa bez karty. Trial Pro (7 dni) wymaga karty w Stripe — po okresie próbnym subskrypcja się odnawia, możesz anulować w dowolnym momencie. Lifetime Deal kupisz jednorazowo na /deal.',
    },
    {
      q: 'Czy mogę anulować subskrypcję w dowolnym momencie?',
      a: 'Tak. Subskrypcję anulujesz jednym kliknięciem w ustawieniach konta — bez okresu wypowiedzenia i dodatkowych opłat.',
    },
  ];

  return (
    <section className="landing-deferred py-20 md:py-28 bg-[var(--hero-surface)] border-t border-white/5">
      <div className="max-w-4xl mx-auto px-4">
        <div className="max-w-2xl mb-12 text-center md:text-left mx-auto md:mx-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--hero-accent)]">
            FAQ
          </p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Wszystko, co musisz wiedzieć przed rozpoczęciem
          </h2>
        </div>

        <div className="space-y-0 divide-y divide-slate-200/80 dark:divide-white/10 border-y border-slate-200/80 dark:border-white/10">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  aria-controls={`landing-faq-panel-${idx}`}
                  className="w-full py-5 text-left flex items-center justify-between gap-4 font-semibold text-slate-900 dark:text-white hover:text-[var(--hero-accent)] transition-colors"
                >
                  <span className="text-base md:text-lg">{faq.q}</span>
                  <ChevronDownIcon
                    className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[var(--hero-accent)]' : 'text-slate-500'}`}
                    aria-hidden="true"
                  />
                </button>
                <div
                  id={`landing-faq-panel-${idx}`}
                  hidden={!isOpen}
                  className="pb-5 text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed"
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
    <section className="landing-deferred relative w-full home-hero-wash overflow-hidden">
      <div className="absolute inset-0 home-noise pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-24 md:py-32 text-center space-y-6">
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

        <p className="pt-2 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          {t('home.journey.final_trust_access')}
          {' · '}
          {t('home.journey.final_trust_security')}
          {' · '}
          {t('home.journey.final_trust_no_card')}
        </p>

        <p className="text-xs text-slate-500">{t('home.journey.final_note')}</p>
      </div>
    </section>
  );
};

export const HomeView: React.FC<HomeViewProps> = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { setAuthModal, setIsPricingModalOpen } = useUIStore();
  const reducedMotion = usePrefersReducedMotion();
  const { t } = useTranslation();

  useSEO({
    title: `${t('home.hero.brand')} — Generuj posty na social media w 30 sekund`,
    description: 'AI napisze, zaprojektuje grafikę i zaplanuje publikację — dopasowane do Twojej branży.',
  });

  if (user) {
    router.push('/dashboard');
    return null;
  }

  const isLoggedIn = false;

  const openSignupOrApp = () => {
    if (user) router.push('/dashboard');
    else setAuthModal('signup');
  };

  const handleFunnelContinue = (_selectedIds: IndustryPackId[]) => {
    openSignupOrApp();
  };

  const openPricing = () => {
    setIsPricingModalOpen(true);
  };

  const handleDemoGenerate = (topic: string) => {
    if (user) {
      router.push(`/generator?topic=${encodeURIComponent(topic)}`);
      return;
    }
    try {
      localStorage.setItem('aicp_prefill_topic', topic);
    } catch {
      // ignore storage errors (e.g. private mode)
    }
    setAuthModal('signup');
  };

  return (
    <div className="relative pb-0">
      <ScrollProgressBar />
      <LandingNav onSignup={openSignupOrApp} onLogin={() => setAuthModal('login')} onPricing={openPricing} isLoggedIn={isLoggedIn} />

      <HeroSection
        reducedMotion={reducedMotion}
        isLoggedIn={isLoggedIn}
        onStart={openSignupOrApp}
        onGenerateDemo={handleDemoGenerate}
      />

      <Reveal reducedMotion={reducedMotion}>
        <HowItWorksSection />
      </Reveal>

      <Reveal reducedMotion={reducedMotion}>
        <WhyAICPSection />
      </Reveal>

      <Reveal reducedMotion={reducedMotion}>
        <div className="landing-deferred-lg bg-[var(--hero-surface)]">
          <IndustryFunnelHero
            reducedMotion={reducedMotion}
            isLoggedIn={isLoggedIn}
            userId={undefined}
            onContinue={handleFunnelContinue}
          />
        </div>
      </Reveal>

      <Reveal reducedMotion={reducedMotion}>
        <div className="landing-deferred">
          <RoiCalculator onStart={openSignupOrApp} />
        </div>
      </Reveal>

      <Reveal reducedMotion={reducedMotion}>
        <div className="landing-deferred-lg">
          <PricingSection
            onStartFree={openSignupOrApp}
            onStartPro={openSignupOrApp}
            onContactSales={openPricing}
          />
        </div>
      </Reveal>

      <Reveal reducedMotion={reducedMotion}>
        <FAQSection />
      </Reveal>

      <Reveal reducedMotion={reducedMotion}>
        <FinalCTASection onNavigateToApp={openSignupOrApp} isLoggedIn={isLoggedIn} />
      </Reveal>
    </div>
  );
};


export default HomeView;