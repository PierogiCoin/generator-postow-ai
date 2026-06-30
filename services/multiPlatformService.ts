import { Platform, Tone } from '../types';
import type { PlatformOptimization } from '../components/MultiPlatformOptimizer';
import { getApiBaseUrl } from './apiClient';

export interface MultiPlatformRequest {
  originalText: string;
  originalPlatform: Platform;
  targetPlatforms: Platform[];
  tone: Tone;
  hashtags?: string[];
}

export const optimizeForPlatforms = async (
  request: MultiPlatformRequest,
  userId?: string
): Promise<PlatformOptimization[]> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/optimize-multi-platform`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId || ''
      },
      credentials: 'include',
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Nie udało się zoptymalizować dla platform');
    }
    return response.json();
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError')
      throw new Error('Przekroczono czas oczekiwania (30s). Spróbuj ponownie.');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

export const getPlatformCharacterLimit = (platform: Platform): number => {
  const limits: Record<Platform, number> = {
    [Platform.X]: 280,
    [Platform.LinkedIn]: 3000,
    [Platform.Instagram]: 2200,
    [Platform.Facebook]: 63206,
    [Platform.TikTok]: 2200,
    [Platform.YouTube]: 5000
  };

  return limits[platform];
};

export const getPlatformHashtagCount = (platform: Platform): { min: number; max: number } => {
  const counts: Record<Platform, { min: number; max: number }> = {
    [Platform.X]: { min: 1, max: 3 },
    [Platform.LinkedIn]: { min: 3, max: 5 },
    [Platform.Instagram]: { min: 5, max: 30 },
    [Platform.Facebook]: { min: 2, max: 5 },
    [Platform.TikTok]: { min: 3, max: 5 },
    [Platform.YouTube]: { min: 3, max: 15 }
  };

  return counts[platform];
};

export const getPlatformBestPractices = (platform: Platform): string[] => {
  const practices: Record<Platform, string[]> = {
    [Platform.X]: [
      'Używaj wątków dla dłuższych treści',
      'Max 2-3 hashtagi',
      'Angażuj się w konwersacjach',
      'Używaj GIF-ów i emoji',
      'Pytania zwiększają engagement'
    ],
    [Platform.LinkedIn]: [
      'Profesjonalny i wartościowy content',
      'Storytelling działa najlepiej',
      'Używaj nagłówków i bullet pointów',
      'Taguj osoby i firmy',
      'Publikuj w godzinach pracy (8-17)'
    ],
    [Platform.Instagram]: [
      'Hashtagi umieszczaj na końcu lub w komentarzu',
      'Pierwsze 125 znaków to preview',
      'Używaj emoji i formatowania',
      'Call to action jest kluczowy',
      'Zadawaj pytania w caption'
    ],
    [Platform.Facebook]: [
      'Pierwsze 3 linijki to najważniejsze',
      'Krótsze posty (1-2 akapity) działają lepiej',
      'Zadawaj pytania dla engagement',
      'Używaj list i formatowania',
      'Video i obrazki zwiększają zasięg'
    ],
    [Platform.TikTok]: [
      'Używaj trendujących hashtagów',
      'Krótko i zwięźle',
      'Emoji i slang młodzieżowy',
      'Call to action na początku',
      'Hashtag challenge dla virala'
    ],
    [Platform.YouTube]: [
      'Pierwsze 2-3 zdania to hook',
      'Używaj timestamps',
      'Keywords dla SEO',
      'CTA w opisie i na końcu',
      'Linki do social mediów i strony'
    ]
  };

  return practices[platform];
};

export const predictEngagement = (
  text: string,
  platform: Platform,
  hashtags: string[]
): { score: number; prediction: string } => {
  let score = 50;

  const charLimit = getPlatformCharacterLimit(platform);
  const textLength = text.length;
  const hashtagCount = hashtags.length;
  const hashtagRange = getPlatformHashtagCount(platform);

  // Character count optimization
  if (platform === Platform.X) {
    if (textLength >= 240 && textLength <= 280) score += 15;
    else if (textLength > 280) score -= 30;
  } else if (platform === Platform.LinkedIn) {
    if (textLength >= 1000 && textLength <= 2000) score += 10;
  } else if (platform === Platform.Instagram) {
    if (textLength >= 500 && textLength <= 1500) score += 10;
  } else if (platform === Platform.Facebook) {
    if (textLength >= 40 && textLength <= 300) score += 15;
    else if (textLength > 1000) score -= 10;
  } else if (platform === Platform.TikTok) {
    if (textLength >= 20 && textLength <= 150) score += 15;
    else if (textLength > 500) score -= 10;
  }

  // Hashtag optimization
  if (hashtagCount >= hashtagRange.min && hashtagCount <= hashtagRange.max) {
    score += 10;
  } else if (hashtagCount > hashtagRange.max) {
    score -= 5;
  }

  // Content analysis
  const hasQuestion = /\?/.test(text);
  const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(text);
  const hasCTA = /(kliknij|zobacz|sprawdź|dowiedz się|link|bio|komentarz)/i.test(text);

  if (hasQuestion) score += 8;
  if (hasEmoji) score += 7;
  if (hasCTA) score += 10;

  // Line breaks (good for readability)
  const lineBreaks = (text.match(/\n/g) || []).length;
  if (lineBreaks >= 2 && lineBreaks <= 5) score += 5;

  score = Math.min(Math.max(score, 0), 100);

  let prediction = '';
  if (score >= 80) {
    prediction = 'Doskonały potencjał! Post ma wszystkie elementy wysokiego zaangażowania.';
  } else if (score >= 60) {
    prediction = 'Dobry potencjał. Post powinien osiągnąć przyzwoite zaangażowanie.';
  } else if (score >= 40) {
    prediction = 'Średni potencjał. Rozważ dodanie pytania lub call to action.';
  } else {
    prediction = 'Niski potencjał. Post wymaga optymalizacji (długość, hashtagi, CTA).';
  }

  return { score, prediction };
};

export const generateABTestVariants = async (
  originalText: string,
  platform: Platform,
  tone: Tone,
  userId?: string
): Promise<{ variantA: string; variantB: string }> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/generate-ab-variants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId || ''
      },
      credentials: 'include',
      signal: controller.signal,
      body: JSON.stringify({ originalText, platform, tone })
    });
    clearTimeout(timeout);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Nie udało się wygenerować wariantów A/B');
    }
    return response.json();
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === 'AbortError') throw new Error('Przekroczono limit czasu generowania wariantów A/B');
    throw err;
  }
};
