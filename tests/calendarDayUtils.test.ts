import { describe, expect, it } from 'vitest';
import {
  auditScoreClass,
  auditScoreLabel,
  formatCellDate,
  isSameCalendarDay,
  isToday,
  WEEK_DAY_KEYS,
} from '../components/calendar/calendarDayUtils';

describe('calendarDayUtils', () => {
  it('formatuje datę lokalnie YYYY-MM-DD', () => {
    const d = new Date(2026, 6, 29); // month 0-indexed
    expect(formatCellDate(d)).toBe('2026-07-29');
  });

  it('porównuje ten sam dzień kalendarzowy', () => {
    const cell = new Date(2026, 6, 29, 15, 0, 0);
    expect(isSameCalendarDay('2026-07-29', cell)).toBe(true);
    expect(isSameCalendarDay('2026-07-28', cell)).toBe(false);
    expect(isSameCalendarDay(cell.getTime(), cell)).toBe(true);
  });

  it('mapuje score na klasy i etykiety', () => {
    expect(auditScoreClass(90)).toContain('emerald');
    expect(auditScoreClass(60)).toContain('amber');
    expect(auditScoreClass(10)).toContain('red');
    const t = (_k: string, fb: string) => fb;
    expect(auditScoreLabel(90, t)).toBe('Dobry');
  });

  it('eksportuje klucze dni tygodnia', () => {
    expect(WEEK_DAY_KEYS).toHaveLength(7);
    expect(isToday(new Date())).toBe(true);
  });
});
