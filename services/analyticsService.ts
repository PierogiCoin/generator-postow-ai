import type { CampaignHistoryItem, AIInsight, OptimalTime, PostPerformanceData } from '../types';
import { STORAGE_KEYS } from '../utils/storageUtils';
import type { SocialPost } from '../types/socialPublishing';

import { generateJson } from './apiClient';

/** Puste metryki — bez udawania wyników (legacy mock usunięty). */
const emptyPerformance = (): PostPerformanceData => ({
  reach: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  metricsSource: 'estimated',
});

/** Czy obiekt metryk zawiera przynajmniej jedno pole liczbowe z API (w tym 0). */
export function hasLiveMetrics(
  metrics?: SocialPost['metrics'] | PostPerformanceData | null
): boolean {
  if (!metrics) return false;
  const keys = ['likes', 'comments', 'shares', 'views', 'reach', 'impressions'] as const;
  return keys.some((k) => {
    const v = (metrics as Record<string, unknown>)[k];
    return typeof v === 'number' && Number.isFinite(v);
  });
}

/** @deprecated Używa zer zamiast fałszywych liczb — zachowane dla kompatybilności importów. */
export const generateMockPerformanceData = (history: CampaignHistoryItem[]): CampaignHistoryItem[] => {
  return history.map((item) => ({
    ...item,
    performance: emptyPerformance(),
  }));
};

