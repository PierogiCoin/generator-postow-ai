import type { IntelligentCalendarPlanItem, ScheduledPost } from '../types';

function formatDateYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSameCalendarDay(ts: number, date: Date): boolean {
  const d = new Date(ts);
  return formatDateYMD(d) === formatDateYMD(date);
}

/** Czy slot ma już zaplanowaną publikację (ta sama data, platforma, zbliżona godzina). */
export function hasScheduledCoverage(
  item: IntelligentCalendarPlanItem,
  scheduledPosts: ScheduledPost[]
): boolean {
  const dateStr = item.date;

  return scheduledPosts.some((post) => {
    const d = new Date(post.scheduleTimestamp);
    if (formatDateYMD(d) !== dateStr) return false;
    if (post.formData?.platform !== item.platform) return false;

    if (!item.time) return true;

    const [h, m] = item.time.split(':').map(Number);
    const slotMinutes = h * 60 + m;
    const postMinutes = d.getHours() * 60 + d.getMinutes();
    return Math.abs(postMinutes - slotMinutes) < 90;
  });
}

/** Plan na dany dzień posortowany po godzinie. */
export function getPlanItemsForDate(
  plan: IntelligentCalendarPlanItem[] | null,
  date: Date
): IntelligentCalendarPlanItem[] {
  const dateStr = formatDateYMD(date);
  return (plan || [])
    .filter((p) => p.date === dateStr || p.date.startsWith(dateStr))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}

/** Sloty planu na dzień bez zaplanowanej publikacji — kolejka do generowania. */
export function listSlotsNeedingGeneration(
  date: Date,
  plan: IntelligentCalendarPlanItem[] | null,
  scheduledPosts: ScheduledPost[]
): IntelligentCalendarPlanItem[] {
  return getPlanItemsForDate(plan, date).filter(
    (item) => !hasScheduledCoverage(item, scheduledPosts)
  );
}

export function countDayGenerationGaps(
  date: Date,
  plan: IntelligentCalendarPlanItem[] | null,
  scheduledPosts: ScheduledPost[]
): number {
  return listSlotsNeedingGeneration(date, plan, scheduledPosts).length;
}
