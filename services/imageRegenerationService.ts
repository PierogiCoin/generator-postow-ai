import type { FormData, BrandVoiceProfile } from '../types';
import { GenerationType, Platform } from '../types';
import { generateImages } from './mediaService';
import { getPlatformVisualSpec } from '../utils/platformVisualSpec';
import { buildImageGenerationInput } from './imagePromptBuilder';

/** Typy generacji, dla których ma sens (re)generacja grafiki. */
export function supportsImageGeneration(formData: FormData | null | undefined): boolean {
  if (!formData) return false;
  return (
    formData.generationType === GenerationType.PostWithImage ||
    formData.generationType === GenerationType.ABTest
  );
}

export async function regeneratePostImage(
  postText: string,
  formData: FormData,
  userId: string,
  options?: {
    brandVoice?: BrandVoiceProfile | null;
    customInstruction?: string;
    variationSeed?: number;
  }
): Promise<string> {
  const brandVoice = options?.brandVoice?.settings ?? null;

  const {
    imagePrompt: baseImagePrompt,
    aspectRatio,
    imageQuality,
    referenceImages,
  } = await buildImageGenerationInput({
    postText,
    formData,
    brandVoice,
    userId,
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
    },
    userId
  );

  const imageUrl =
    imageResponse.publicUrls?.[0] ||
    `data:image/jpeg;base64,${imageResponse.generatedImages?.[0]?.image?.imageBytes ?? ''}`;

  if (!imageUrl || imageUrl === 'data:image/jpeg;base64,') {
    throw new Error('Nie udało się wygenerować grafiki.');
  }

  return imageUrl;
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
): Promise<string> {
  const spec = getPlatformVisualSpec(targetPlatform);
  const formData: FormData = {
    ...sourceFormData,
    platform: targetPlatform,
    aspectRatio: spec.defaultAspectRatio,
    generationType: GenerationType.PostWithImage,
  };

  return regeneratePostImage(postText, formData, userId, options);
}
