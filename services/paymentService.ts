import { getSupabase } from './supabaseClient';
import { getApiBaseUrl } from './apiClient';
import { UserPlan } from '../types';
import { analytics, AnalyticsEvents } from './analytics';

export const PENDING_CHECKOUT_PLAN_KEY = 'pendingCheckoutPlan';
export const PENDING_CHECKOUT_INTERVAL_KEY = 'pendingCheckoutInterval';

export type CheckoutInterval = 'month' | 'year';

const PAID_PLANS: UserPlan[] = [
  UserPlan.Creator,
  UserPlan.Pro,
  UserPlan.Agency,
  UserPlan.Business,
  UserPlan.Enterprise,
];

export function isPaidPlan(plan: UserPlan): boolean {
  return PAID_PLANS.includes(plan);
}

export function setPendingCheckoutPlan(
  plan: UserPlan,
  interval: CheckoutInterval = 'month'
): void {
  sessionStorage.setItem(PENDING_CHECKOUT_PLAN_KEY, plan);
  sessionStorage.setItem(PENDING_CHECKOUT_INTERVAL_KEY, interval);
}

export function consumePendingCheckoutPlan(): UserPlan | null {
  const raw = sessionStorage.getItem(PENDING_CHECKOUT_PLAN_KEY);
  sessionStorage.removeItem(PENDING_CHECKOUT_PLAN_KEY);
  if (!raw) return null;
  if (!PAID_PLANS.includes(raw as UserPlan)) return null;
  return raw as UserPlan;
}

export function consumePendingCheckoutInterval(): CheckoutInterval {
  const raw = sessionStorage.getItem(PENDING_CHECKOUT_INTERVAL_KEY);
  sessionStorage.removeItem(PENDING_CHECKOUT_INTERVAL_KEY);
  return raw === 'year' ? 'year' : 'month';
}

async function getAccessToken(): Promise<string> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Musisz być zalogowany, aby przejść do płatności.');
  }
  return session.access_token;
}

export async function createSubscriptionCheckout(
  plan: UserPlan,
  interval: CheckoutInterval = 'month'
): Promise<string> {
  if (plan === UserPlan.Free) {
    throw new Error('Plan Free nie wymaga płatności.');
  }

  const token = await getAccessToken();

  const response = await fetch(`${getApiBaseUrl()}/api/payments/checkout/subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
    body: JSON.stringify({ plan, interval }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Błąd checkout (${response.status})`);
  }

  if (!data.url) {
    throw new Error('Stripe nie zwrócił adresu płatności.');
  }

  return data.url as string;
}

export async function redirectToSubscriptionCheckout(
  plan: UserPlan,
  interval: CheckoutInterval = 'month'
): Promise<void> {
  analytics.track(AnalyticsEvents.CHECKOUT_STARTED, { plan, type: 'subscription', interval });
  try {
    const url = await createSubscriptionCheckout(plan, interval);
    window.location.assign(url);
  } catch (err) {
    analytics.track(AnalyticsEvents.CHECKOUT_CANCELED, {
      plan,
      type: 'subscription',
      interval,
      reason: 'error',
    });
    throw err;
  }
}

export async function createCreditPackCheckout(packId: string): Promise<string> {
  const token = await getAccessToken();

  const response = await fetch(`${getApiBaseUrl()}/api/payments/checkout/credits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
    body: JSON.stringify({ pack: packId }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Błąd checkout (${response.status})`);
  }

  if (!data.url) {
    throw new Error('Stripe nie zwrócił adresu płatności.');
  }

  return data.url as string;
}

export async function redirectToCreditPackCheckout(packId: string): Promise<void> {
  analytics.track(AnalyticsEvents.CHECKOUT_STARTED, { packId, type: 'credit_pack' });
  try {
    const url = await createCreditPackCheckout(packId);
    window.location.assign(url);
  } catch (err) {
    analytics.track(AnalyticsEvents.CHECKOUT_CANCELED, { packId, type: 'credit_pack', reason: 'error' });
    throw err;
  }
}

export async function createTrialCheckout(plan: UserPlan, trialDays: number = 7): Promise<string> {
  const token = await getAccessToken();

  const response = await fetch(`${getApiBaseUrl()}/api/payments/checkout/trial`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
    body: JSON.stringify({ plan, trialDays }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Błąd trial checkout (${response.status})`);
  }

  if (!data.url) {
    throw new Error('Stripe nie zwrócił adresu płatności.');
  }

  return data.url as string;
}

export async function redirectToTrialCheckout(plan: UserPlan, trialDays: number = 7): Promise<void> {
  analytics.track(AnalyticsEvents.TRIAL_STARTED, { plan, trialDays });
  analytics.track(AnalyticsEvents.CHECKOUT_STARTED, { plan, type: 'trial', trialDays });
  try {
    const url = await createTrialCheckout(plan, trialDays);
    window.location.assign(url);
  } catch (err) {
    analytics.track(AnalyticsEvents.CHECKOUT_CANCELED, { plan, type: 'trial', reason: 'error' });
    throw err;
  }
}

export async function openBillingPortal(): Promise<void> {
  const token = await getAccessToken();

  const response = await fetch(`${getApiBaseUrl()}/api/payments/portal`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Błąd portalu (${response.status})`);
  }

  if (!data.url) {
    throw new Error('Brak adresu portalu rozliczeń.');
  }

  window.location.assign(data.url);
}
