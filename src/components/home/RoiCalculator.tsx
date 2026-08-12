'use client';

import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface RoiCalculatorProps {
  onStart: () => void;
}

export const RoiCalculator: React.FC<RoiCalculatorProps> = ({ onStart }) => {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const hoursValueRef = useRef<HTMLSpanElement>(null);
  const moneyValueRef = useRef<HTMLSpanElement>(null);
  const [postsPerWeek, setPostsPerWeek] = useState<number>(5);

  const hoursPerPostManually = 1.5;
  const hoursWithAI = 0.1;
  const monthlyPosts = postsPerWeek * 4.3;

  const manualHoursMonthly = Math.round(monthlyPosts * hoursPerPostManually);
  const aiHoursMonthly = Math.round(monthlyPosts * hoursWithAI);
  const hoursSavedMonthly = Math.max(1, manualHoursMonthly - aiHoursMonthly);

  const agencyCostPerPost = 150;
  const moneySavedMonthly = Math.round(monthlyPosts * agencyCostPerPost);

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
            gsap.set('.roi-reveal', { autoAlpha: 1, y: 0 });
            return;
          }

          gsap.from('.roi-reveal', {
            autoAlpha: 0,
            y: 32,
            duration: 0.7,
            ease: 'power2.out',
            stagger: 0.12,
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 72%',
              toggleActions: 'play none none none',
            },
          });
        }
      );

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  useGSAP(
    () => {
      const hoursEl = hoursValueRef.current;
      const moneyEl = moneyValueRef.current;
      if (!hoursEl || !moneyEl) return;

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) {
        hoursEl.textContent = String(hoursSavedMonthly);
        moneyEl.textContent = moneySavedMonthly.toLocaleString('pl-PL');
        return;
      }

      const hoursState = { value: Number(hoursEl.dataset.value || 0) };
      const moneyState = { value: Number(moneyEl.dataset.value || 0) };

      gsap.to(hoursState, {
        value: hoursSavedMonthly,
        duration: 0.55,
        ease: 'power2.out',
        onUpdate: () => {
          const next = Math.round(hoursState.value);
          hoursEl.textContent = String(next);
          hoursEl.dataset.value = String(next);
        },
      });

      gsap.to(moneyState, {
        value: moneySavedMonthly,
        duration: 0.55,
        ease: 'power2.out',
        onUpdate: () => {
          const next = Math.round(moneyState.value);
          moneyEl.textContent = next.toLocaleString('pl-PL');
          moneyEl.dataset.value = String(next);
        },
      });
    },
    { dependencies: [hoursSavedMonthly, moneySavedMonthly], scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      className="py-20 md:py-28 relative overflow-hidden bg-gradient-to-b from-[#05070a] via-[#0b131d] to-[#05070a] border-y border-white/10 text-white"
    >
      <div className="absolute inset-0 home-noise pointer-events-none opacity-30" />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center space-y-10">
        <div className="roi-reveal space-y-3 max-w-2xl mx-auto">
          <span className="px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-extrabold uppercase tracking-widest">
            {t('home.roi.kicker', '🧮 Kalkulator Oszczędności ROI')}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            {t('home.roi.title_prefix', 'Zobacz ile ')}
            <span className="bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
              {t('home.roi.title_highlight', 'czasu i pieniędzy')}
            </span>
            {t('home.roi.title_suffix', ' zaoszczędzisz co miesiąc')}
          </h2>
          <p className="text-slate-400 text-base md:text-lg">
            {t('home.roi.subtitle', 'Przesuń suwak i sprawdź, jak automatyzacja AI rewolucjonizuje Twój budżet i czas.')}
          </p>
        </div>

        <div className="roi-reveal p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/15 backdrop-blur-2xl shadow-2xl space-y-8 max-w-3xl mx-auto">
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm font-bold">
              <span className="text-slate-300">
                {t('home.roi.slider_label', 'Ile postów tygodniowo publikujesz?')}
              </span>
              <span className="text-2xl font-extrabold text-emerald-400 font-display px-4 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                {postsPerWeek} {t('home.roi.posts_unit', 'postów / tydz.')}
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="20"
              value={postsPerWeek}
              onChange={(e) => setPostsPerWeek(Number(e.target.value))}
              className="w-full h-3 rounded-lg bg-slate-800 appearance-none cursor-pointer accent-[var(--hero-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--hero-accent)]/50"
            />

            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>1 post</span>
              <span>10 postów</span>
              <span>20 postów</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900/60 border border-emerald-500/20 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span>⏱️</span> {t('home.roi.hours_label', 'Zaoszczędzony czas')}
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-display">
                ~<span ref={hoursValueRef} data-value="0">
                  0
                </span>
                h <span className="text-xs font-medium text-slate-400">/ miesiąc</span>
              </div>
              <p className="text-xs text-slate-400">
                {t('home.roi.hours_desc', 'To tak, jakbyś zyskał dodatkowe {{days}} dni wolnego każdego miesiąca!', {
                  days: Math.round((hoursSavedMonthly / 8) * 10) / 10,
                })}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-950/40 to-slate-900/60 border border-sky-500/20 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <span>💰</span> {t('home.roi.money_label', 'Wartość oszczędności')}
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-display">
                ~<span ref={moneyValueRef} data-value="0">
                  0
                </span>{' '}
                zł <span className="text-xs font-medium text-slate-400">/ miesiąc</span>
              </div>
              <p className="text-xs text-slate-400">
                {t('home.roi.money_desc', 'Tyle zapłaciłbyś agencji lub copywriterowi za wygenerowanie tej ilości wpisów.')}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 space-y-3">
            <h3 className="text-2xl font-bold text-white">
              Zacznij za darmo i zobacz efekt w 30 sekund
            </h3>
            <p className="text-slate-400">
              Bez karty kredytowej. 10 darmowych kredytów na start.
            </p>
            <button
              type="button"
              onClick={onStart}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-8 py-3 rounded-full transition-colors active:scale-95"
            >
              Wygeneruj pierwszy post →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
