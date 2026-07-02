import type {
  CampaignHistoryItem,
  FavoritePost,
  IntelligentCalendarPlanItem,
  Platform,
  ScheduledPost,
  ContentInventoryReview,
  StrategistContentItem,
} from '../types';
import { GenerationType, Platform as PlatformEnum } from '../types';
import type { SocialPost } from '../types/socialPublishing';
import { checkForSimilarContent } from './contentDuplicateService';

export type ContentInventoryItem = StrategistContentItem;

export interface ContentInventoryInput {
  history: CampaignHistoryItem[];
  favorites: FavoritePost[];
  scheduledPosts: ScheduledPost[];
  calendarPlan: IntelligentCalendarPlanItem[] | null;
  publishedPosts?: SocialPost[];
  targetPlatforms?: Platform[];
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>?/gm, '').trim();
}

function mapSocialPlatform(platform?: string): Platform | undefined {
  if (!platform) return undefined;
  const p = platform.toLowerCase();
  if (p.includes('facebook')) return PlatformEnum.Facebook;
  if (p.includes('instagram')) return PlatformEnum.Instagram;
  if (p.includes('linkedin')) return PlatformEnum.LinkedIn;
  if (p.includes('tiktok')) return PlatformEnum.TikTok;
  if (p === 'x' || p.includes('twitter')) return PlatformEnum.X;
  if (p.includes('youtube')) return PlatformEnum.YouTube;
  return undefined;
}

function engagementFromHistory(item: CampaignHistoryItem): number | undefined {
  const perf = item.performance;
  if (!perf) return undefined;
  return (perf.likes || 0) + (perf.comments || 0) * 2 + (perf.shares || 0) * 3 + (perf.reach || 0) * 0.01;
}

function engagementFromSocial(post: SocialPost): number | undefined {
  const m = post.metrics;
  if (!m) return undefined;
  return (m.likes || 0) + (m.comments || 0) * 2 + (m.shares || 0) * 3 + (m.views || 0) * 0.001 + (m.reach || 0) * 0.01;
}

function topicFromPostText(text: string, maxLen = 80): string {
  const clean = stripHtml(text).replace(/\s+/g, ' ');
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen)}…`;
}

export function buildContentInventory(input: ContentInventoryInput): ContentInventoryItem[] {
  const items: ContentInventoryItem[] = [];
  const seen = new Set<string>();

  const push = (item: ContentInventoryItem) => {
    const key = `${item.platform || ''}:${item.topic.toLowerCase().slice(0, 60)}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  for (const h of input.history.slice(0, 40)) {
    const topic = stripHtml(h.formData?.topic || h.result?.postText || '');
    if (!topic) continue;
    push({
      id: h.id,
      source: 'history',
      topic,
      platform: h.formData?.platform,
      format: h.formData?.generationType,
      tone: h.formData?.tone,
      status: 'generated',
      date: new Date(h.timestamp).toISOString().slice(0, 10),
      engagementScore: engagementFromHistory(h),
      snippet: topicFromPostText(h.result?.postText || topic, 120),
    });
  }

  for (const f of input.favorites.slice(0, 15)) {
    const topic = stripHtml(f.formData?.topic || f.result?.postText || '');
    if (!topic) continue;
    push({
      id: f.id,
      source: 'favorite',
      topic,
      platform: f.formData?.platform,
      format: f.formData?.generationType,
      tone: f.formData?.tone,
      status: 'saved',
      date: new Date(f.timestamp).toISOString().slice(0, 10),
      snippet: topicFromPostText(f.result?.postText || topic, 120),
    });
  }

  for (const s of input.scheduledPosts.filter((p) => p.status === 'scheduled' || p.status === 'draft').slice(0, 20)) {
    const topic = stripHtml(s.formData?.topic || s.result?.postText || '');
    if (!topic) continue;
    push({
      id: s.id,
      source: 'scheduled',
      topic,
      platform: s.scheduledPlatforms?.[0] || s.formData?.platform,
      format: s.scheduledFormats?.[0] || s.formData?.generationType,
      tone: s.formData?.tone,
      status: 'scheduled',
      date: new Date(s.scheduleTimestamp).toISOString().slice(0, 10),
      snippet: topicFromPostText(s.result?.postText || topic, 120),
    });
  }

  if (input.calendarPlan?.length) {
    for (const slot of input.calendarPlan) {
      if (!slot.topic?.trim()) continue;
      push({
        id: slot.id,
        source: 'calendar',
        topic: stripHtml(slot.topic),
        platform: slot.platform,
        format: slot.format,
        status: 'planned',
        date: slot.date,
        snippet: stripHtml(slot.strategy || slot.topic).slice(0, 120),
      });
    }
  }

  for (const p of (input.publishedPosts || []).slice(0, 30)) {
    const topic = topicFromPostText(p.content || '', 100);
    if (!topic) continue;
    const publishedAt = p.publishedAt ? new Date(p.publishedAt).toISOString().slice(0, 10) : undefined;
    push({
      id: p.id,
      source: 'published',
      topic,
      platform: mapSocialPlatform(p.platform),
      status: 'published',
      date: publishedAt,
      engagementScore: engagementFromSocial(p),
      snippet: topicFromPostText(p.content || '', 140),
    });
  }

  return items.sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    return dateB.localeCompare(dateA);
  });
}

