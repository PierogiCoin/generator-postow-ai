import { callApi, getApiAuthHeaders, getApiBaseUrl } from './apiClient';
import { Platform } from '../types';
import { STORAGE_KEYS } from '../utils/storageUtils';

export type IntelligenceSource = { title: string; url: string };

export type IntelligenceNewsItem = {
  title: string;
  summary: string;
  angle: string;
  sourceTitle?: string;
  sourceUrl?: string;
  publishedHint?: string;
  relevance?: number;
  competitorMention?: string | null;
};

export type IntelligenceTrend = {
  topic: string;
  category?: string;
  momentum: 'rising' | 'peak' | 'falling' | 'stable';
  engagementScore: number;
  volumeScore: number;
  competitionLevel: 'low' | 'medium' | 'high';
  predictedLifespan: 'short' | 'medium' | 'long';
  relatedHashtags: string[];
  bestPlatforms: string[];
  contentIdeas: string[];
  whyItsTrending: string;
  actionUrgency: 'now' | 'soon' | 'watch';
  contentGap?: string;
};

export type CompetitorHourlyActivity = {
  weekday: number;
  hour: number;
  density: number;
  note?: string;
  handles?: string[];
};

export type DeepCompetitorAnalysis = {
  handle: string;
  platform: string;
  estimated?: boolean;
  topHashtags: string[];
  hashtagStrategy: string;
  hashtagPatterns: string[];
  hashtagRecommendations: string[];
  hourlyActivity?: CompetitorHourlyActivity[];
  bestPostingTimes: string[];
  worstPostingTimes: string[];
  timingGaps: string[];
  timingRecommendation: string;
  contentThemes: string[];
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  contentGaps?: string[];
  recentNewsAngles?: { title: string; angle: string; url?: string }[];
  summary: string;
};

export type HeatmapCell = {
  weekday: number;
  hour: number;
  samples: number;
  avgScore: number;
};

export type GapSlotResult = {
  weekday: number;
  hour: number;
  gapScore: number;
  reason: string;
  competitorDensity: number;
  userPerformance?: number;
  label: string;
  time: string;
};

export type ScheduleGapAnalysis = {
  timezone: string;
  niche: string;
  platform: string;
  userSamples: number;
  gapSlots: GapSlotResult[];
  aiTimingGaps: string[];
  recommendation: string;
  sources: IntelligenceSource[];
  computedAt: string;
};

const GAP_CACHE_KEY = 'so_intelligence_gap_hours';
const GAP_CACHE_TTL = 24 * 60 * 60 * 1000;

function gapCacheKey(userId: string, platform: string): string {
  return `${userId}|${platform}`;
}

export function cacheGapHours(userId: string, platform: string, slots: GapSlotResult[]): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(GAP_CACHE_KEY);
    const map: Record<string, { slots: GapSlotResult[]; cachedAt: number }> = raw ? JSON.parse(raw) : {};
    map[gapCacheKey(userId, platform)] = { slots, cachedAt: Date.now() };
    localStorage.setItem(GAP_CACHE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getCachedGapHours(userId: string, platform: string): GapSlotResult[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GAP_CACHE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, { slots: GapSlotResult[]; cachedAt: number }>;
    const hit = map[gapCacheKey(userId, platform)];
    if (!hit || Date.now() - hit.cachedAt > GAP_CACHE_TTL) return null;
    return hit.slots;
  } catch {
    return null;
  }
}

export async function fetchIntelligenceNews(
  niche: string,
  platform: Platform,
  userId: string
): Promise<{ items: IntelligenceNewsItem[]; industryPulse: string; sources: IntelligenceSource[]; searchedAt?: string }> {
  return callApi('intelligence/news', { niche, platform }, userId);
}

export async function fetchIntelligenceTrends(
  niche: string,
  platform: Platform,
  userId: string,
  depth: 'quick' | 'deep' = 'deep'
): Promise<{
  trends: IntelligenceTrend[];
  contentGaps: string[];
  avoidTopics: string[];
  sources: IntelligenceSource[];
}> {
  return callApi('intelligence/trends', { niche, platform, depth }, userId);
}

export async function analyzeCompetitorDeep(
  handle: string,
  platform: Platform,
  niche: string,
  userId: string
): Promise<{ analysis: DeepCompetitorAnalysis; sources: IntelligenceSource[] }> {
  return callApi('intelligence/competitor', { handle, platform, niche }, userId);
}

export async function analyzeCompetitorBatch(
  handles: string[],
  platform: Platform,
  niche: string,
  userId: string
): Promise<{ batch: Record<string, unknown>; sources: IntelligenceSource[]; analyzedAt?: string }> {
  return callApi('intelligence/competitor-batch', { handles, platform, niche }, userId);
}

export async function analyzeScheduleGaps(
  niche: string,
  platform: Platform,
  userId: string,
  options?: {
    competitorHandles?: string[];
    timezone?: string;
    contentType?: string;
  }
): Promise<ScheduleGapAnalysis> {
  const result: ScheduleGapAnalysis = await callApi(
    'intelligence/schedule-gaps',
    {
      niche,
      platform,
      competitorHandles: options?.competitorHandles || [],
      timezone: options?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      contentType: options?.contentType || 'post',
    },
    userId
  );

  if (result.gapSlots?.length) {
    cacheGapHours(userId, platform, result.gapSlots);
  }
  return result;
}

export async function fetchUserBestTimes(
  userId: string,
  timezone?: string
): Promise<{ heatmap: HeatmapCell[]; topSlots: HeatmapCell[]; samples: number; timezone?: string; note?: string }> {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const headers = await getApiAuthHeaders(userId);
  const response = await fetch(`${getApiBaseUrl()}/api/social/best-times?limit=400`, {
    headers: { ...headers, 'x-timezone': tz },
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Nie udało się pobrać heatmapy publikacji');
  }
  return response.json();
}

/** Preferowane godziny slotów z analizy luk (fallback: stałe) */
export function getPreferredGapTimes(userId: string, platform: Platform): string[] {
  const cached = getCachedGapHours(userId, platform);
  if (!cached?.length) return [];
  return cached.slice(0, 6).map((s) => s.time);
}

export { GAP_CACHE_KEY as INTELLIGENCE_GAP_CACHE_KEY };
