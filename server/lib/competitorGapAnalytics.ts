import type { HeatmapCell } from './schedulingAnalytics.js';

export type HourlyDensity = {
  weekday: number; // 0=Mon … 6=Sun (jak heatmapa social)
  hour: number; // 0-23
  density: number; // 1-10 jak bardzo konkurenci są aktywni
  handles?: string[];
};

export type GapSlot = {
  weekday: number;
  hour: number;
  gapScore: number; // 1-10
  reason: string;
  competitorDensity: number;
  userPerformance?: number;
};

const WEEKDAY_ALIASES: Record<string, number> = {
  mon: 0, monday: 0, pon: 0, poniedziałek: 0,
  tue: 1, tuesday: 1, wt: 1, wtorek: 1,
  wed: 2, wednesday: 2, śr: 2, sro: 2, środa: 2,
  thu: 3, thursday: 3, cz: 3, czw: 3, czwartek: 3,
  fri: 4, friday: 4, pt: 4, piątek: 4,
  sat: 5, saturday: 5, sob: 5, sobota: 5,
  sun: 6, sunday: 6, nd: 6, ndz: 6, niedziela: 6,
};

export function parseWeekdayHourLabel(label: string): { weekday: number; hour: number } | null {
  const normalized = label.trim().toLowerCase();
  const timeMatch = normalized.match(/(\d{1,2}):(\d{2})/);
  if (!timeMatch) return null;
  const hour = Math.min(23, Math.max(0, parseInt(timeMatch[1], 10)));

  for (const [alias, weekday] of Object.entries(WEEKDAY_ALIASES)) {
    if (normalized.includes(alias)) {
      return { weekday, hour };
    }
  }
  return null;
}

function densityKey(weekday: number, hour: number): string {
  return `${weekday}-${hour}`;
}

export function buildCompetitorDensityMap(cells: HourlyDensity[]): Map<string, HourlyDensity> {
  const map = new Map<string, HourlyDensity>();
  for (const cell of cells) {
    if (cell.weekday < 0 || cell.weekday > 6 || cell.hour < 0 || cell.hour > 23) continue;
    const key = densityKey(cell.weekday, cell.hour);
    const existing = map.get(key);
    if (!existing || cell.density > existing.density) {
      map.set(key, cell);
    }
  }
  return map;
}

export function buildUserPerformanceMap(cells: HeatmapCell[]): Map<string, number> {
  const map = new Map<string, number>();
  if (cells.length === 0) return map;

  const maxScore = Math.max(...cells.map((c) => c.avgScore), 0.0001);
  for (const cell of cells) {
    const normalized = Math.min(10, Math.max(1, Math.round((cell.avgScore / maxScore) * 10)));
    map.set(densityKey(cell.weekday, cell.hour), normalized);
  }
  return map;
}

/**
 * Znajduje godziny z niską aktywnością konkurencji i (opcjonalnie) wysoką skutecznością użytkownika.
 */
export function computeGapSlots(
  competitorCells: HourlyDensity[],
  userHeatmap: HeatmapCell[] = [],
  limit = 12
): GapSlot[] {
  const competitorMap = buildCompetitorDensityMap(competitorCells);
  const userMap = buildUserPerformanceMap(userHeatmap);
  const gaps: GapSlot[] = [];

  // Preferuj komórki z niską gęstością konkurencji
  for (const [key, cell] of competitorMap) {
    if (cell.density > 4) continue;
    const userPerformance = userMap.get(key);
    const gapScore = Math.min(
      10,
      Math.round(
        (10 - cell.density) * 0.55 +
          (userPerformance ? userPerformance * 0.35 : 3.5) +
          (cell.density <= 2 ? 1.5 : 0)
      )
    );
    gaps.push({
      weekday: cell.weekday,
      hour: cell.hour,
      gapScore,
      reason: userPerformance
        ? `Niska aktywność konkurencji (${cell.density}/10), Twoje posty w tym slocie działają lepiej (${userPerformance}/10).`
        : `Luka w harmonogramie konkurencji (${cell.density}/10) — mniej szumu algorytmicznego.`,
      competitorDensity: cell.density,
      userPerformance,
    });
  }

  // Uzupełnij slotami odwrotnymi: wysoka skuteczność usera, brak danych o konkurencji
  for (const [key, score] of userMap) {
    if (competitorMap.has(key)) continue;
    const [weekday, hour] = key.split('-').map(Number);
    gaps.push({
      weekday,
      hour,
      gapScore: Math.min(10, Math.round(score * 0.85 + 2)),
      reason: `Twój historycznie silny slot (${score}/10), brak silnej obecności konkurencji w danych.`,
      competitorDensity: 3,
      userPerformance: score,
    });
  }

  return gaps
    .sort((a, b) => b.gapScore - a.gapScore)
    .slice(0, limit);
}

export function gapSlotToLabel(slot: GapSlot): string {
  const days = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
  return `${days[slot.weekday] ?? '?'} ${String(slot.hour).padStart(2, '0')}:00`;
}

export function gapSlotToTime(slot: GapSlot): string {
  return `${String(slot.hour).padStart(2, '0')}:00`;
}
