/**
 * CookieConsent — baner zgody cookies zgodny z GDPR/RODO.
 * Po zaakceptowaniu zapisuje zgodę w localStorage i emituje event
 * dla analytics (PostHog) aby aktywował tracking.
 */

import React, { useState, useEffect } from 'react';
import { Cookie, X, Check } from 'lucide-react';

const CONSENT_KEY = 'cookie-consent-v1';

type ConsentChoice = 'accepted' | 'rejected' | null;

export function getCookieConsent(): ConsentChoice {
  if (typeof window === 'undefined') return null;
  return (localStorage.getItem(CONSENT_KEY) as ConsentChoice) || null;
}

export function isCookieConsentAccepted(): boolean {
  return getCookieConsent() === 'accepted';
}

export const CookieConsent: React.FC = () => {
  const [choice, setChoice] = useState<ConsentChoice>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = getCookieConsent();
    setChoice(stored);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setChoice('accepted');
    window.dispatchEvent(new CustomEvent('cookie-consent-change', { detail: 'accepted' }));
  };

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    setChoice('rejected');
    window.dispatchEvent(new CustomEvent('cookie-consent-change', { detail: 'rejected' }));
  };

  if (!mounted || choice !== null) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[150] p-4 animate-slide-up">
      <div className="mx-auto max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Cookie className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Ta strona używa plików cookies
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Używamy cookies do analizy ruchu (PostHog) i poprawy działania serwisu.
              Klikając "Akceptuj" wyrażasz zgodę na przetwarzanie danych zgodnie z{' '}
              <a href="/privacy" className="text-[var(--hero-accent)] underline">
                polityką prywatności
              </a>.
              Możesz odrzucić — strona będzie działać normalnie bez analytics.
            </p>
          </div>

          <div className="shrink-0 flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleReject}
              className="flex-1 sm:flex-none min-h-[40px] px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 rounded-lg border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors touch-manipulation"
            >
              Odrzuć
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 sm:flex-none min-h-[40px] inline-flex items-center justify-center gap-1 px-4 py-2 text-xs font-semibold text-white rounded-lg hover:brightness-110 transition touch-manipulation"
              style={{ backgroundColor: 'var(--hero-accent)' }}
            >
              <Check className="w-3.5 h-3.5" />
              Akceptuj
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
