export function mapModel(requested?: string): string {
  const raw = (requested || '').trim();
  // Jawny identyfikator modelu (np. gemini-2.5-flash dla grounding)
  if (/^gemini-[\d][\w.-]*$/i.test(raw)) return raw;

  const m = raw.toLowerCase();
  if (m.includes('pro')) return 'gemini-pro-latest';
  if (m.includes('lite')) return 'gemini-flash-lite-latest';
  if (m.includes('flash')) return 'gemini-flash-lite-latest';
  return 'gemini-flash-lite-latest';
}
