import { callApi } from './apiClient';
import type { Platform } from '../types';

export interface ContentScore {
  overall: number;
  engagement: {
    score: number;
    level: 'low' | 'medium' | 'high';
    feedback: string[];
  };
  seo: {
    score: number;
    level: 'low' | 'medium' | 'high';
    feedback: string[];
  };
  platformFit: {
    score: number;
    level: 'poor' | 'good' | 'excellent';
    feedback: string[];
  };
  suggestions: string[];
  badge: 'red' | 'yellow' | 'green';
}

export async function scorePostContent(
  content: string,
  platform: Platform,
  userId: string,
  context?: {
    hasHashtags?: boolean;
    hasEmojis?: boolean;
    targetAudience?: string;
  }
): Promise<ContentScore> {
  const response = await callApi(
    'score-content',
    { content, platform, context },
    userId
  );

  if (!response?.success || !response.score) {
    throw new Error(response?.message || 'Nie udało się ocenić treści');
  }

  return response.score as ContentScore;
}

export function buildAutoFixPrompt(score: ContentScore): string {
  const parts: string[] = [];

  if (score.suggestions?.length) {
    parts.push(...score.suggestions);
  }
  if (score.engagement?.feedback?.length) {
    parts.push(...score.engagement.feedback.slice(0, 2));
  }
  if (score.platformFit?.feedback?.length) {
    parts.push(...score.platformFit.feedback.slice(0, 2));
  }

  const unique = [...new Set(parts.filter(Boolean))].slice(0, 6);
  if (unique.length === 0) {
    return 'Popraw post pod kątem zaangażowania, dopasowania do platformy i czytelności. Zachowaj sens i ton.';
  }

  return `Zastosuj te poprawki (zachowaj język i ton oryginału):\n${unique.map((s) => `- ${s}`).join('\n')}`;
}

/** Minimalna ocena (0–100) wymagana do automatycznej publikacji — zgodna z badge „green”. */
export const AUTO_PUBLISH_MIN_SCORE = 70;

export function passesAutoPublishQualityGate(score: ContentScore): boolean {
  return score.overall >= AUTO_PUBLISH_MIN_SCORE;
}
