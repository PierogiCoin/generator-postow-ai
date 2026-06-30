export type InputFormMode = 'quick' | 'advanced';

const STORAGE_KEY = 'inputFormMode';

export function getStoredInputFormMode(): InputFormMode {
  if (typeof window === 'undefined') return 'quick';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'advanced' ? 'advanced' : 'quick';
}

export function setStoredInputFormMode(mode: InputFormMode): void {
  localStorage.setItem(STORAGE_KEY, mode);
}

export function stripTopicHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '').trim();
}
