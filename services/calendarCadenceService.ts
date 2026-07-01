import { v4 as uuidv4 } from 'uuid';
import { generateJson } from './apiClient';
import {
  Platform,
  GenerationType,
  IntelligentCalendarPlanItem,
  ScheduledPost,
} from '../types';

export type CadencePresetId = 'starter' | 'growth' | 'aggressive';

export interface CadenceSlotTemplate {
  hour: string;
  slotType: 'post' | 'reel' | 'story';
  contentIntent: IntelligentCalendarPlanItem['contentIntent'];
  label: string;
}

export interface CadenceTemplate {
  id: CadencePresetId;
  labelKey: string;
  descriptionKey: string;
  /** 1=Mon … 5=Fri, 6=Sat, 0=Sun (JS getDay) */
  weekdayDays: number[];
  weekdaySlots: CadenceSlotTemplate[];
  weekendDays: number[];
  weekendSlots: CadenceSlotTemplate[];
}

export interface DayAudit {
  date: string;
  score: number;
  slotsFilled: { post: number; reel: number; story: number };
  slotsTarget: { post: number; reel: number; story: number };
  issues: string[];
  tips: string[];
}

export const CADENCE_PRESETS: Record<CadencePresetId, CadenceTemplate> = {
  starter: {
    id: 'starter',
    labelKey: 'calendar.cadence.starter',
    descriptionKey: 'calendar.cadence.starterDesc',
    weekdayDays: [1, 2, 3, 4, 5],
    weekdaySlots: [
      { hour: '14:00', slotType: 'post', contentIntent: 'educational', label: 'Post wartościowy' },
    ],
    weekendDays: [6, 0],
    weekendSlots: [
      { hour: '11:00', slotType: 'post', contentIntent: 'behind-the-scenes', label: 'Post lekki' },
    ],
  },
  growth: {
    id: 'growth',
    labelKey: 'calendar.cadence.growth',
    descriptionKey: 'calendar.cadence.growthDesc',
    weekdayDays: [1, 2, 3, 4, 5],
    weekdaySlots: [
      { hour: '09:00', slotType: 'post', contentIntent: 'educational', label: 'Post edukacyjny' },
      { hour: '14:00', slotType: 'post', contentIntent: 'community', label: 'Post społecznościowy / CTA' },
      { hour: '18:00', slotType: 'reel', contentIntent: 'entertaining', label: 'Rolka (hook + wartość)' },
    ],
    weekendDays: [6, 0],
    weekendSlots: [
      { hour: '11:00', slotType: 'post', contentIntent: 'behind-the-scenes', label: 'Post BTS' },
      { hour: '17:00', slotType: 'reel', contentIntent: 'inspirational', label: 'Rolka weekendowa' },
    ],
  },
  aggressive: {
    id: 'aggressive',
    labelKey: 'calendar.cadence.aggressive',
    descriptionKey: 'calendar.cadence.aggressiveDesc',
    weekdayDays: [1, 2, 3, 4, 5],
    weekdaySlots: [
      { hour: '08:00', slotType: 'post', contentIntent: 'educational', label: 'Post poranny' },
      { hour: '12:00', slotType: 'story', contentIntent: 'community', label: 'Story ankieta' },
      { hour: '15:00', slotType: 'post', contentIntent: 'promotional', label: 'Post CTA' },
      { hour: '19:00', slotType: 'reel', contentIntent: 'entertaining', label: 'Rolka wieczorna' },
    ],
    weekendDays: [6, 0],
    weekendSlots: [
      { hour: '10:00', slotType: 'post', contentIntent: 'inspirational', label: 'Post weekendowy' },
      { hour: '18:00', slotType: 'reel', contentIntent: 'entertaining', label: 'Rolka' },
    ],
  },
};

interface CadenceSlotDraft {
  date: string;
  time: string;
  slotType: 'post' | 'reel' | 'story';
  contentIntent: string;
  topic: string;
  strategy: string;
}

