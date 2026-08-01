import { callApi } from './apiClient';
import { generateImages, type ImageQuality } from './mediaService';
import { VISUAL_QA_MIN_SCORE } from '../shared/config/generationConfig';
import type { Platform } from '../types';
import type { VisualBrief, VisualContentIntent } from '../utils/visualBrief';

export { VISUAL_QA_MIN_SCORE };
const VISUAL_SCORING_UNAVAILABLE_SCORE: VisualScore = {
  overall: 0,
  thumbStop: 0,
  brandFit: 0,
  textLegibility: 0,
  platformFit: 0,
  contentMatch: 0,
  subjectAccuracy: 0,
  offerMatch: 0,
  audienceMatch: 0,
  negativeMatch: 0,
  feedback: ['Nie udało się ocenić jakości grafiki.'],
  badge: 'red',
};

export interface VisualScore {
  overall: number;
  thumbStop: number;
  brandFit: number;
  textLegibility: number;
  platformFit: number;
  contentMatch: number;
  subjectAccuracy: number;
  offerMatch: number;
  audienceMatch: number;
  negativeMatch: number;
  feedback: string[];
  improvedPromptHint?: string;
  badge: 'red' | 'yellow' | 'green';
}

type ImageGenResponse = {
  generatedImages?: Array<{ image?: { mimeType?: string; imageBytes?: string } }>;
  publicUrls?: string[];
  revisedPrompt?: string;
  provider?: string;
  model?: string;
};

function extractImagePayload(imageResponse: ImageGenResponse): {
  imageUrl?: string;
  base64?: string;
  mimeType: string;
} {
  const imageUrl = imageResponse.publicUrls?.[0];
  const bytes = imageResponse.generatedImages?.[0]?.image?.imageBytes;
  const mimeType = imageResponse.generatedImages?.[0]?.image?.mimeType || 'image/jpeg';
  return {
    imageUrl,
    base64: bytes,
    mimeType,
  };
}

export async function scoreGeneratedImage(
  params: {
    imageUrl?: string;
    base64?: string;
    mimeType?: string;
    platform: Platform;
    briefSummary: string;
    postText: string;
    contentIntent: VisualContentIntent;
    negativePrompt?: string;
    userId: string;
  }
): Promise<VisualScore> {
  const response = (await callApi(
    'score-image',
    {
      imageUrl: params.imageUrl,
      base64: params.base64,
      mimeType: params.mimeType || 'image/jpeg',
      platform: params.platform,
      briefSummary: params.briefSummary,
      postText: params.postText,
      contentIntent: params.contentIntent,
      negativePrompt: params.negativePrompt,
    },
    params.userId
  )) as { success?: boolean; score?: VisualScore; message?: string };

  if (!response?.success || !response.score) {
    throw new Error(response?.message || 'Nie udało się ocenić grafiki');
  }
  return response.score;
}

/**
 * Score image; if below threshold, regenerate once with improved prompt.
 */
export async function ensureImageQuality(params: {
  imageResponse: ImageGenResponse;
  prompt: string;
  postText: string;
  brief: VisualBrief;
  platform: Platform;
  aspectRatio: string;
  quality: ImageQuality;
  referenceImages?: string[];
  negativePrompt?: string;
  userId: string;
}): Promise<ImageGenResponse> {
  const payload = extractImagePayload(params.imageResponse);
  if (!payload.imageUrl && !payload.base64) return params.imageResponse;

  const briefSummary = [
    params.brief.scene,
    params.brief.mood,
    `Avoid: ${[...(params.brief.avoid || []), ...(params.brief.contentIntent?.forbiddenInterpretations || [])].join('; ')}`,
    params.brief.fluxPrompt.slice(0, 400),
  ].join(' | ');

  let score: VisualScore;
  try {
    score = await scoreGeneratedImage({
      imageUrl: payload.imageUrl?.startsWith('http') ? payload.imageUrl : undefined,
      base64: payload.base64,
      mimeType: payload.mimeType,
      platform: params.platform,
      briefSummary,
      postText: params.postText,
      contentIntent: params.brief.contentIntent,
      negativePrompt: params.negativePrompt,
      userId: params.userId,
    });
  } catch {
    return {
      ...params.imageResponse,
      visualScore: VISUAL_SCORING_UNAVAILABLE_SCORE,
    } as ImageGenResponse & { visualScore: VisualScore };
  }

  const scoredResponse = {
    ...params.imageResponse,
    visualScore: score,
  } as ImageGenResponse & { visualScore: VisualScore };

  if (score.overall >= VISUAL_QA_MIN_SCORE) {
    return scoredResponse;
  }

  const improvedPrompt = [
    score.improvedPromptHint
      ? `REGENERATION DIRECTION: ${score.improvedPromptHint}`
      : '',
    params.prompt,
    'IMPROVE based on QA failure:',
    ...(score.feedback || []).slice(0, 4).map((f) => `- ${f}`),
    'Stronger thumb-stop contrast, clearer focal subject, no broken/garbled text.',
    'Correct every semantic mismatch: show the required subject and objects, preserve the offer and audience, and do not invent unsupported claims.',
  ]
    .filter(Boolean)
    .join('\n');

  const originalProvider = params.imageResponse.provider;
  const regenProvider =
    originalProvider === 'together' ? 'imagen' : originalProvider === 'imagen' ? 'together' : 'auto';

  const regen = await generateImages(
    improvedPrompt,
    {
      aspectRatio: params.aspectRatio,
      quality: params.quality,
      provider: regenProvider,
      referenceImages: params.referenceImages,
      negativePrompt: params.negativePrompt,
    },
    params.userId
  ).catch(() => null);

  if (!regen) return scoredResponse;

  const regenPayload = extractImagePayload(regen);
  if (regenPayload.imageUrl || regenPayload.base64) {
    try {
      const regenScore = await scoreGeneratedImage({
        imageUrl: regenPayload.imageUrl?.startsWith('http') ? regenPayload.imageUrl : undefined,
        base64: regenPayload.base64,
        mimeType: regenPayload.mimeType,
        platform: params.platform,
        briefSummary,
        postText: params.postText,
        contentIntent: params.brief.contentIntent,
        negativePrompt: params.negativePrompt,
        userId: params.userId,
      });
      // Pick the better image: regen only if it scores higher than original
      if (regenScore.overall >= score.overall) {
        return { ...regen, visualScore: regenScore } as ImageGenResponse & { visualScore: VisualScore };
      }
      // Original was better — keep it
      return scoredResponse;
    } catch {
      // Re-scoring failed — keep original score as fallback
      return scoredResponse;
    }
  }
  // Regen produced no usable image — keep original
  return scoredResponse;
}
