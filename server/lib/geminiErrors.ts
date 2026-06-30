const QUOTA_PATTERNS = [
  'quota exceeded',
  'resource_exhausted',
  'rate limit',
  'too many requests',
  'exceeded your current quota',
];

function parseStatusFromMessage(message: string): number {
  const match = message.match(/\[(\d{3})\s/);
  return match ? Number(match[1]) : 0;
}

export function isGeminiQuotaError(error: unknown): boolean {
  const err = error as { status?: number; message?: string; statusText?: string };
  const status = err?.status ?? parseStatusFromMessage(err?.message ?? '');
  if (status === 429) return true;

  const text = `${err?.message ?? ''} ${err?.statusText ?? ''}`.toLowerCase();
  return QUOTA_PATTERNS.some((p) => text.includes(p));
}

export function geminiErrorStatus(error: unknown): number {
  if (isGeminiQuotaError(error)) return 429;
  const err = error as { status?: number };
  if (err?.status && err.status >= 400 && err.status < 600) return err.status;
  return 500;
}

export const GEMINI_QUOTA_MESSAGE_PL =
  'Wyczerpano dzienny limit darmowego API Gemini (20 zapytań/dzień). Włącz rozliczenia w Google AI Studio lub spróbuj jutro.';

export function geminiErrorMessage(error: unknown): string {
  if (isGeminiQuotaError(error)) return GEMINI_QUOTA_MESSAGE_PL;
  const err = error as { message?: string };
  return err?.message || 'Generowanie treści nie powiodło się';
}
