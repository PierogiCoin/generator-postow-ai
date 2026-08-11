import { resolveNicheContext } from '../../utils/nicheContext';
import { retrieveBrandMemoryContext } from '../brandMemoryService';
import type {
  AIInsight,
  BrandVoiceData,
  FormData,
} from '../../types';
import type {
  ComposedTextPrompt,
  ComposedImagePrompt,
  ImagePromptContext,
  TextPromptContext,
} from './types';
import { baseInstructionBlock } from './blocks/baseInstructionBlock';
import { antiSlopBlock } from './blocks/antiSlopBlock';
import { platformBlock } from './blocks/platformBlock';
import { frameworkBlock } from './blocks/frameworkBlock';
import { industryBlock } from './blocks/industryBlock';
import { brandBlock, brandImageBlock } from './blocks/brandBlock';
import { repurposeBlock } from './blocks/repurposeBlock';
import { userPromptBlock } from './blocks/userPromptBlock';

function logNonBlockingError(scope: string, error: unknown, meta?: Record<string, unknown>) {
  console.warn(`[promptComposer] ${scope}`, {
    error: error instanceof Error ? error.message : String(error),
    ...(meta || {}),
  });
}

export interface ComposeTextPromptOptions {
  formData: FormData;
  brandVoice: BrandVoiceData | null;
  userId: string;
  insights?: AIInsight[] | null;
}

/**
 * Compose a full text-generation prompt from modular blocks.
 */
export async function composeTextPrompt(
  opts: ComposeTextPromptOptions
): Promise<ComposedTextPrompt> {
  const { formData, brandVoice, userId, insights } = opts;

  const currentDateStr = new Date().toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const nicheCtx = resolveNicheContext({
    userId,
    brandVoice,
    audience: formData.audience,
  });

  let memory: Awaited<ReturnType<typeof retrieveBrandMemoryContext>> | null = null;
  try {
    memory = await retrieveBrandMemoryContext(userId, {
      topic: formData.topic,
      platform: formData.platform,
      limit: 5,
    });
  } catch (error: unknown) {
    logNonBlockingError('Brand memory context failed — continuing without memory', error, {
      platform: formData.platform,
    });
  }

  const ctx: TextPromptContext = {
    formData,
    brandVoice,
    userId,
    nicheCtx,
    insights: insights ?? null,
    memory,
    currentDateStr,
  };

  const systemParts = [
    baseInstructionBlock(ctx),
    antiSlopBlock(ctx),
    platformBlock(ctx),
    frameworkBlock(ctx),
    industryBlock(ctx),
    brandBlock(ctx),
    repurposeBlock(ctx),
  ];

  const systemInstruction = systemParts.filter(Boolean).join('\n');

  return {
    contents: userPromptBlock(ctx),
    config: {
      systemInstruction,
    },
  };
}

export interface ComposeImagePromptOptions {
  postText: string;
  platform: FormData['platform'];
  imageStyle: string;
  brandVoice: BrandVoiceData | null;
  userId: string;
  visualVibe?: string;
  useMascot?: boolean;
  postMortemImageHint?: string;
  industryImagePromptPrefix?: string;
  industryMustShow?: string[];
  textOnImage?: 'none' | 'minimal' | 'headline';
  headline?: string;
}

/**
 * Compose an image-generation prompt and decide which reference images to send.
 */
export function composeImagePrompt(opts: ComposeImagePromptOptions): ComposedImagePrompt {
  const {
    postText,
    platform,
    imageStyle,
    brandVoice,
    visualVibe,
    useMascot,
    postMortemImageHint,
    industryImagePromptPrefix,
    industryMustShow,
  } = opts;

  const ctx: ImagePromptContext = {
    postText,
    platform,
    imageStyle,
    brandVoice,
    userId: opts.userId,
    visualVibe,
    useMascot,
    postMortemImageHint,
  };

  const brandResult = brandImageBlock(ctx);

  const lines: string[] = [];
  if (industryImagePromptPrefix) {
    lines.push(industryImagePromptPrefix);
  }

  if (industryMustShow && industryMustShow.length > 0) {
    lines.push(`INDUSTRY MUST SHOW: ${industryMustShow.join('; ')}.`);
  }

  lines.push(`High quality social media image for ${platform}.`);
  lines.push(`Topic/context from post: "${postText.substring(0, 200)}".`);
  lines.push(`Visual style: ${imageStyle}.`);

  if (visualVibe) {
    lines.push(`Maintain visual vibe: ${visualVibe}.`);
  }

  if (brandVoice?.brandColors?.length) {
    lines.push(`Dominant colors: ${brandVoice.brandColors.join(', ')}.`);
  }

  if (brandVoice?.description?.trim()) {
    lines.push(`Brand identity: ${brandVoice.description.trim()}.`);
  }

  if (brandVoice?.keywords?.trim()) {
    lines.push(`Brand keywords to reflect visually: ${brandVoice.keywords.trim()}.`);
  }

  if (brandVoice?.visualStyle?.trim()) {
    lines.push(`Brand visual style: ${brandVoice.visualStyle.trim()}.`);
  }

  if (brandVoice?.avoid?.trim()) {
    lines.push(`Brand visual elements to avoid: ${brandVoice.avoid.trim()}.`);
  }

  if (brandResult.mascotPrompt) {
    lines.push(brandResult.mascotPrompt);
  }

  if (postMortemImageHint) {
    lines.push(`PROVEN STYLE: ${postMortemImageHint}`);
  }

  if (opts.textOnImage === 'headline' && opts.headline) {
    lines.push(`Text policy: include only this short, highly legible headline: "${opts.headline}". No other text, watermarks, or logos.`);
  } else if (opts.textOnImage === 'minimal') {
    lines.push('Text policy: minimal short text only if essential. No watermarks or logos; brand assets are added in post-production.');
  } else {
    lines.push('Text policy: no text, letters, watermarks, or logos rendered in the frame; brand assets are added in post-production.');
  }

  return {
    prompt: lines.join(' '),
    referenceImages: brandResult.referenceImages,
    referenceImageLabels: brandResult.referenceImageLabels,
    mascotPrompt: brandResult.mascotPrompt,
  };
}

export { brandImageBlock };
