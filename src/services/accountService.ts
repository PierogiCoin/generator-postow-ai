import { getSupabase } from './supabaseClient';
import { getApiBaseUrl } from './apiClient';
import type { PaymentHistoryItem, User } from '../types';
import { openBillingPortal } from './paymentService';

/**
 * Historia płatności — bez mocków.
 * Stripe Customer Portal jest źródłem faktur; lokalnie zwracamy pustą listę
 * + CTA do portalu (UI w PaymentHistory).
 */
export const fetchPaymentHistory = async (_user: User): Promise<PaymentHistoryItem[]> => {
  return [];
};

export async function openStripeBillingPortal(): Promise<void> {
  await openBillingPortal();
}

/**
 * Zmiana hasła przez Supabase Auth (wymaga ponownego logowania obecnym hasłem).
 */
export const changePassword = async (
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Baza nie jest skonfigurowana.');

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (signInError) {
    throw new Error('Obecne hasło jest nieprawidłowe.');
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message || 'Nie udało się zmienić hasła.');

  return { success: true, message: 'Hasło zostało zmienione.' };
};

/**
 * Trwałe usunięcie konta przez API (service role po stronie serwera).
 */
export const deleteAccount = async (): Promise<{ success: boolean; message: string }> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Baza nie jest skonfigurowana.');

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Musisz być zalogowany, aby usunąć konto.');
  }

  const response = await fetch(`${getApiBaseUrl()}/api/account/delete`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session.access_token}` },
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Nie udało się usunąć konta (${response.status})`);
  }

  return { success: true, message: 'Konto zostało trwale usunięte.' };
};

/** @deprecated Użyj changePassword / deleteAccount */
export const updateUserProfile = async (
  user: User,
  action: 'change_password' | 'delete_account',
  data?: Record<string, unknown>
): Promise<{ success: boolean; message: string }> => {
  if (action === 'change_password') {
    const current = String(data?.currentPassword ?? '');
    const next = String(data?.newPassword ?? '');
    return changePassword(user.email, current, next);
  }
  return deleteAccount();
};
