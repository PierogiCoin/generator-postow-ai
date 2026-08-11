import { v4 as uuidv4 } from 'uuid';
import type { IntelligentCalendarPlanItem, Platform } from '../types';
import { GenerationType } from '../types';
import type { PostMortemReport } from './postMortemService';
import { socialPlatformToPlatform } from './autoPublishService';
import type { SocialPlatform } from '../types/socialPublishing';

function formatDateYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Parsuje BEST_REPOST_TIME lub domyślnie +7 dni od publikacji. */
export function suggestRepostDate(
  bestTimeToRepost: string | undefined,
  publishedAt: Date
): { date: string; time: string } {
  const base = new Date(publishedAt);
  base.setDate(base.getDate() + 7);
  base.setHours(14, 0, 0, 0);

  if (!bestTimeToRepost?.trim()) {
    return { date: formatDateYMD(base), time: '14:00' };
  }

  const lower = bestTimeToRepost.toLowerCase();
  const timeMatch = bestTimeToRepost.match(/(\d{1,2})[:\.](\d{2})/);
  const time = timeMatch
    ? `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}`
    : '14:00';

  const dayNames: Record<string, number> = {
    poniedziałek: 1,
    monday: 1,
    wtorek: 2,
    tuesday: 2,
    środa: 3,
    wednesday: 3,
    czwartek: 4,
    thursday: 4,
    piątek: 5,
    friday: 5,
    sobota: 6,
    saturday: 6,
    niedziela: 0,
    sunday: 0,
  };

  let targetDow: number | null = null;
  for (const [name, dow] of Object.entries(dayNames)) {
    if (lower.includes(name)) {
      targetDow = dow;
      break;
    }
  }

  const scheduled = new Date();
  scheduled.setHours(parseInt(time.split(':')[0], 10), parseInt(time.split(':')[1], 10), 0, 0);

  if (targetDow !== null) {
    const currentDow = scheduled.getDay();
    let delta = targetDow - currentDow;
    if (delta <= 0) delta += 7;
    scheduled.setDate(scheduled.getDate() + delta);
  } else {
    scheduled.setDate(scheduled.getDate() + 7);
  }

  if (scheduled.getTime() < Date.now()) {
    scheduled.setDate(scheduled.getDate() + 7);
  }

  return { date: formatDateYMD(scheduled), time };
}

export function buildCalendarItemFromPostMortem(
  report: PostMortemReport,
  post: { content: string; publishedAt: Date },
  socialPlatform: SocialPlatform
): IntelligentCalendarPlanItem | null {
  const platform = socialPlatformToPlatform(socialPlatform);
  if (!platform) return null;

  const { date, time } = suggestRepostDate(report.bestTimeToRepost, post.publishedAt);
  const topic =
    report.suggestedImprovedHook?.slice(0, 120) ||
    post.content.replace(/<[^>]*>/g, '').trim().slice(0, 80) ||
    'Follow-up po post-mortem';

  const strategy = [
    report.keyLesson,
    report.nextTimeRecommendation,
    report.verdict === 'hit' ? 'Powtórz sprawdzony format.' : 'Zastosuj lekcje z analizy.',
  ]
    .filter(Boolean)
    .join(' ');

  const contentIntent: IntelligentCalendarPlanItem['contentIntent'] =
    report.verdict === 'hit'
      ? 'educational'
      : report.verdict === 'miss'
        ? 'promotional'
        : 'community';

  return {
    id: uuidv4(),
    date,
    time,
    platform,
    topic,
    format: GenerationType.PostWithImage,
    strategy,
    slotType: 'post',
    contentIntent,
  };
}

export function mergePostMortemIntoPlan(
  existing: IntelligentCalendarPlanItem[] | null,
  item: IntelligentCalendarPlanItem
): IntelligentCalendarPlanItem[] {
  const duplicate = (existing || []).some(
    (p) => p.date === item.date && p.time === item.time && p.topic === item.topic
  );
  if (duplicate) return existing || [];
  return [...(existing || []), item];
}