function formatDateYMD(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function slotFormat(slotType: 'post' | 'reel' | 'story'): GenerationType {
  if (slotType === 'reel') return GenerationType.Video;
  return GenerationType.PostWithImage;
}

function inferSlotType(item: IntelligentCalendarPlanItem): 'post' | 'reel' | 'story' {
  if (item.slotType) return item.slotType;
  if (item.format === GenerationType.Video) return 'reel';
  return 'post';
}

/** Szkielet slotów na 7 dni od startDate według presetu */
export function buildCadenceSlotSkeleton(
  presetId: CadencePresetId,
  startDate: Date
): { date: string; time: string; slotType: 'post' | 'reel' | 'story'; contentIntent: CadenceSlotTemplate['contentIntent']; label: string }[] {
  const preset = CADENCE_PRESETS[presetId];
  const slots: ReturnType<typeof buildCadenceSlotSkeleton> = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dow = d.getDay();
    const dateStr = formatDateYMD(d);

    const isWeekend = preset.weekendDays.includes(dow);
    const daySlots = isWeekend ? preset.weekendSlots : preset.weekdayDays.includes(dow) ? preset.weekdaySlots : [];

    for (const s of daySlots) {
      slots.push({
        date: dateStr,
        time: s.hour,
        slotType: s.slotType,
        contentIntent: s.contentIntent,
        label: s.label,
      });
    }
  }

  return slots;
}

function buildFallbackTopics(
  skeleton: ReturnType<typeof buildCadenceSlotSkeleton>,
  weekTheme: string,
  platform: Platform
): CadenceSlotDraft[] {
  return skeleton.map((s) => ({
    date: s.date,
    time: s.time,
    slotType: s.slotType,
    contentIntent: s.contentIntent || 'educational',
    topic: `${weekTheme} — ${s.label}`,
    strategy: `${s.contentIntent} na ${platform}. ${s.slotType === 'reel' ? 'Hook w 3s, wartość 15–30s.' : 'Dopasuj do grupy docelowej.'}`,
  }));
}

export async function generateCadenceWeekPlan(
  presetId: CadencePresetId,
  startDate: Date,
  weekTheme: string,
  platform: Platform,
  niche: string,
  userId: string,
  previousTopics: string[] = []
): Promise<IntelligentCalendarPlanItem[]> {
  const skeleton = buildCadenceSlotSkeleton(presetId, startDate);
  if (skeleton.length === 0) return [];

  const preset = CADENCE_PRESETS[presetId];
  const slotsDescription = skeleton
    .map((s, i) => `${i + 1}. ${s.date} ${s.time} — ${s.slotType} (${s.contentIntent}): ${s.label}`)
    .join('\n');

  let drafts: CadenceSlotDraft[];

  try {
    drafts = await generateJson<CadenceSlotDraft[]>(
      {
        model: 'gemini-2.5-flash',
        contents: `Stwórz plan treści na tydzień dla social media.

NISZA: ${niche}
PLATFORM: ${platform}
TEMAT TYGODNIA: ${weekTheme}
SZABLON CADENCE: ${preset.id}
${previousTopics.length ? `UNIKAJ POWTÓRZEŃ (tematy z historii): ${previousTopics.slice(0, 15).join(', ')}` : ''}

Sloty do wypełnienia (dokładnie ${skeleton.length} pozycji, ta sama kolejność):
${slotsDescription}

Dla KAŻDEGO slotu zwróć obiekt JSON z polami:
- date (YYYY-MM-DD, jak w liście)
- time (HH:mm)
- slotType ("post" | "reel" | "story")
- contentIntent (educational | entertaining | inspirational | promotional | community | behind-the-scenes)
- topic (konkretny, kreatywny temat po polsku, max 80 znaków)
- strategy (1 zdanie: dlaczego ten slot o tej porze)

Reguły:
- Rolki repurposuj z porannych postów edukacyjnych (ten sam temat, krótsza forma)
- Rotuj intencje w tygodniu (nie 3x promotional tego samego dnia)
- Tylko tablica JSON, bez markdown.`,
        systemInstruction:
          'Jesteś strategiem social media. Zwracaj wyłącznie poprawną tablicę JSON.',
      },
      userId
    );
  } catch {
    drafts = buildFallbackTopics(skeleton, weekTheme, platform);
  }

  if (!Array.isArray(drafts) || drafts.length === 0) {
    drafts = buildFallbackTopics(skeleton, weekTheme, platform);
  }

  return skeleton.map((sk, i) => {
    const d = drafts[i] || buildFallbackTopics([sk], weekTheme, platform)[0];
    const slotType = (d.slotType || sk.slotType) as 'post' | 'reel' | 'story';
    return {
      id: uuidv4(),
      date: sk.date,
      time: sk.time,
      platform,
      topic: d.topic || `${weekTheme} — ${sk.label}`,
      format: slotFormat(slotType),
      strategy: d.strategy || sk.label,
      slotType,
      contentIntent: (d.contentIntent as IntelligentCalendarPlanItem['contentIntent']) || sk.contentIntent,
    };
  });
}

