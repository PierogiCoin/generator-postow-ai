/**
 * Jedno źródło prawdy dla niszy/branży użytkownika.
 * Kolejność: klucz per-user → klucz globalny → aktywny profil Brand Voice → fallback.
 */

const GLOBAL_KEY = 'userNiche';

function perUserKey(userId: string): string {
  return `${GLOBAL_KEY}_${userId}`;
}

export function getUserNiche(userId?: string | null, brandVoiceFallback?: string): string {
  try {
    if (userId) {
      const perUser = localStorage.getItem(perUserKey(userId));
      if (perUser?.trim()) return perUser.trim();
    }
    const global = localStorage.getItem(GLOBAL_KEY);
    if (global?.trim()) return global.trim();
  } catch {
    // localStorage niedostępny (SSR/test)
  }
  if (brandVoiceFallback?.trim()) return brandVoiceFallback.trim();
  return 'marketing';
}

export function setUserNiche(niche: string, userId?: string | null): void {
  const value = niche.trim();
  if (!value) return;
  try {
    if (userId) localStorage.setItem(perUserKey(userId), value);
    localStorage.setItem(GLOBAL_KEY, value);
  } catch {
    // ignore
  }
}