export function analyzeContentInventory(
  items: ContentInventoryItem[],
  targetPlatforms?: Platform[]
): ContentInventoryReview {
  const byPlatform: Record<string, number> = {};
  const byFormat: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const item of items) {
    if (item.platform) byPlatform[item.platform] = (byPlatform[item.platform] || 0) + 1;
    if (item.format) byFormat[item.format] = (byFormat[item.format] || 0) + 1;
    byStatus[item.status] = (byStatus[item.status] || 0) + 1;
  }

  const topPerformers = [...items]
    .filter((i) => i.engagementScore != null && i.engagementScore > 0)
    .sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0))
    .slice(0, 5)
    .map((i) => i.topic);

  const existingTopics = items.map((i) => i.topic).slice(0, 35);

  const coverageGaps: string[] = [];
  if (targetPlatforms?.length) {
    for (const p of targetPlatforms) {
      if (!byPlatform[p]) coverageGaps.push(`Brak treści na ${p} — strategia powinna to uzupełnić`);
    }
  }

  const formatKeys = Object.keys(byFormat);
  if (!formatKeys.includes(GenerationType.Video)) {
    coverageGaps.push('Brak wideo/reels w dotychczasowych treściach');
  }
  if (!formatKeys.includes(GenerationType.PostWithImage) && items.length > 3) {
    coverageGaps.push('Mało postów graficznych w historii');
  }

  const repetitiveThemes = detectRepetitiveThemes(items.map((i) => i.topic));

  const upcomingScheduled = items.filter((i) => i.status === 'scheduled' || i.status === 'planned').length;

  return {
    items: items.slice(0, 40),
    existingTopics,
    topPerformers,
    coverageGaps,
    repetitiveThemes,
    upcomingScheduled,
    byPlatform,
    byFormat,
    byStatus,
    totalCount: items.length,
  };
}

function detectRepetitiveThemes(topics: string[]): string[] {
  const themes: string[] = [];
  for (let i = 0; i < topics.length; i++) {
    for (let j = i + 1; j < topics.length; j++) {
      const sim = checkForSimilarContent(topics[i], [
        { id: String(j), formData: { topic: topics[j] }, timestamp: 0 },
      ], 0.45);
      if (sim.hasSimilar && sim.mostSimilar) {
        const label = topics[i].slice(0, 50);
        if (!themes.some((t) => t.includes(label.slice(0, 20)))) {
          themes.push(`Powtarzalny motyw: „${label}…”`);
        }
      }
    }
    if (themes.length >= 5) break;
  }
  return themes;
}

export function buildInventoryPromptForAudit(review: ContentInventoryReview): string {
  const lines: string[] = [
    `INVENTORY: ${review.totalCount} treści (wygenerowane, zaplanowane, opublikowane)`,
    `Statusy: ${JSON.stringify(review.byStatus)}`,
    `Platformy: ${JSON.stringify(review.byPlatform)}`,
    `Formaty: ${JSON.stringify(review.byFormat)}`,
    `Zaplanowane/w kolejce: ${review.upcomingScheduled}`,
  ];

  if (review.topPerformers.length) {
    lines.push(`Najlepiej działające tematy (kontynuuj w podobnym stylu, nie kopiuj 1:1):\n${review.topPerformers.map((t) => `- ${t}`).join('\n')}`);
  }

  if (review.repetitiveThemes.length) {
    lines.push(`Unikaj powtórzeń:\n${review.repetitiveThemes.map((t) => `- ${t}`).join('\n')}`);
  }

  if (review.coverageGaps.length) {
    lines.push(`Luki do wypełnienia:\n${review.coverageGaps.map((g) => `- ${g}`).join('\n')}`);
  }

  lines.push('Ostatnie i zaplanowane tematy (NIE powtarzaj w actionablePlan):');
  for (const item of review.items.slice(0, 25)) {
    lines.push(
      `- [${item.status}/${item.source}${item.platform ? `/${item.platform}` : ''}] ${item.date || '?'}: ${item.topic}`
    );
  }

  return lines.join('\n');
}

export function dedupePlanAgainstInventory(
  plan: IntelligentCalendarPlanItem[],
  review: ContentInventoryReview,
  threshold = 0.38
): { plan: IntelligentCalendarPlanItem[]; skippedTopics: string[] } {
  const historyLike = review.items.map((i) => ({
    id: i.id,
    formData: { topic: i.topic, platform: i.platform },
    timestamp: Date.now(),
  }));

  const skippedTopics: string[] = [];
  const kept: IntelligentCalendarPlanItem[] = [];

  for (const slot of plan) {
    const check = checkForSimilarContent(slot.topic, historyLike, threshold);
    if (check.hasSimilar) {
      skippedTopics.push(slot.topic);
      kept.push({
        ...slot,
        strategy: `${slot.strategy} [Dopasowanie: nowy kąt — uniknięto powtórzenia z istniejących treści]`,
      });
    } else {
      kept.push(slot);
    }
  }

  return { plan: kept, skippedTopics };
}