export function getDayCadenceTargets(presetId: CadencePresetId, date: Date): { post: number; reel: number; story: number } {
  const preset = CADENCE_PRESETS[presetId];
  const dow = date.getDay();
  const isWeekend = preset.weekendDays.includes(dow);
  const slots = isWeekend ? preset.weekendSlots : preset.weekdayDays.includes(dow) ? preset.weekdaySlots : [];

  return slots.reduce(
    (acc, s) => {
      acc[s.slotType] += 1;
      return acc;
    },
    { post: 0, reel: 0, story: 0 }
  );
}

export function auditCalendarDay(
  date: Date,
  presetId: CadencePresetId,
  planItems: IntelligentCalendarPlanItem[],
  scheduledPosts: ScheduledPost[]
): DayAudit {
  const dateStr = formatDateYMD(date);
  const targets = getDayCadenceTargets(presetId, date);
  const totalTarget = targets.post + targets.reel + targets.story;

  const dayPlan = planItems.filter((p) => p.date === dateStr || p.date.startsWith(dateStr));
  const dayScheduled = scheduledPosts.filter((p) => {
    const d = new Date(p.scheduleTimestamp);
    return formatDateYMD(d) === dateStr;
  });

  const filled = { post: 0, reel: 0, story: 0 };

  for (const item of dayPlan) {
    const t = inferSlotType(item);
    filled[t] += 1;
  }

  for (const _post of dayScheduled) {
    filled.post += 1;
  }

  const issues: string[] = [];
  const tips: string[] = [];

  if (totalTarget === 0) {
    return {
      date: dateStr,
      score: 100,
      slotsFilled: filled,
      slotsTarget: targets,
      issues: [],
      tips: ['Dzień wolny w szablonie — możesz dodać treść opcjonalnie.'],
    };
  }

  if (filled.post < targets.post) {
    issues.push(`Brakuje ${targets.post - filled.post} post(ów) (cel: ${targets.post})`);
    tips.push('Użyj „Uzupełnij brakujące” lub przeciągnij sugestię AI na ten dzień.');
  }
  if (filled.reel < targets.reel) {
    issues.push(`Brakuje rolki (cel: ${targets.reel})`);
    tips.push('Rolka najlepiej repurposuje poranny post edukacyjny — ten sam temat, 15–30s.');
  }
  if (filled.story < targets.story) {
    issues.push(`Brakuje story (cel: ${targets.story})`);
  }
  if (filled.post > targets.post + 1) {
    issues.push('Za dużo postów — rozważ rozłożenie na kolejne dni.');
  }

  const planTimes = dayPlan.map((p) => p.time).filter(Boolean) as string[];
  const sorted = [...planTimes].sort();
  for (let i = 1; i < sorted.length; i++) {
    const [h1, m1] = sorted[i - 1].split(':').map(Number);
    const [h2, m2] = sorted[i].split(':').map(Number);
    const diff = h2 * 60 + m2 - (h1 * 60 + m1);
    if (diff < 4 * 60) {
      issues.push('Posty są bliżej niż 4h — rozłóż godziny dla lepszego zasięgu.');
      break;
    }
  }

  const promoCount = dayPlan.filter((p) => p.contentIntent === 'promotional').length;
  if (promoCount >= 2) {
    issues.push('Dużo treści promocyjnych — dodaj edukację lub BTS.');
  }

  let score = 100;
  if (targets.post) score -= Math.max(0, targets.post - filled.post) * 25;
  if (targets.reel) score -= Math.max(0, targets.reel - filled.reel) * 20;
  if (targets.story) score -= Math.max(0, targets.story - filled.story) * 15;
  score -= issues.filter((i) => i.includes('4h') || i.includes('promocyjnych')).length * 10;
  score = Math.max(0, Math.min(100, score));

  if (score >= 80 && issues.length === 0) {
    tips.push('Dzień zgodny z szablonem cadence — możesz generować treści.');
  }

  return { date: dateStr, score, slotsFilled: filled, slotsTarget: targets, issues, tips };
}

