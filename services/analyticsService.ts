import type { CampaignHistoryItem, AIInsight, OptimalTime, Platform } from '../types';
import { ContentType, Tone } from '../types';
import type { SocialPost } from '../types/socialPublishing';

import { generateJson } from './apiClient';

/**
 * Generuje symulowane dane o wydajności dla historii postów.
 * W prawdziwej aplikacji te dane pochodziłyby z API mediów społecznościowych.
 */
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
};

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const generateMockPerformanceData = (history: CampaignHistoryItem[]): CampaignHistoryItem[] => {
  return history.map(item => {
    let baseReach = 5000;
    let baseLikes = 200;
    let baseComments = 20;
    let baseShares = 10;

    if (item.formData?.contentType === ContentType.Advertisement) baseReach *= 2.5;
    if (item.formData?.tone === Tone.Witty) baseComments *= 1.5;
    if (item.formData?.tone === Tone.Inspirational) baseShares *= 1.8;
    if (item.result.videoUrl) {
      baseReach *= 3;
      baseLikes *= 2;
    }

    const seed = hashString(item.id);
    const randomize = (value: number, offset: number) =>
      value * (0.8 + seededRandom(seed + offset) * 0.4);

    return {
      ...item,
      performance: {
        reach: Math.floor(randomize(baseReach, 0)),
        likes: Math.floor(randomize(baseLikes, 1)),
        comments: Math.floor(randomize(baseComments, 2)),
        shares: Math.floor(randomize(baseShares, 3)),
        metricsSource: 'estimated' as const,
      },
    };
  });
};

const normalizeText = (text: string) =>
  text.replace(/<[^>]*>?/gm, '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);

function extractPublishedUrl(item: CampaignHistoryItem): string | null {
  const meta = (item.result as { metadata?: { published_url?: string } })?.metadata;
  const fromMeta = meta?.published_url;
  if (typeof fromMeta === 'string' && fromMeta.trim()) return fromMeta.trim();
  return null;
}

function findSocialMatch(
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
 * Preferuje metryki z podłączonych kont social.
 * Brak kont → puste metryki (bez udawania live).
 * Brak dopasowania przy obecnych kontach → estimated (oznaczone).
 */
export const enrichHistoryWithLiveMetrics = (
  history: CampaignHistoryItem[],
  socialPosts: SocialPost[]
): { items: CampaignHistoryItem[]; liveMatched: number; estimatedCount: number } => {
  if (!socialPosts.length) {
    return {
      items: history.map((item) => ({
        ...item,
        performance: {
          reach: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          metricsSource: 'estimated' as const,
        },
      })),
      liveMatched: 0,
      estimatedCount: history.length,
    };
  }

  const withMock = generateMockPerformanceData(history);
  let liveMatched = 0;
  let estimatedCount = 0;

  const items = withMock.map((item) => {
    const match = findSocialMatch(item, socialPosts);
    if (!match) {
      estimatedCount += 1;
      return {
        ...item,
        performance: {
          ...item.performance!,
          metricsSource: 'estimated' as const,
        },
      };
    }

    const likes = match.metrics?.likes ?? (match as { likes?: number }).likes;
    const comments = match.metrics?.comments ?? (match as { comments?: number }).comments;
    const shares = match.metrics?.shares ?? (match as { shares?: number }).shares;
    const reach =
      match.metrics?.reach ??
      match.metrics?.impressions ??
      (match as { reach?: number }).reach ??
      (match as { impressions?: number }).impressions;

    const hasLive =
      typeof likes === 'number' ||
      typeof comments === 'number' ||
      typeof shares === 'number' ||
      typeof reach === 'number';
    if (!hasLive) {
      estimatedCount += 1;
      return {
        ...item,
        performance: {
          ...item.performance!,
          metricsSource: 'estimated' as const,
        },
      };
    }

    liveMatched += 1;
    return {
      ...item,
      performance: {
        reach: reach ?? 0,
        likes: likes ?? 0,
        comments: comments ?? 0,
        shares: shares ?? 0,
        metricsSource: 'live' as const,
      },
    };
  });

  return { items, liveMatched, estimatedCount };
};

interface AIAnalysisResult {
  insights: AIInsight[];
  optimalTimes: OptimalTime[];
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
      generatedPosts: analyzedHistory.map(item => ({
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
      socialMediaPosts: socialHistory.map(item => ({
        id: item.id,
        content: item.content?.substring(0, 100),
        platform: item.platform,
        metrics: item.metrics,
        publishedAt: item.publishedAt,
        source: 'social_media_platform',
      })),
    };

    const result = await generateJson<AIAnalysisResult>({
      model: "gemini-flash-latest",
      contents: `Jesteś ekspertem od analityki social media.
            
            Oto dane dotyczące historii postów użytkownika (zarówno wygenerowanych lokalnie, jak i rzeczywistych z platform):
            ${JSON.stringify(allDataSummary, null, 2)}
            
            Twoim zadaniem jest:
            1. Wygenerować 3-4 konkretne wskazówki (insights) o typie 'positive', 'suggestion' lub 'observation'. 
               Priorytetyzuj wnioski oparte na RZECZYWISTYCH danych z platform społecznościowych (source: social_media_platform)
               oraz postach z metricsSource=live. Nie traktuj metricsSource=estimated jako faktów.
            2. Określić optymalne czasy publikacji (optimalTimes) na podstawie dat publikacji rzeczywistych postów i ich wyników.
            
            Zwróć wynik w formacie JSON zgodnym z interfejsem:
            {
                "insights": [{"id": "string", "type": "positive|suggestion|observation", "text": "string"}],
                "optimalTimes": [{"platform": "string", "day": "string", "time": "string"}]
            }
            Wskazówki muszą być w języku POLSKIM i odnosić się do konkretnych trendów w danych. Pomijaj posty o tytule "Bez tytułu" lub pustej treści. Optymalne czasy powinny być zróżnicowane i logiczne dla danej platformy.`
    }, userId);

    return result;
  } catch {
    return {
      insights: [
        { id: 'err-1', type: 'observation', text: 'Analiza w czasie rzeczywistym tymczasowo niedostępna. Wykorzystano dane archiwalne.' },
        { id: 'err-2', type: 'suggestion', text: 'Opierając się na trendach rynkowych, posty z wideo angażują o 40% lepiej niż same obrazy.' }
      ],
      optimalTimes: [
        { platform: 'Facebook' as Platform, day: 'Wtorek', time: '18:00' },
        { platform: 'Instagram' as Platform, day: 'Czwartek', time: '20:00' }
      ]
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
): Promise<{ date: string; platform: string; topic: string; reason: string }[]> => {
  try {
    const result = await generateJson<{
      suggestions: { date: string; platform: string; topic: string; reason: string }[];
    }>({
      model: "gemini-flash-latest",
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
            Język: POLSKI.`
    }, userId);

    return result.suggestions;
  } catch {
    return [];
  }
};
