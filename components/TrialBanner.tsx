/**
 * TrialBanner — banner promujący 7-dniowy darmowy okres Pro.
 * Widoczny tylko dla użytkowników Free plan.
 * Po kliknięciu przekierowuje do Stripe checkout z trialem.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { redirectToTrialCheckout } from '../services/paymentService';
import { emailService } from '../services/emailService';
import { UserPlan } from '../types';
import { Sparkles, X, Check, Loader2, Clock } from 'lucide-react';

const DISMISS_KEY = 'trial-banner-dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 dni

// Countdown deadline — 48h od pierwszego wyświetlenia bannera
const COUNTDOWN_KEY = 'trial-banner-deadline';
const COUNTDOWN_DURATION_MS = 48 * 60 * 60 * 1000; // 48h

function useCountdown(deadline: number | null) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!deadline) return;
    const update = () => {
      const diff = deadline - Date.now();
      setTimeLeft(diff > 0 ? diff : 0);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!timeLeft) return null;
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  return { hours, minutes, seconds };
}

export const TrialBanner: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);

  const isFreeUser = (user?.plan as UserPlan) === UserPlan.Free || !user?.plan;

  useEffect(() => {
    if (!isFreeUser) return;
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_DURATION_MS) {
        setDismissed(true);
        return;
      }
    }
    // Ustaw deadline countdown jeśli jeszcze nie istnieje
    let dl = localStorage.getItem(COUNTDOWN_KEY);
    if (!dl) {
      dl = (Date.now() + COUNTDOWN_DURATION_MS).toString();
      localStorage.setItem(COUNTDOWN_KEY, dl);
    }
    setDeadline(parseInt(dl, 10));
  }, [isFreeUser]);

  const countdown = useCountdown(deadline);

  if (!isFreeUser || dismissed || !user) return null;

  const handleStartTrial = async () => {
    setLoading(true);
    setError(null);
    try {
      // Wyślij email o rozpoczęciu triala (nie blokuje redirectu)
      emailService.triggerTrialStarted(7);
      await redirectToTrialCheckout(UserPlan.Pro, 7);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nie udało się uruchomić triala';
      if (msg.includes('Trial już był wykorzystany')) {
        setError('Wykorzystałeś już darmowy okres próbny.');
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 p-0.5 shadow-lg">
      <div className="relative rounded-[15px] bg-white dark:bg-slate-900 p-5 sm:p-6">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          aria-label="Zamknij"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pr-6">
          <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                7 dni Pro za darmo 🎁
              </h3>
              {countdown && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold animate-pulse">
                  <Clock className="w-3 h-3" />
                  {countdown.hours > 0 && `${countdown.hours}h `}{countdown.minutes.toString().padStart(2, '0')}m {countdown.seconds.toString().padStart(2, '0')}s
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {countdown
                ? <>Oferta wygasa za chwilę — nie przegap <strong>1.800 kredytów</strong> i pełnego dostępu!</>
                : <>Odblokuj 1.800 kredytów, analitykę AI, strategistę i wideo — bez zobowiązań.</>}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {['1.800 kredytów', 'Analityka AI', 'Strategista AI', '10 wideo AI', '5 brand voices'].map((feat) => (
                <span key={feat} className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  {feat}
                </span>
              ))}
            </div>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            <button
              onClick={handleStartTrial}
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Przekierowanie...
                </>
              ) : (
                'Aktywuj darmowy Pro →'
              )}
            </button>
            <p className="mt-1.5 text-[11px] text-slate-400 text-center sm:text-right">
              Wymaga karty • Anuluj kiedy chcesz
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
};
