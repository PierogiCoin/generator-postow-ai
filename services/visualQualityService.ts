import { callApi } from './apiClient';
import { generateImages, type ImageQuality } from './mediaService';
import type { Platform } from '../types';
import type { VisualBrief } from '../utils/visualBrief';

export const VISUAL_QA_MIN_SCORE = 65;
const VISUAL_SCORING_UNAVAILABLE_SCORE: VisualScore = {
  overall: 0,
  thumbStop: 0,
  brandFit: 0,
  textLegibility: 0,
  platformFit: 0,
  feedback: ['Nie udało się ocenić jakości grafiki.'],
  badge: 'red',
};

export interface VisualScore {
  overall: number;
  thumbStop: number;
  brandFit: number;
  textLegibility: number;
  platformFit: number;
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
  brief: VisualBrief;
  platform: Platform;
  aspectRatio: string;
  quality: ImageQuality;
  referenceImages?: string[];
  userId: string;
}): Promise<ImageGenResponse> {
  const payload = extractImagePayload(params.imageResponse);
  if (!payload.imageUrl && !payload.base64) return params.imageResponse;

  let score: VisualScore;
  try {
    score = await scoreGeneratedImage({
      imageUrl: payload.imageUrl?.startsWith('http') ? payload.imageUrl : undefined,
      base64: payload.base64,
      mimeType: payload.mimeType,
      platform: params.platform,
      briefSummary: `${params.brief.scene} | ${params.brief.mood} | ${params.brief.fluxPrompt.slice(0, 400)}`,
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
    params.prompt,
    'IMPROVE based on QA failure:',
    ...(score.feedback || []).slice(0, 4).map((f) => `- ${f}`),
    score.improvedPromptHint ? `Direction: ${score.improvedPromptHint}` : '',
    'Stronger thumb-stop contrast, clearer focal subject, no broken/garbled text.',
  ]
    .filter(Boolean)
    .join('\n');

  const regen = await generateImages(
    improvedPrompt,
    {
      aspectRatio: params.aspectRatio,
      quality: params.quality,
      provider: 'auto',
      referenceImages: params.referenceImages,
    },
    params.userId
  ).catch(() => null);

  if (!regen) return scoredResponse;
  return { ...regen, visualScore: score } as ImageGenResponse & { visualScore: VisualScore };
}
