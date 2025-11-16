import type { CampaignHistoryItem, AIInsight, OptimalTime, Platform } from '../types';
import { ContentType, Tone } from '../types';

/**
 * Generuje symulowane dane o wydajności dla historii postów.
 * W prawdziwej aplikacji te dane pochodziłyby z API mediów społecznościowych.
 */
export const generateMockPerformanceData = (history: CampaignHistoryItem[]): CampaignHistoryItem[] => {
  return history.map(item => {
    // Podstawowe wartości metryk
    let baseReach = 5000;
    let baseLikes = 200;
    let baseComments = 20;
    let baseShares = 10;

    // Modyfikatory w oparciu o właściwości posta (symulacja trendów)
    if (item.formData.contentType === ContentType.Advertisement) baseReach *= 2.5;
    if (item.formData.tone === Tone.Witty) baseComments *= 1.5;
    if (item.formData.tone === Tone.Inspirational) baseShares *= 1.8;
    if (item.result.videoUrl) {
        baseReach *= 3;
        baseLikes *= 2;
    }

    // Dodaj losowość, aby dane wyglądały bardziej naturalnie
    const randomize = (value: number) => value * (0.8 + Math.random() * 0.4);

    return {
      ...item,
      performance: {
        reach: Math.floor(randomize(baseReach)),
        likes: Math.floor(randomize(baseLikes)),
        comments: Math.floor(randomize(baseComments)),
        shares: Math.floor(randomize(baseShares)),
      },
    };
  });
};

interface AIAnalysisResult {
    insights: AIInsight[];
    optimalTimes: OptimalTime[];
}

/**
 * Pobiera symulowaną analizę AI na podstawie danych o wydajności postów.
 */
export const fetchAIAnalysis = async (analyzedHistory: CampaignHistoryItem[]): Promise<AIAnalysisResult> => {
    console.log(`Pobieranie symulowanej analizy AI dla ${analyzedHistory.length} postów.`);
    return new Promise(resolve => {
        setTimeout(() => {
            const result: AIAnalysisResult = {
                insights: [
                    { id: '1', type: 'positive', text: 'Posty wideo (mock) generują o 50% większe zaangażowanie. Kontynuuj ten format!' },
                    { id: '2', type: 'suggestion', text: 'Spróbuj (mock) publikować więcej treści w weekendy, aby dotrzeć do szerszej publiczności.' },
                    { id: '3', type: 'observation', text: 'Ton "Dowcipny" (mock) uzyskuje najwięcej komentarzy.' },
                ],
                optimalTimes: [
                    { platform: 'Facebook' as Platform, day: 'Piątek', time: '14:00' },
                    { platform: 'Instagram' as Platform, day: 'Środa', time: '11:00' },
                ]
            };
            resolve(result);
        }, 1500);
    });
};
