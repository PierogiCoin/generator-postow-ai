import type { FormData, BrandVoiceProfile, GenerationResult } from '../types';
import { GenerationType, Platform } from '../types';
import { generateImages } from './mediaService';
import { getPlatformVisualSpec } from '../utils/platformVisualSpec';
import { buildImageGenerationInput } from './imagePromptBuilder';
import { scoreGeneratedImage } from './visualQualityService';
import type { VisualBrief } from '../utils/visualBrief';

/** Typy generacji, dla których ma sens (re)generacja grafiki. */
export function supportsImageGeneration(formData: FormData | null | undefined): boolean {
  if (!formData) return false;
  return (
    formData.generationType === GenerationType.PostWithImage ||
    formData.generationType === GenerationType.ABTest
  );
}

export interface RegenerationResult {
  imageUrl: string;
  visualScore?: GenerationResult['visualScore'];
}

export async function regeneratePostImage(
  postText: string,
  formData: FormData,
  userId: string,
  options?: {
    brandVoice?: BrandVoiceProfile | null;
    customInstruction?: string;
    variationSeed?: number;
    visualVibe?: string;
    postMortemImageHint?: string;
  }
): Promise<RegenerationResult> {
  const brandVoice = options?.brandVoice?.settings ?? null;

  const {
    imagePrompt: baseImagePrompt,
    aspectRatio,
    imageQuality,
    referenceImages,
    brief,
    negativePrompt,
  } = await buildImageGenerationInput({
    postText,
    formData,
    brandVoice,
    userId,
    visualVibe: options?.visualVibe,
    postMortemImageHint: options?.postMortemImageHint,
  });

  let imagePrompt = baseImagePrompt;

  if (options?.customInstruction?.trim()) {
    imagePrompt += `\n\nCREATIVE DIRECTION: ${options.customInstruction.trim()}`;
  }

  if (options?.variationSeed != null) {
    imagePrompt += `\n\nCreate a distinctly different visual variation (seed ${options.variationSeed}).`;
  }

  const imageResponse = await generateImages(
    imagePrompt,
    {
      aspectRatio,
      quality: imageQuality,
      provider: 'auto',
      referenceImages: referenceImages.length ? referenceImages : undefined,
      negativePrompt,
    },
    userId
  );

  const imageUrl =
    imageResponse.publicUrls?.[0] ||
    `data:image/jpeg;base64,${imageResponse.generatedImages?.[0]?.image?.imageBytes ?? ''}`;

  if (!imageUrl || imageUrl === 'data:image/jpeg;base64,') {
    throw new Error('Nie udało się wygenerować grafiki.');
  }

  let visualScore: GenerationResult['visualScore'];
  try {
    visualScore = await scoreGeneratedImage({
      imageUrl: imageUrl.startsWith('http') ? imageUrl : undefined,
      base64: imageResponse.generatedImages?.[0]?.image?.imageBytes,
      mimeType: imageResponse.generatedImages?.[0]?.image?.mimeType || 'image/jpeg',
      platform: formData.platform,
      briefSummary: `${brief.scene} | ${brief.mood} | ${brief.fluxPrompt.slice(0, 400)}`,
      postText,
      contentIntent: brief.contentIntent,
      negativePrompt,
      userId,
    });
  } catch {
    // Scoring failed — return without visualScore
  }

  return { imageUrl, visualScore };
}

/** Regeneruje grafikę pod inną platformę (repurpose wizualny). */
export async function regeneratePostImageForPlatform(
  postText: string,
  sourceFormData: FormData,
  targetPlatform: Platform,
  userId: string,
  options?: {
    brandVoice?: BrandVoiceProfile | null;
    customInstruction?: string;
  }
): Promise<RegenerationResult> {
  const spec = getPlatformVisualSpec(targetPlatform);
  const formData: FormData = {
    ...sourceFormData,
    platform: targetPlatform,
    aspectRatio: spec.defaultAspectRatio,
    generationType: GenerationType.PostWithImage,
  };

  return regeneratePostImage(postText, formData, userId, options);
}
