/** Free tier: lite ma osobny limit dzienny — domyślnie oszczędzamy flash. */
export function mapModel(requested?: string): string {
  const m = (requested || '').toLowerCase();
  if (m.includes('pro')) return 'gemini-pro-latest';
  if (m.includes('lite')) return 'gemini-flash-lite-latest';
  if (m.includes('flash')) return 'gemini-flash-lite-latest';
  return 'gemini-flash-lite-latest';
}
