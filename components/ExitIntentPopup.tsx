/**
 * ExitIntentPopup — last-chance offer przy opuszczeniu landingu.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUIStore } from '../stores/uiStore';
import { analytics, AnalyticsEvents } from '../services/analytics';
import { X, Zap, CheckCircle2 } from 'lucide-react';

const SESSION_KEY = 'exitIntentShown';
const DISMISS_KEY = 'exitIntentDismissed';

export const ExitIntentPopup: React.FC = () => {
  const { user } = useAuth();
  const { setAuthModal } = useUIStore();
  const [isOpen, setIsOpen] = useState(false);

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

  const handleClose = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(DISMISS_KEY, '1');
  }, []);

  const handleClaim = useCallback(() => {
    analytics.track(AnalyticsEvents.UPGRADE_PROMPT_CLICKED, { source: 'exit_intent' });
    setIsOpen(false);
    setAuthModal('signup');
  }, [setAuthModal]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[200] animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="relative bg-white dark:bg-[#0a1220] border border-slate-200 dark:border-white/10 rounded-lg p-8 md:p-10 w-full max-w-lg m-4 animate-scale-in overflow-hidden"
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
            Zaczekaj — darmowy dostęp
          </h2>

          <p className="mt-4 text-slate-600 dark:text-slate-300 text-base leading-relaxed">
            Wypróbuj Generator Postów AI przez{' '}
            <strong className="text-slate-900 dark:text-white">7 dni za darmo</strong> — bez karty płatniczej.
          </p>

          <div className="mt-6 space-y-2.5 text-left max-w-sm mx-auto">
            {[
              'Nieograniczone generowanie postów AI',
              'Wszystkie platformy social media',
              'Planer kampanii i analityka AI',
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
            Aktywuj darmowy trial
          </button>

          <p className="mt-4 text-xs text-slate-400">Bez karty · Bez zobowiązań · Anuluj kiedy chcesz</p>
        </div>
      </div>
    </div>
  );
};

export default ExitIntentPopup;
