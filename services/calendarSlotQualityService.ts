import type { FormData, GenerationResult, Platform } from '../types';
import {
  scorePostContent,
  buildAutoFixPrompt,
  passesAutoPublishQualityGate,
  AUTO_PUBLISH_MIN_SCORE,
  type ContentScore,
} from './contentScoringService';
import { getPublishablePostText } from './autoPublishService';

export const CALENDAR_SLOT_MIN_SCORE = AUTO_PUBLISH_MIN_SCORE;
export const CALENDAR_SLOT_MAX_AUTO_FIX = 2;
const MIN_SCORABLE_CHARS = 60;

export interface CalendarSlotQualityResult {
  result: GenerationResult;
  score: ContentScore | null;
  improved: boolean;
  attempts: number;
  scheduledAllowed: boolean;
}

function scoringContext(result: GenerationResult, formData: FormData, text: string) {
  return {
    hasHashtags: (result.hashtags?.length ?? 0) > 0 || text.includes('#'),
    hasEmojis: /[\u{1F300}-\u{1FAFF}]/u.test(text),
    targetAudience: formData.audience,
  };
}

export async function scoreGenerationForSlot(
  result: GenerationResult,
  formData: FormData,
  userId: string
): Promise<ContentScore | null> {
  const text = getPublishablePostText(result);
  if (text.length < MIN_SCORABLE_CHARS) return null;
  return scorePostContent(text, formData.platform, userId, scoringContext(result, formData, text));
}

/**
 * Ocenia treść slotu; przy niskim wyniku uruchamia auto-poprawkę (jak w bramie jakości).
 * Zwraca zaktualizowany wynik i czy można bezpiecznie zaplanować slot.
 */
export async function ensureCalendarSlotQuality(
  result: GenerationResult,
  formData: FormData,
  userId: string,
  deps: {
    regenerateText: (originalText: string, feedback: string) => Promise<string>;
    onProgress?: (message: string) => void;
    minScore?: number;
    maxAttempts?: number;
  }
): Promise<CalendarSlotQualityResult> {
  const minScore = deps.minScore ?? CALENDAR_SLOT_MIN_SCORE;
  const maxAttempts = deps.maxAttempts ?? CALENDAR_SLOT_MAX_AUTO_FIX;

  let current: GenerationResult = { ...result };
  let score = await scoreGenerationForSlot(current, formData, userId);
  let attempts = 0;
  let improved = false;

  if (!score || passesAutoPublishQualityGate(score)) {
    return {
      result: current,
      score,
      improved: false,
      attempts: 0,
      scheduledAllowed: true,
    };
  }

  while (attempts < maxAttempts && score && score.overall < minScore) {
    attempts += 1;
    deps.onProgress?.(`Auto-poprawka slotu (${attempts}/${maxAttempts})…`);

    const feedback = buildAutoFixPrompt(score);
    const sourceText = current.postText?.trim() || getPublishablePostText(current);
    const newText = await deps.regenerateText(sourceText, feedback);

    if (!newText?.trim() || newText.trim() === sourceText.trim()) {
      break;
    }

    current = { ...current, postText: newText };
    improved = true;
    score = await scoreGenerationForSlot(current, formData, userId);

    if (score && score.overall >= minScore) {
      break;
    }
  }

  const scheduledAllowed = !score || score.overall >= minScore;

  return {
    result: current,
    score,
    improved,
    attempts,
    scheduledAllowed,
  };
}

export function formatSlotQualityMessage(
  score: ContentScore | null,
  improved: boolean,
  attempts: number
): string {
  if (!score) return 'Treść zbyt krótka do oceny — zaplanowano bez bramy jakości.';
  if (score.overall >= CALENDAR_SLOT_MIN_SCORE) {
    return improved
      ? `Ocena ${score.overall}/100 po ${attempts} auto-poprawce — slot zaplanowany.`
      : `Ocena ${score.overall}/100 — slot zaplanowany.`;
  }
  return `Ocena ${score.overall}/100 po auto-poprawce — popraw ręcznie przed planowaniem (min. ${CALENDAR_SLOT_MIN_SCORE}).`;
}
