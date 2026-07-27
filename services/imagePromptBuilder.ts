import { FormData, BrandVoiceData, Platform, VisualStyle } from '../types';
import type { ImageQuality } from './mediaService';
import {
  buildPlatformImagePrompt,
  resolveAspectRatioForPlatform,
} from '../utils/platformVisualSpec';
import { buildVisualBrief, visualBriefToPrompt } from './visualBriefService';
import { composeImagePrompt } from './promptBuilders';
import { resolveNicheContext } from '../utils/nicheContext';
import type { VisualBrief } from '../utils/visualBrief';

export interface ImagePromptBuilderInput {
  postText: string;
  formData: Pick<FormData, 'platform' | 'aspectRatio' | 'visualStyle' | 'imageQuality' | 'useMascot'>;
  brandVoice: BrandVoiceData | null;
  userId: string;
  visualVibe?: string;
  postMortemImageHint?: string;
}

export interface ImagePromptBuilderResult {
  imagePrompt: string;
  aspectRatio: string;
  imageQuality: ImageQuality;
  referenceImages: string[];
  brief: VisualBrief;
  composedMascotPrompt?: string;
}

/**
 * Resolves whether the brand mascot should be included in image generation.
 *
 * - `true`  → include if the brand voice has a mascot description.
 * - `'auto'` → include only if the post text mentions the mascot by name (or the generic fallback word).
 * - missing/`false` → do not include.
 */
export function resolveUseMascot(
  formDataValue: boolean | 'auto' | undefined,
  brandVoice: BrandVoiceData | null,
  postText: string
): boolean {
  if (!brandVoice?.mascotDescription) return false;
  if (formDataValue === true) return true;
  if (formDataValue === 'auto') {
    const mascotName = (brandVoice.mascotName || 'maskotka').toLowerCase();
    return postText.toLowerCase().includes(mascotName);
  }
  return false;
}

function resolveImageStyle(
  formData: ImagePromptBuilderInput['formData'],
  brandVoice: BrandVoiceData | null
): string {
  let imageStyle: string = formData.visualStyle || 'modern';
  if (brandVoice?.visualStyle) {
    imageStyle = `${brandVoice.visualStyle}, ${imageStyle}`;
  }
  if (brandVoice?.brandColors?.length) {
    imageStyle = `${imageStyle}, brand colors: ${brandVoice.brandColors.join(', ')}`;
  }
  return imageStyle;
}

/**
 * Builds everything needed to call `generateImages()` for a social post.
 *
 * Centralizes logic that was duplicated between `contentService.ts`
 * and `imageRegenerationService.ts`:
 * - image style + brand colors
 * - mascot resolution
 * - visual brief + image prompt composition
 * - fallback platform prompt
 * - aspect ratio + image quality
 */
export async function buildImageGenerationInput(
  input: ImagePromptBuilderInput
): Promise<ImagePromptBuilderResult> {
  const { postText, formData, brandVoice, userId, visualVibe, postMortemImageHint } = input;

  const imageStyle = resolveImageStyle(formData, brandVoice);
  const useMascot = resolveUseMascot(formData.useMascot, brandVoice, postText);

  const brief = await buildVisualBrief({
    postText,
    platform: formData.platform,
    imageStyle,
    brandColors: brandVoice?.brandColors,
    visualVibe,
    mascotDescription: useMascot ? brandVoice?.mascotDescription : undefined,
    userId,
  });

  const industryImagePrefix = resolveNicheContext({
    userId,
    brandVoice,
    audience: undefined,
  }).pack?.imagePromptPrefix;

  const composedImage = composeImagePrompt({
    postText,
    platform: formData.platform,
    imageStyle,
    brandVoice,
    userId,
    visualVibe,
    useMascot,
    postMortemImageHint,
    industryImagePromptPrefix: industryImagePrefix,
  });

  let imagePrompt = visualBriefToPrompt(brief);
  if (composedImage.mascotPrompt) {
    imagePrompt += ` ${composedImage.mascotPrompt}`;
  }
  if (postMortemImageHint) {
    imagePrompt += ` PROVEN STYLE: ${postMortemImageHint}`;
  }

  if (imagePrompt.length < 80) {
    imagePrompt = buildPlatformImagePrompt({
      postText,
      platform: formData.platform,
      imageStyle,
      visualVibe,
      mascotPrompt: composedImage.mascotPrompt,
      postMortemHint: postMortemImageHint,
    });
  }

  const aspectRatio = resolveAspectRatioForPlatform(
    formData.platform,
    formData.aspectRatio,
    formData.visualStyle as VisualStyle
  );

  const imageQuality: ImageQuality =
    formData.imageQuality ||
    (formData.platform === Platform.LinkedIn || formData.platform === Platform.YouTube
      ? 'typography'
      : 'standard');

  return {
    imagePrompt,
    aspectRatio,
    imageQuality,
    referenceImages: composedImage.referenceImages,
    brief,
    composedMascotPrompt: composedImage.mascotPrompt,
  };
}
