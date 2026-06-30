import { supabase } from './clients.js';

export type HeatmapCell = {
  weekday: number;
  hour: number;
  samples: number;
  avgScore: number;
};

export type Slot = { weekday: number; hour: number; samples: number; avgScore: number };

export function getWeekdayHourInTz(iso: string, tz: string) {
  const d = new Date(iso);
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const wd = parts.find((p) => p.type === 'weekday')?.value || 'Mon';
    const hourStr = parts.find((p) => p.type === 'hour')?.value || '00';
    const weekdayMap: Record<string, number> = {
      Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
    };
    return { weekday: weekdayMap[wd] ?? 0, hour: parseInt(hourStr, 10) || 0 };
  } catch {
    const fallback = new Date(iso);
    return { weekday: fallback.getUTCDay(), hour: fallback.getUTCHours() };
  }
}

export function computeSlotScore(metrics: Record<string, unknown> | null | undefined) {
  const likes = Number(metrics?.likes || 0);
  const comments = Number(metrics?.comments || 0);
  const shares = Number(metrics?.shares || 0);
  const impressions = Number(metrics?.impressions || metrics?.views || 0);
  const interactions = likes + comments + shares;
  const engagement = impressions > 0 ? interactions / impressions : interactions;
  return engagement + Math.min(impressions, 5000) * 0.00002;
}

export async function fetchTopSlots(userId: string, timezone: string, limit = 5): Promise<Slot[]> {
  const { data: posts } = await supabase
    .from('social_posts')
    .select('published_at, metrics')
    .eq('user_id', userId)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(500);

  if (!posts || posts.length === 0) return [];

  const buckets: Record<string, Slot> = {};
  for (const p of posts) {
    if (!p.published_at) continue;
    const { weekday, hour } = getWeekdayHourInTz(p.published_at, timezone);
    const key = `${weekday}-${hour}`;
    if (!buckets[key]) buckets[key] = { weekday, hour, samples: 0, avgScore: 0 };
    const score = computeSlotScore(p.metrics || {});
    const b = buckets[key];
    b.samples += 1;
    b.avgScore = (b.avgScore * (b.samples - 1) + score) / b.samples;
  }

  return Object.values(buckets)
    .filter((b) => b.samples >= 2)
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, limit);
}

export function nextOccurrenceForSlot(slot: Slot, timezone: string, after: Date): string | null {
  const result = new Date(after.getTime());
  for (let i = 0; i < 8; i++) {
    const candidate = new Date(result.getTime() + i * 24 * 60 * 60 * 1000);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(candidate);
    const wdStr = parts.find((p) => p.type === 'weekday')?.value || 'Mon';
    const weekdayMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    const wd = weekdayMap[wdStr] ?? candidate.getUTCDay();
    if (wd !== slot.weekday) continue;

    const mm = parts.find((p) => p.type === 'month')?.value || '01';
    const dd = parts.find((p) => p.type === 'day')?.value || '01';
    const yyyy = parts.find((p) => p.type === 'year')?.value || '1970';
    const isoLocal = `${yyyy}-${mm}-${dd}T${String(slot.hour).padStart(2, '0')}:00:00`;
    const zoned = new Date(isoLocal + 'Z');
    const target = new Date(
      new Date(
        new Intl.DateTimeFormat('sv-SE', {
          timeZone: timezone,
          hour12: false,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(zoned).replace(' ', 'T')
      ).getTime()
    );

    if (target > after) return target.toISOString();
  }
  return null;
}
