import { Platform, Tone, GenerationType, type FormData } from '../types';
import { STORAGE_KEYS } from './storageUtils';

const LEGACY_KEY = STORAGE_KEYS.ONBOARDING;
const GUIDE_KEY_PREFIX = 'onboarding_guide_active_';

export interface OnboardingData {
  niche: string;
  platform: Platform;
  tone: string;
  brandVoice: string;
  firstPostTopic?: string;
}

const PENDING_FIRST_GEN_PREFIX = 'onboarding_pending_first_gen_';

export function buildFirstPostTopic(niche: string, platform: Platform): string {
  const trimmed = niche.trim();
  return `<p>Pierwszy post w niszy <strong>${trimmed}</strong>: przedstaw się, powiedz czego obserwujący mogą się spodziewać i zachęć do śledzenia na ${platform}.</p>`;
}

const TONE_MAP: Record<string, Tone> = {
  casual: Tone.Casual,
  professional: Tone.Professional,
  inspirational: Tone.Inspirational,
  humorous: Tone.Witty,
};

export function onboardingKey(userId?: string): string {
  return userId ? `${LEGACY_KEY}_${userId}` : LEGACY_KEY;
}

export function isOnboardingDone(userId?: string): boolean {
  if (userId && localStorage.getItem(onboardingKey(userId)) === 'true') return true;
  return localStorage.getItem(LEGACY_KEY) === 'true';
}

export function markOnboardingDone(userId?: string): void {
  localStorage.setItem(LEGACY_KEY, 'true');
  if (userId) localStorage.setItem(onboardingKey(userId), 'true');
}

export function activateOnboardingGuide(userId: string): void {
  localStorage.setItem(`${GUIDE_KEY_PREFIX}${userId}`, 'true');
}

export function isOnboardingGuideActive(userId: string): boolean {
  return localStorage.getItem(`${GUIDE_KEY_PREFIX}${userId}`) === 'true';
}

export function dismissOnboardingGuide(userId: string): void {
  localStorage.removeItem(`${GUIDE_KEY_PREFIX}${userId}`);
}

export function setOnboardingPendingFirstGenerate(userId: string): void {
  localStorage.setItem(`${PENDING_FIRST_GEN_PREFIX}${userId}`, 'true');
}

export function isOnboardingPendingFirstGenerate(userId: string): boolean {
  return localStorage.getItem(`${PENDING_FIRST_GEN_PREFIX}${userId}`) === 'true';
}

export function clearOnboardingPendingFirstGenerate(userId: string): void {
  localStorage.removeItem(`${PENDING_FIRST_GEN_PREFIX}${userId}`);
}

export function mapOnboardingToFormData(data: OnboardingData): Partial<FormData> {
  const topic = data.firstPostTopic?.trim() || buildFirstPostTopic(data.niche, data.platform);
  return {
    topic,
    platform: data.platform,
    tone: TONE_MAP[data.tone] ?? Tone.Casual,
    audience: data.niche,
    keywords: data.brandVoice,
    generationType: GenerationType.PostWithImage,
  };
}
