/**
 * Map UI / alias model names to concrete Gemini model IDs.
 * Flash (default product tier) → gemini-2.5-flash.
 * Lite only when explicitly requested (cheap jobs: hashtags, scoring).
 */
export function mapModel(requested?: string): string {
  const raw = (requested || '').trim();
  // Jawny identyfikator modelu (np. gemini-2.5-flash dla grounding)
  if (/^gemini-[\d][\w.-]*$/i.test(raw)) return raw;

  const m = raw.toLowerCase();
  if (m.includes('pro')) return 'gemini-pro-latest';
  if (m.includes('lite')) return 'gemini-flash-lite-latest';
  if (m.includes('flash')) return 'gemini-2.5-flash';
  return 'gemini-2.5-flash';
}