export function mergeCalendarPlans(
  existing: IntelligentCalendarPlanItem[] | null,
  incoming: IntelligentCalendarPlanItem[]
): IntelligentCalendarPlanItem[] {
  if (!existing?.length) return incoming;
  const incomingDates = new Set(incoming.map((i) => `${i.date}|${i.time}|${i.slotType}`));
  const kept = existing.filter((i) => !incomingDates.has(`${i.date}|${i.time}|${i.slotType}`));
  return [...kept, ...incoming];
}

export function convertWeekPlanToCalendarItems(
  posts: { dayOfWeek: number; topic: string; hook: string; format: string; optimalTime: string; contentType: string }[],
  platform: Platform,
  weekStart: Date
): IntelligentCalendarPlanItem[] {
  return posts.map((post) => {
    const d = new Date(weekStart);
    const offset = post.dayOfWeek === 0 ? 6 : post.dayOfWeek - 1;
    d.setDate(weekStart.getDate() + offset);

    const fmt = post.format?.toLowerCase() || '';
    const slotType: 'post' | 'reel' | 'story' =
      fmt.includes('reel') || fmt.includes('video') ? 'reel' : fmt.includes('story') ? 'story' : 'post';

    return {
      id: uuidv4(),
      date: formatDateYMD(d),
      time: post.optimalTime || '14:00',
      platform,
      topic: post.topic,
      format: slotFormat(slotType),
      strategy: post.hook || post.contentType,
      slotType,
      contentIntent: (post.contentType as IntelligentCalendarPlanItem['contentIntent']) || 'educational',
    };
  });
}

export function slotTypeBadge(slotType?: 'post' | 'reel' | 'story'): string {
  if (slotType === 'reel') return '🎬';
  if (slotType === 'story') return '📱';
  return '📝';
}

/** Uzupełnia brakujące sloty jednego dnia */
export async function generateMissingDaySlots(
  date: Date,
  presetId: CadencePresetId,
  existingPlan: IntelligentCalendarPlanItem[],
  weekTheme: string,
  platform: Platform,
  niche: string,
  userId: string
): Promise<IntelligentCalendarPlanItem[]> {
  const dateStr = formatDateYMD(date);
  const monday = new Date(date);
  const dow = monday.getDay();
  monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1));

  const weekSkeleton = buildCadenceSlotSkeleton(presetId, monday);
  const daySkeleton = weekSkeleton.filter((s) => s.date === dateStr);

  const existingForDay = existingPlan.filter((p) => p.date === dateStr);
  const existingKeys = new Set(existingForDay.map((p) => `${p.time}|${inferSlotType(p)}`));

  const missing = daySkeleton.filter((s) => !existingKeys.has(`${s.time}|${s.slotType}`));
  if (missing.length === 0) return [];

  const drafts = buildFallbackTopics(missing, weekTheme || 'Treść tygodnia', platform);

  try {
    const aiDrafts = await generateJson<CadenceSlotDraft[]>(
      {
        model: 'gemini-2.5-flash',
        contents: `Wygeneruj ${missing.length} pomysły na treści social media na dzień ${dateStr}.
NISZA: ${niche}, PLATFORM: ${platform}, TEMAT: ${weekTheme}
Sloty:\n${missing.map((m, i) => `${i + 1}. ${m.time} ${m.slotType} (${m.contentIntent}): ${m.label}`).join('\n')}
Zwróć tablicę JSON z polami: date, time, slotType, contentIntent, topic, strategy.`,
      },
      userId
    );
    if (Array.isArray(aiDrafts) && aiDrafts.length >= missing.length) {
      drafts.splice(0, drafts.length, ...aiDrafts.slice(0, missing.length));
    }
  } catch {
    // fallback drafts already set
  }

  return missing.map((sk, i) => {
    const d = drafts[i];
    const slotType = (d?.slotType || sk.slotType) as 'post' | 'reel' | 'story';
    return {
      id: uuidv4(),
      date: sk.date,
      time: sk.time,
      platform,
      topic: d?.topic || `${weekTheme} — ${sk.label}`,
      format: slotFormat(slotType),
      strategy: d?.strategy || sk.label,
      slotType,
      contentIntent: (d?.contentIntent as IntelligentCalendarPlanItem['contentIntent']) || sk.contentIntent,
    };
  });
}
