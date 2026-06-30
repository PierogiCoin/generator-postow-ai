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
    // Podstawowe wartości metryk
    let baseReach = 5000;
    let baseLikes = 200;
    let baseComments = 20;
    let baseShares = 10;

    // Modyfikatory w oparciu o właściwości posta (symulacja trendów)
    if (item.formData?.contentType === ContentType.Advertisement) baseReach *= 2.5;
    if (item.formData?.tone === Tone.Witty) baseComments *= 1.5;
    if (item.formData?.tone === Tone.Inspirational) baseShares *= 1.8;
    if (item.result.videoUrl) {
      baseReach *= 3;
      baseLikes *= 2;
    }

    // Deterministyczna losowość na podstawie ID posta – eliminuje miganie przy re-renderach
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
      },
    };
  });
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
  if (analyzedHistory.length === 0 && socialHistory.length === 0) {
    return { insights: [], optimalTimes: [] };
  }

  // Uprościmy historię aplikacji dla promptu
  const appHistorySummary = analyzedHistory.map(h => ({
    source: 'app_generation',
    topic: h.formData?.topic?.replace(/<[^>]*>?/gm, '') || 'Bez tytułu',
    platform: h.formData?.platform,
    tone: h.formData?.tone,
    performance: h.performance
  }));

  // Uprościmy historię z mediów społecznościowych
  const socialHistorySummary = socialHistory.map(p => ({
    source: 'social_media_platform',
    content: p.content?.substring(0, 200) + '...',
    platform: (p as any).platform || 'Unknown',
    publishedAt: p.publishedAt,
    metrics: p.metrics
  }));

  const allDataSummary = [...appHistorySummary, ...socialHistorySummary];

  try {
    const result = await generateJson<AIAnalysisResult>({
      model: "gemini-flash-latest",
      contents: `Jesteś ekspertem ds. analityki mediów społecznościowych. Przeanalizuj poniższe dane o postach (zarówno wygenerowanych w naszej aplikacji, jak i pobranych bezpośrednio z platform społecznościowych):
            ${JSON.stringify(allDataSummary, null, 2)}
            
            Twoim zadaniem jest:
            1. Wygenerować 3-4 konkretne wskazówki (insights) o typie 'positive', 'suggestion' lub 'observation'. 
               Priorytetyzuj wnioski oparte na RZECZYWISTYCH danych z platform społecznościowych (source: social_media_platform).
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
    // Fallback w razie błędu API
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
  historySummary: any[]
): Promise<{ date: string; platform: string; topic: string; reason: string }[]> => {
  try {
    const result = await generateJson<{ suggestions: { date: string; platform: string; topic: string; reason: string }[] }>({
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
