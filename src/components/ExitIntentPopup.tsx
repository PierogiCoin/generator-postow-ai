/**
 * ExitIntentPopup — last-chance offer przy opuszczeniu landingu.
 * Messaging zgodny z Free (bez karty) — bez fałszywego „Pro trial bez karty”.
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useAuth } from '../contexts/AuthContext';
import { useUIStore } from '../stores/uiStore';
import { analytics, AnalyticsEvents } from '../services/analytics';
import { X, Zap, CheckCircle2 } from 'lucide-react';
import { getPlanByUserPlan } from '@/config/subscriptionPlans';
import { UserPlan } from '../types';

gsap.registerPlugin(useGSAP);

const SESSION_KEY = 'exitIntentShown';
const DISMISS_KEY = 'exitIntentDismissed';

export const ExitIntentPopup: React.FC = () => {
  const { user } = useAuth();
  const { setAuthModal } = useUIStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const freeCredits = getPlanByUserPlan(UserPlan.Free).credits;

  useEffect(() => {
    if (user) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    let timeoutId: number;

    const handleMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget) {
        sessionStorage.setItem(SESSION_KEY, '1');
        setIsOpen(true);
        analytics.track(AnalyticsEvents.UPGRADE_PROMPT_SHOWN, { source: 'exit_intent' });
        document.removeEventListener('mouseout', handleMouseOut);
        clearTimeout(timeoutId);
      }
    };

    timeoutId = window.setTimeout(() => {
      document.addEventListener('mouseout', handleMouseOut);
    }, 3000);

    return () => {
      document.removeEventListener('mouseout', handleMouseOut);
      clearTimeout(timeoutId);
    };
  }, [user]);

  const { contextSafe } = useGSAP(
    () => {
      if (!isOpen || isClosing) return;

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const overlay = overlayRef.current;
      const panel = panelRef.current;
      if (!overlay || !panel) return;

      if (reduceMotion) {
        gsap.set([overlay, panel], { autoAlpha: 1, scale: 1, y: 0 });
        return;
      }

      gsap.set(overlay, { autoAlpha: 0 });
      gsap.set(panel, { autoAlpha: 0, scale: 0.92, y: 20 });

      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
      tl.to(overlay, { autoAlpha: 1, duration: 0.28 }).to(
        panel,
        { autoAlpha: 1, scale: 1, y: 0, duration: 0.4 },
        '-=0.12'
      );
    },
    { dependencies: [isOpen, isClosing], scope: rootRef }
  );

  const finishClose = useCallback(() => {
    setIsOpen(false);
    setIsClosing(false);
    localStorage.setItem(DISMISS_KEY, '1');
  }, []);

  const handleClose = contextSafe(() => {
    if (isClosing || !isOpen) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const overlay = overlayRef.current;
    const panel = panelRef.current;

    if (reduceMotion || !overlay || !panel) {
      finishClose();
      return;
    }

    setIsClosing(true);
    const tl = gsap.timeline({
      defaults: { ease: 'power2.in' },
      onComplete: finishClose,
    });
    tl.to(panel, { autoAlpha: 0, scale: 0.96, y: 12, duration: 0.22 }).to(
      overlay,
      { autoAlpha: 0, duration: 0.2 },
      '-=0.08'
    );
  });

  const handleClaim = contextSafe(() => {
    if (isClosing || !isOpen) return;
    analytics.track(AnalyticsEvents.UPGRADE_PROMPT_CLICKED, { source: 'exit_intent' });

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const overlay = overlayRef.current;
    const panel = panelRef.current;

    const openSignup = () => {
      setIsOpen(false);
      setIsClosing(false);
      setAuthModal('signup');
    };

    if (reduceMotion || !overlay || !panel) {
      openSignup();
      return;
    }

    setIsClosing(true);
    const tl = gsap.timeline({
      defaults: { ease: 'power2.in' },
      onComplete: openSignup,
    });
    tl.to(panel, { autoAlpha: 0, scale: 0.96, y: 12, duration: 0.22 }).to(
      overlay,
      { autoAlpha: 0, duration: 0.2 },
      '-=0.08'
    );
  });

  if (!isOpen) return null;

  return (
    <div ref={rootRef}>
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[200] opacity-0"
        onClick={handleClose}
      >
        <div
          ref={panelRef}
          className="relative bg-white dark:bg-[#0a1220] border border-slate-200 dark:border-white/10 rounded-lg p-8 md:p-10 w-full max-w-lg m-4 overflow-hidden opacity-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative text-center">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--hero-accent)' }}
            >
              Oferta
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Zaczekaj — darmowy start
            </h2>

            <p className="mt-4 text-slate-600 dark:text-slate-300 text-base leading-relaxed">
              Załóż konto Free i otrzymaj{' '}
              <strong className="text-slate-900 dark:text-white">
                {freeCredits.toLocaleString('pl-PL')} kredytów
              </strong>{' '}
              — bez karty płatniczej.
            </p>

            <div className="mt-6 space-y-2.5 text-left max-w-sm mx-auto">
              {[
                'Generowanie postów AI na start',
                'Podstawowe platformy social media',
                'Kalendarz i planowanie',
                'Bez karty — bez zobowiązań',
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: 'var(--hero-accent)' }} />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{benefit}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleClaim}
              className="mt-8 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-white font-semibold text-base rounded-lg hover:brightness-110 transition-all"
              style={{ backgroundColor: 'var(--hero-accent)' }}
            >
              <Zap className="w-5 h-5" />
              Załóż darmowe konto
            </button>

            <p className="mt-4 text-xs text-slate-400">
              Bez karty · Upgrade Pro (7 dni z kartą) dostępny w aplikacji
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExitIntentPopup;
