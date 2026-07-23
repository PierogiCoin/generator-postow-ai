import type { FormData } from '../types';
import { GenerationType, Platform, VisualStyle } from '../types';
import { generateImages } from './mediaService';
import { buildPlatformImagePrompt, resolveAspectRatioForPlatform, getPlatformVisualSpec } from '../utils/platformVisualSpec';
import type { BrandVoiceProfile } from '../types';
import { buildVisualBrief, visualBriefToPrompt } from './visualBriefService';

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
  let imageStyle = formData.visualStyle || 'modern';
  const brandVoice = options?.brandVoice?.settings;

  if (brandVoice?.visualStyle) {
    imageStyle = `${brandVoice.visualStyle}, ${imageStyle}` as VisualStyle;
  }
  if (brandVoice?.brandColors?.length) {
    imageStyle = `${imageStyle}, brand colors: ${brandVoice.brandColors.join(', ')}` as VisualStyle;
  }

  const useMascot = formData.useMascot === true && !!brandVoice?.mascotDescription;
  let mascotPrompt: string | undefined;
  if (useMascot && brandVoice?.mascotDescription) {
    mascotPrompt = `FEATURED MASCOT: Include "${brandVoice.mascotName || 'mascot'}". ${brandVoice.mascotDescription}`;
  }

  const brief = await buildVisualBrief({
    postText,
    platform: formData.platform,
    imageStyle,
    brandColors: brandVoice?.brandColors,
    mascotDescription: useMascot ? brandVoice?.mascotDescription : undefined,
    userId,
  });

  let imagePrompt = visualBriefToPrompt(brief);
  if (mascotPrompt) imagePrompt += ` ${mascotPrompt}`;

  if (options?.customInstruction?.trim()) {
    imagePrompt += `\n\nCREATIVE DIRECTION: ${options.customInstruction.trim()}`;
  }

  if (options?.variationSeed != null) {
    imagePrompt += `\n\nCreate a distinctly different visual variation (seed ${options.variationSeed}).`;
  }

  if (imagePrompt.length < 60) {
    imagePrompt = buildPlatformImagePrompt({
      postText,
      platform: formData.platform,
      imageStyle,
      mascotPrompt,
    });
  }

  const aspectRatio = resolveAspectRatioForPlatform(
    formData.platform,
    formData.aspectRatio,
    formData.visualStyle as VisualStyle
  );

  const referenceImages: string[] = [];
  if (useMascot && brandVoice?.mascotUrl) referenceImages.push(brandVoice.mascotUrl);
  if (formData.includeLogo !== false && brandVoice?.logoUrl) referenceImages.push(brandVoice.logoUrl);

  const imageQuality =
    formData.imageQuality ||
    (formData.platform === Platform.LinkedIn || formData.platform === Platform.YouTube
      ? 'typography'
      : 'standard');

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
