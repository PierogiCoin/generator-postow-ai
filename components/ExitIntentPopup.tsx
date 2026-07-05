/**
 * ExitIntentPopup — wykrywa intencję opuszczenia strony (mouseout na górnej krawędzi)
 * i pokazuje last-chance offer: 7-dniowy free trial Pro bez karty.
 *
 * Tactic: przechwytuje użytkowników którzy opuszczają landing page bez rejestracji.
 * sessionStorage zapobiega wielokrotnemu pokazywaniu w tej samej sesji.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUIStore } from '../stores/uiStore';
import { analytics, AnalyticsEvents } from '../services/analytics';
import { X, Gift, Zap, CheckCircle2 } from 'lucide-react';

const SESSION_KEY = 'exitIntentShown';
const DISMISS_KEY = 'exitIntentDismissed';

export const ExitIntentPopup: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setAuthModal } = useUIStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Nie pokazuj zalogowanym użytkownikom
    if (user) return;

    // Nie pokazuj jeśli już odrzucone w tej sesji
    if (sessionStorage.getItem(SESSION_KEY)) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    let timeoutId: number;

    const handleMouseOut = (e: MouseEvent) => {
      // Sprawdź czy kursor opuszcza okno przez górną krawędź
      if (e.clientY <= 0 && !e.relatedTarget) {
        sessionStorage.setItem(SESSION_KEY, '1');
        setIsOpen(true);
        analytics.track(AnalyticsEvents.UPGRADE_PROMPT_SHOWN, { source: 'exit_intent' });
        document.removeEventListener('mouseout', handleMouseOut);
        clearTimeout(timeoutId);
      }
    };

    // Opóźnienie 3s przed aktywacją — nie irytuj natychmiast
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
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[200] animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 md:p-10 w-full max-w-lg m-4 animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dekoracyjne blob */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-fuchsia-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Zamknij"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-fuchsia-500 to-indigo-500 rounded-2xl shadow-lg mb-6">
            <Gift className="w-8 h-8 text-white" />
          </div>

          {/* Headline */}
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Zaczekaj! Oto Twój <span className="bg-gradient-to-r from-fuchsia-500 to-indigo-500 bg-clip-text text-transparent">darmowy dostęp</span>
          </h2>

          <p className="mt-4 text-slate-600 dark:text-slate-300 text-base leading-relaxed">
            Wypróbuj Generator Postów AI przez <strong className="text-slate-900 dark:text-white">7 dni za darmo</strong> — bez podawania karty płatniczej.
          </p>

          {/* Benefits */}
          <div className="mt-6 space-y-2 text-left max-w-sm mx-auto">
            {[
              'Nieograniczone generowanie postów AI',
              'Wszystkie platformy social media',
              'Planer kampanii i analityka AI',
              'Bez karty — bez zobowiązań',
            ].map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <span className="text-sm text-slate-700 dark:text-slate-300">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={handleClaim}
            className="mt-8 w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white font-bold text-base rounded-2xl shadow-lg shadow-fuchsia-500/20 hover:opacity-90 transition-opacity"
          >
            <Zap className="w-5 h-5" />
            Aktywuj darmowy trial
          </button>

          <p className="mt-4 text-xs text-slate-400">
            Bez karty • Bez zobowiązań • Anuluj kiedy chcesz
          </p>
        </div>
      </div>
    </div>
  );
};
