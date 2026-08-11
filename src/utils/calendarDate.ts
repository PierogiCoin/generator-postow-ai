/** Lokalna data YYYY-MM-DD — bez przesunięć UTC z `toISOString()`. */
export function formatDateYMDLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Start tygodnia (poniedziałek) dla danej daty, lokalnie. */
export function getWeekStartLocal(from: Date = new Date()): Date {
  const d = new Date(from);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Indeks dnia w tygodniu cadence/intelligence: 0=Pon … 6=Ndz.
 * (JS `getDay()`: 0=Ndz … 6=Sob)
 */
export function toMondayBasedWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Data w widocznym tygodniu odpowiadająca weekday 0=Pon…6=Ndz. */
export function dateInWeekForWeekday(weekStart: Date, weekdayMon0: number): Date {
  const d = new Date(weekStart);
  d.setDate(weekStart.getDate() + weekdayMon0);
  d.setHours(12, 0, 0, 0);
  return d;
}
