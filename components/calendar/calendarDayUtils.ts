import { formatDateYMDLocal } from '../../utils/calendarDate';

export const WEEK_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export function formatCellDate(d: Date): string {
  return formatDateYMDLocal(d);
}

export function isSameCalendarDay(tsOrDate: number | string, cellDate: Date): boolean {
  if (typeof tsOrDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(tsOrDate)) {
    return tsOrDate.startsWith(formatCellDate(cellDate));
  }
  const date1 = new Date(tsOrDate);
  return (
    date1.getFullYear() === cellDate.getFullYear() &&
    date1.getMonth() === cellDate.getMonth() &&
    date1.getDate() === cellDate.getDate()
  );
}

export function auditScoreClass(score: number): string {
  if (score >= 80) return 'bg-emerald-500/90 text-white';
  if (score >= 50) return 'bg-amber-500/90 text-white';
  return 'bg-red-500/90 text-white';
}

export function auditScoreLabel(
  score: number,
  t: (key: string, fallback: string) => string
): string {
  if (score >= 80) return t('calendar.audit.good', 'Dobry');
  if (score >= 50) return t('calendar.audit.medium', 'Średni');
  return t('calendar.audit.poor', 'Słaby');
}

export function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}