const normalizeText = (text: string) =>
  text.replace(/<[^>]*>?/gm, '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);

function extractPublishedUrl(item: CampaignHistoryItem): string | null {
  const meta = (item.result as { metadata?: { published_url?: string } })?.metadata;
  const fromMeta = meta?.published_url;
  if (typeof fromMeta === 'string' && fromMeta.trim()) return fromMeta.trim();
  return null;
}

export function findSocialMatch(
  item: CampaignHistoryItem,
  socialPosts: SocialPost[]
): SocialPost | undefined {
  const publishedUrl = extractPublishedUrl(item);
  if (publishedUrl) {
    const byUrl = socialPosts.find(
      (sp) => sp.url && (sp.url === publishedUrl || publishedUrl.includes(sp.platformPostId))
    );
    if (byUrl) return byUrl;
  }

  const topic = normalizeText(item.formData?.topic || item.result?.postText || '');
  if (!topic) return undefined;

  return socialPosts.find((sp) => {
    const content = normalizeText(sp.content || '');
    if (!content) return false;
    return content.includes(topic.slice(0, 40)) || topic.includes(content.slice(0, 40));
  });
}

/**
 * Preferuje metryki z podłączonych kont social (social_posts.metrics).
 * Brak kont / brak dopasowania / match bez realnych pól API → zera + estimated.
 */
export const enrichHistoryWithLiveMetrics = (
  history: CampaignHistoryItem[],
  socialPosts: SocialPost[]
): {
  items: CampaignHistoryItem[];
  liveMatched: number;
  estimatedCount: number;
  matchedSocialIds: string[];
} => {
  let liveMatched = 0;
  let estimatedCount = 0;
  const matchedSocialIds: string[] = [];

  const items = history.map((item) => {
    if (!socialPosts.length) {
      estimatedCount += 1;
      return { ...item, performance: emptyPerformance() };
    }

    const match = findSocialMatch(item, socialPosts);
    if (!match) {
      estimatedCount += 1;
      return { ...item, performance: emptyPerformance() };
    }

    matchedSocialIds.push(match.id);

    if (!hasLiveMetrics(match.metrics)) {
      estimatedCount += 1;
      return { ...item, performance: emptyPerformance() };
    }

    const likes = match.metrics?.likes ?? 0;
    const comments = match.metrics?.comments ?? 0;
    const shares = match.metrics?.shares ?? 0;
    const reach =
      match.metrics?.reach ??
      match.metrics?.impressions ??
      match.metrics?.views ??
      0;

    liveMatched += 1;
    return {
      ...item,
      performance: {
        reach,
        likes,
        comments,
        shares,
        metricsSource: 'live' as const,
      },
    };
  });

  return { items, liveMatched, estimatedCount, matchedSocialIds };
};

export type AnalyticsKpiSummary = {
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  /** Unikalne źródła z realnymi metrykami API (bez podwójnego liczenia). */
  liveCount: number;
  /** Szkice bez matcha / bez live metrics. */
  estimatedCount: number;
  /** Posty z kont bez pól metryk (np. LinkedIn/TikTok). */
  noDataCount: number;
};

/**
 * Sumuje KPI tylko z Live, bez podwójnego liczenia szkicu + tego samego posta social.
 */
export function aggregateAnalyticsKpis(
  drafts: CampaignHistoryItem[],
  socialPosts: SocialPost[],
  matchedSocialIds: string[] = []
): AnalyticsKpiSummary {
  const matched = new Set(matchedSocialIds);
  let reach = 0;
  let likes = 0;
  let comments = 0;
  let shares = 0;
  let liveCount = 0;
  let estimatedCount = 0;
  let noDataCount = 0;

  for (const draft of drafts) {
    if (draft.performance?.metricsSource === 'live') {
      liveCount += 1;
      reach += draft.performance.reach || 0;
      likes += draft.performance.likes || 0;
      comments += draft.performance.comments || 0;
      shares += draft.performance.shares || 0;
    } else {
      estimatedCount += 1;
    }
  }

  for (const post of socialPosts) {
    if (matched.has(post.id)) continue;
    if (hasLiveMetrics(post.metrics)) {
      liveCount += 1;
      reach += post.metrics?.reach ?? post.metrics?.impressions ?? post.metrics?.views ?? 0;
      likes += post.metrics?.likes ?? 0;
      comments += post.metrics?.comments ?? 0;
      shares += post.metrics?.shares ?? 0;
    } else {
      noDataCount += 1;
    }
  }

  return { reach, likes, comments, shares, liveCount, estimatedCount, noDataCount };
}

export interface AIAnalysisResult {
  insights: AIInsight[];
  optimalTimes: OptimalTime[];
  /** true = Gemini niedostępne; UI nie powinno traktować tego jak realnej analizy */
  unavailable?: boolean;
}

export type StrategySuggestion = {
  date: string;
  platform: string;
  topic: string;
  reason: string;
};

export interface AnalyticsAnalysisCache {
  userId: string;
  analyzedAt: number;
  insights: AIInsight[];
  optimalTimes: OptimalTime[];
  strategySuggestions: StrategySuggestion[];
  unavailable: boolean;
}

const ANALYTICS_CACHE_PREFIX = STORAGE_KEYS.ANALYTICS_ANALYSIS;

function analyticsCacheKey(userId: string): string {
  return `${ANALYTICS_CACHE_PREFIX}${userId || 'anonymous'}`;
}

export function loadAnalyticsCache(userId: string): AnalyticsAnalysisCache | null {
  try {
    const raw = localStorage.getItem(analyticsCacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AnalyticsAnalysisCache;
    if (!parsed || parsed.userId !== userId) return null;
    if (!Array.isArray(parsed.insights)) return null;
    return {
      userId: parsed.userId,
      analyzedAt: typeof parsed.analyzedAt === 'number' ? parsed.analyzedAt : Date.now(),
      insights: parsed.insights,
      optimalTimes: Array.isArray(parsed.optimalTimes) ? parsed.optimalTimes : [],
      strategySuggestions: Array.isArray(parsed.strategySuggestions) ? parsed.strategySuggestions : [],
      unavailable: Boolean(parsed.unavailable),
    };
  } catch {
    return null;
  }
}

export function saveAnalyticsCache(cache: AnalyticsAnalysisCache): void {
  try {
    localStorage.setItem(analyticsCacheKey(cache.userId), JSON.stringify(cache));
  } catch {
    // quota / private mode — ignore
  }
}

export function clearAnalyticsCache(userId: string): void {
  try {
    localStorage.removeItem(analyticsCacheKey(userId));
  } catch {
    // ignore
  }
}

/**
 * Pobiera prawdziwą analizę AI na podstawie danych o wydajności postów.
 */
export const fetchAIAnalysis = async (
  analyzedHistory: CampaignHistoryItem[],
  userId: string,
  socialHistory: SocialPost[] = []
): Promise<AIAnalysisResult> => {
  try {
    const allDataSummary = {
      generatedPosts: analyzedHistory.map((item) => ({
        id: item.id,
        topic: item.formData.topic,
        platform: item.formData.platform,
        contentType: item.formData.contentType,
        tone: item.formData.tone,
        performance: item.performance,
        metricsSource: item.performance?.metricsSource,
        timestamp: item.timestamp,
        source: 'local_history',
      })),
      socialMediaPosts: socialHistory.map((item) => ({
        id: item.id,
        content: item.content?.substring(0, 100),
        platform: item.platform,
        metrics: item.metrics,
        hasLiveMetrics: hasLiveMetrics(item.metrics),
        publishedAt: item.publishedAt,
        source: 'social_media_platform',
      })),
    };

    const result = await generateJson<AIAnalysisResult>(
      {
        model: 'gemini-flash-latest',
        contents: `Jesteś ekspertem od analityki social media.
            
            Oto dane dotyczące historii postów użytkownika (zarówno wygenerowanych lokalnie, jak i rzeczywistych z platform):
            ${JSON.stringify(allDataSummary, null, 2)}
            
            Twoim zadaniem jest:
            1. Wygenerować 3-4 konkretne wskazówki (insights) o typie 'positive', 'suggestion' lub 'observation'. 
               Priorytetyzuj wnioski oparte na RZECZYWISTYCH danych z platform społecznościowych (source: social_media_platform)
               oraz postach z metricsSource=live / hasLiveMetrics=true. Nie traktuj metricsSource=estimated ani postów bez metryk jako faktów.
            2. Określić optymalne czasy publikacji (optimalTimes) na podstawie dat publikacji rzeczywistych postów i ich wyników.
            
            Zwróć wynik w formacie JSON zgodnym z interfejsem:
            {
                "insights": [{"id": "string", "type": "positive|suggestion|observation", "text": "string"}],
                "optimalTimes": [{"platform": "string", "day": "string", "time": "string"}]
            }
            Wskazówki muszą być w języku POLSKIM i odnosić się do konkretnych trendów w danych. Pomijaj posty o tytule "Bez tytułu" lub pustej treści. Optymalne czasy powinny być zróżnicowane i logiczne dla danej platformy.`,
      },
      userId
    );

    return {
      insights: Array.isArray(result.insights) ? result.insights : [],
      optimalTimes: Array.isArray(result.optimalTimes) ? result.optimalTimes : [],
      unavailable: false,
    };
  } catch {
    // Bez gotowych tipów — UI pokazuje stan błędu, nie fake analizę
    return {
      insights: [],
      optimalTimes: [],
      unavailable: true,
    };
  }
};

/**
 * Generuje propozycje nowych postów na podstawie przeprowadzonej analizy.
 */
export const generateStrategySuggestions = async (
  analysis: AIAnalysisResult,
  userId: string,
  historySummary: unknown[]
): Promise<StrategySuggestion[]> => {
  if (analysis.unavailable) return [];

  try {
    const result = await generateJson<{
      suggestions: { date: string; platform: string; topic: string; reason: string }[];
    }>(
      {
        model: 'gemini-flash-latest',
        contents: `Na podstawie analizy wydajności postów:
            INSIGHTS: ${JSON.stringify(analysis.insights)}
            OPTIMAL TIMES: ${JSON.stringify(analysis.optimalTimes)}
            HISTORY SUMMARY: ${JSON.stringify(historySummary.slice(0, 10))}
            
            Zaproponuj 3 konkretne pomysły na nowe posty na najbliższe dni. 
            Uwzględnij dotychczasowe wyniki (co działało, a co nie). 
            Unikaj powtarzania tematów "Bez tytułu".
            
            Zwróć JSON:
            {
              "suggestions": [
                { "date": "YYYY-MM-DD", "platform": "string", "topic": "string", "reason": "dlaczego ten temat i czas są dobre na podstawie analizy" }
              ]
            }
            Język: POLSKI.`,
      },
      userId
    );

    return result.suggestions || [];
  } catch {
    return [];
  }
};
