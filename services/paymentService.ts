import { getSupabase } from './supabaseClient';
import { getApiBaseUrl } from './apiClient';
import { UserPlan } from '../types';

export const PENDING_CHECKOUT_PLAN_KEY = 'pendingCheckoutPlan';

const PAID_PLANS: UserPlan[] = [
  UserPlan.Creator,
  UserPlan.Pro,
  UserPlan.Agency,
  UserPlan.Business,
];

export function isPaidPlan(plan: UserPlan): boolean {
  return PAID_PLANS.includes(plan);
}

export function setPendingCheckoutPlan(plan: UserPlan): void {
  sessionStorage.setItem(PENDING_CHECKOUT_PLAN_KEY, plan);
}

export function consumePendingCheckoutPlan(): UserPlan | null {
  const raw = sessionStorage.getItem(PENDING_CHECKOUT_PLAN_KEY);
  sessionStorage.removeItem(PENDING_CHECKOUT_PLAN_KEY);
  if (!raw) return null;
  if (!PAID_PLANS.includes(raw as UserPlan)) return null;
  return raw as UserPlan;
}

async function getAccessToken(): Promise<string> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Musisz być zalogowany, aby przejść do płatności.');
  }
  return session.access_token;
}

export async function createSubscriptionCheckout(plan: UserPlan): Promise<string> {
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
    body: JSON.stringify({ plan }),
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

export async function redirectToSubscriptionCheckout(plan: UserPlan): Promise<void> {
  const url = await createSubscriptionCheckout(plan);
  window.location.assign(url);
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
