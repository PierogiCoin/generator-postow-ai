import { FormData, BrandVoiceData, Platform, VisualStyle } from '../types';
import { generateImages, type ImageQuality } from './mediaService';
import { DEFAULT_IMAGE_NEGATIVE_PROMPT } from '@/shared/config/visualConfig';
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
  formData: Pick<FormData, 'platform' | 'aspectRatio' | 'visualStyle' | 'imageQuality' | 'useMascot' | 'audience'>;
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
  negativePrompt?: string;
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

  const nichePack = resolveNicheContext({
    userId,
    brandVoice,
    audience: formData.audience,
  }).pack;

  const industryImagePrefix = nichePack?.imagePromptPrefix;
  const industryMustShow = nichePack?.imageMustShow;

  const brief = await buildVisualBrief({
    postText,
    platform: formData.platform,
    imageStyle,
    brandVoice,
    brandColors: brandVoice?.brandColors,
    visualVibe,
    mascotDescription: useMascot ? brandVoice?.mascotDescription : undefined,
    industryMustShow,
    userId,
  });

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
    industryMustShow,
    textOnImage: brief.textOnImage,
    headline: brief.headline,
  });

  let imagePrompt = [
    visualBriefToPrompt(brief),
    'ADDITIONAL BRAND, INDUSTRY, PLATFORM, AND POST CONTEXT:',
    composedImage.prompt,
    'Preserve semantic fidelity to CONTENT INTENT above. Do not replace required subjects with generic visual metaphors.',
  ].join('\n\n');

  if (composedImage.referenceImages.length > 0 && composedImage.referenceImageLabels?.length) {
    const labelCounts: Record<string, number> = {};
    for (const label of composedImage.referenceImageLabels) {
      labelCounts[label] = (labelCounts[label] || 0) + 1;
    }
    const refDesc = Object.entries(labelCounts)
      .map(([label, count]) => `${count} ${label}${count > 1 ? 's' : ''}`)
      .join(', ');
    imagePrompt += `\n\nREFERENCE IMAGES provided: ${refDesc}. Use them as visual guides for style, composition, and subject fidelity — do not copy them literally.`;
  }

  if (imagePrompt.length < 80) {
    const fallbackLines: string[] = [
      buildPlatformImagePrompt({
        postText,
        platform: formData.platform,
        imageStyle,
        visualVibe,
        mascotPrompt: composedImage.mascotPrompt,
        postMortemHint: postMortemImageHint,
      }),
    ];

    if (industryMustShow?.length) {
      fallbackLines.push(`INDUSTRY MUST SHOW: ${industryMustShow.join('; ')}.`);
    }

    if (brief.contentIntent?.primarySubject) {
      fallbackLines.push(`CONTENT INTENT — primary subject: ${brief.contentIntent.primarySubject}.`);
    }
    if (brief.contentIntent?.requiredObjects?.length) {
      fallbackLines.push(`Required objects: ${brief.contentIntent.requiredObjects.join(', ')}.`);
    }
    if (brief.contentIntent?.forbiddenInterpretations?.length) {
      fallbackLines.push(`AVOID: ${brief.contentIntent.forbiddenInterpretations.join('; ')}.`);
    }

    if (composedImage.referenceImages.length > 0) {
      fallbackLines.push(`REFERENCE IMAGES provided: ${composedImage.referenceImages.length} image(s). Use them as visual guides — do not copy literally.`);
    }

    imagePrompt = fallbackLines.join(' ');
  }

  const negativePrompt = [
    ...(brief.avoid || []),
    ...DEFAULT_IMAGE_NEGATIVE_PROMPT,
    ...(brief.contentIntent?.forbiddenInterpretations || []),
  ].join(', ');

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
    negativePrompt,
  };
}
