import type { CadencePresetId } from '../services/calendarCadenceService';

const KEY = 'so_calendar_cadence_prefs';

export interface CalendarCadencePrefs {
  presetId: CadencePresetId;
  weekTheme: string;
  platform: string;
}

const DEFAULTS: CalendarCadencePrefs = {
  presetId: 'growth',
  weekTheme: '',
  platform: 'Instagram',
};

export function loadCalendarCadencePrefs(): CalendarCadencePrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<CalendarCadencePrefs>;
    return {
      presetId: (parsed.presetId as CadencePresetId) || DEFAULTS.presetId,
      weekTheme: parsed.weekTheme ?? '',
      platform: parsed.platform ?? DEFAULTS.platform,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveCalendarCadencePrefs(prefs: CalendarCadencePrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}
