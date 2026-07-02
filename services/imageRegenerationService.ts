import type { FormData } from '../types';
import { GenerationType, Platform, VisualStyle } from '../types';
import { generateImages } from './mediaService';
import { buildPlatformImagePrompt, resolveAspectRatioForPlatform, mapAspectRatioToApi, getPlatformVisualSpec } from '../utils/platformVisualSpec';
import type { BrandVoiceProfile } from '../types';

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
  let imageStyle = formData.visualStyle || 'modern';
  const brandVoice = options?.brandVoice;

  if (brandVoice?.settings?.visualStyle) {
    imageStyle = `${brandVoice.settings.visualStyle}, ${imageStyle}`;
  }
  if (brandVoice?.settings?.brandColors?.length) {
    imageStyle = `${imageStyle}, brand colors: ${brandVoice.settings.brandColors.join(', ')}`;
  }

  let mascotPrompt: string | undefined;
  if (formData.useMascot === true && brandVoice?.settings?.mascotDescription) {
    mascotPrompt = `FEATURED MASCOT: Include "${brandVoice.settings.mascotName || 'mascot'}". ${brandVoice.settings.mascotDescription}`;
  }

  let imagePrompt = buildPlatformImagePrompt({
    postText,
    platform: formData.platform,
    imageStyle,
    mascotPrompt,
  });

  if (options?.customInstruction?.trim()) {
    imagePrompt += `\n\nCREATIVE DIRECTION: ${options.customInstruction.trim()}`;
  }

  if (options?.variationSeed != null) {
    imagePrompt += `\n\nCreate a distinctly different visual variation (seed ${options.variationSeed}).`;
  }

  const aspectRatio = mapAspectRatioToApi(
    resolveAspectRatioForPlatform(
      formData.platform,
      formData.aspectRatio,
      formData.visualStyle as VisualStyle
    )
  );

  const imageResponse = await generateImages(imagePrompt, { aspectRatio }, userId);
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
  };
  const instruction =
    options?.customInstruction ||
    `Reformat this visual for ${targetPlatform}. Composition: ${spec.composition}. ${spec.summaryPl}`;
  return regeneratePostImage(postText, formData, userId, {
    ...options,
    customInstruction: instruction,
    variationSeed: Date.now(),
  });
}

export function supportsImageGeneration(formData: FormData | null): boolean {
  if (!formData) return false;
  return (
    formData.generationType === GenerationType.PostWithImage ||
    formData.generationType === GenerationType.ABTest
  );
}
