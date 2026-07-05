/**
 * Email Service (frontend) — komunikacja z backend email API.
 * Wywoływany po rejestracji, przy wyczerpaniu kredytów, itd.
 */

import { callApi, getApiBaseUrl, getApiAuthHeaders } from './apiClient';

export interface EmailPreferences {
  configured: boolean;
  unsubscribed: string[];
  globallyUnsubscribed: boolean;
}

async function emailGet<T>(path: string): Promise<T> {
  const authHeaders = await getApiAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'GET',
    headers: authHeaders,
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Email API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export const emailService = {
  /** Wywołaj po rejestracji — wysyła welcome email + planuje sekwencję onboarding */
  async triggerWelcome(): Promise<void> {
    try {
      await callApi('email/welcome', {});
    } catch {
      // Ciche błędy — email nie blokuje UX
    }
  },

  /** Wywołaj gdy użytkownik ma < 20% kredytów */
  async triggerLowCredits(remaining: number, planName: string): Promise<void> {
    try {
      await callApi('email/low-credits', { remaining, planName });
    } catch {
      // silent
    }
  },

  /** Wywołaj gdy kredyty = 0 */
  async triggerCreditsExhausted(): Promise<void> {
    try {
      await callApi('email/credits-exhausted', {});
    } catch {
      // silent
    }
  },

  /** Wywołaj gdy trial Pro się rozpoczyna */
  async triggerTrialStarted(trialDays: number): Promise<void> {
    try {
      await callApi('email/trial-started', { trialDays });
    } catch {
      // silent
    }
  },

  /** Pobierz preferencje email użytkownika */
  async getPreferences(): Promise<EmailPreferences | null> {
    try {
      return await emailGet<EmailPreferences>('/api/email/preferences');
    } catch {
      return null;
    }
  },

  /** Unsubscribe od konkretnych typów email lub globalnie */
  async unsubscribe(types?: string[]): Promise<void> {
    try {
      await callApi('email/unsubscribe', { types });
    } catch {
      // silent
    }
  },
};
