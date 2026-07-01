import { FormData, GenerationMode, GenerationType } from '../types';

/** Koszty operacji (kredyty) — zsynchronizowane z server/stripe.ts PRICING.costs */
export const CREDIT_COSTS = {
  generatePost: 10,
  generateHashtags: 5,
  generateImage: 50,
  generateVideo: 200,
  publishPost: 20,
  schedulePost: 15,
  analyticsSync: 5,
  brandVoiceAnalysis: 30,
  contentOptimization: 25,
  sentimentAnalysis: 15,
  videoStoryShort: 200,
  videoStoryMedium: 350,
  videoStoryLong: 500,
  imageBasic: 50,
  imageAdvanced: 100,
  imageBatch: 40,
} as const;

export type CreditCostAction = keyof typeof CREDIT_COSTS;

/**
 * Konserwatywny szacunek kosztu generacji (pre-check przed wywołaniem API).
 * Może nieznacznie przewyższać faktyczny koszt — lepiej niż start bez wystarczających kredytów.
 */
export function estimateGenerationCredits(formData: FormData): number {
  if (formData.generationType === GenerationType.ABTest) {
    return CREDIT_COSTS.generatePost;
  }

  if (formData.generationMode === GenerationMode.MultiVariant) {
    return CREDIT_COSTS.generatePost * 3;
  }

  if (formData.generationType === GenerationType.Omnichannel) {
    const platforms = formData.selectedPlatforms?.length ?? 3;
    return CREDIT_COSTS.generatePost * Math.max(1, platforms);
  }

  if (formData.generationType === GenerationType.Video) {
    return CREDIT_COSTS.generateVideo + CREDIT_COSTS.generatePost;
  }

  if (formData.generationType === GenerationType.Campaign) {
    const days = formData.campaignDuration ?? 7;
    const platforms =
      formData.campaignPlatforms?.length ?? formData.selectedPlatforms?.length ?? 1;
    return CREDIT_COSTS.generatePost * Math.max(3, days) * Math.max(1, platforms);
  }

  let cost = CREDIT_COSTS.generatePost;

  if (formData.generationType === GenerationType.PostWithImage) {
    cost += CREDIT_COSTS.generateImage;
  }

  cost += CREDIT_COSTS.generatePost;
  cost += CREDIT_COSTS.generatePost * 2;

  return cost;
}
