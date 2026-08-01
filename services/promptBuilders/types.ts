import type { AIInsight, BrandVoiceData, CopywritingFramework, FormData, Platform } from '../../types';
import type { NicheContext } from '../../utils/nicheContext';
import type { BrandMemoryRetrieveResult } from '../brandMemoryService';

/**
 * Context passed to all text-prompt blocks.
 */
export interface TextPromptContext {
  formData: FormData;
  brandVoice: BrandVoiceData | null;
  userId: string;
  nicheCtx: NicheContext;
  insights?: AIInsight[] | null;
  memory?: BrandMemoryRetrieveResult | null;
  currentDateStr: string;
}

/**
 * Context passed to image-prompt blocks.
 */
export interface ImagePromptContext {
  postText: string;
  platform: Platform;
  imageStyle: string;
  brandVoice: BrandVoiceData | null;
  userId: string;
  visualVibe?: string;
  useMascot?: boolean;
  postMortemImageHint?: string;
}

/**
 * A block returns a string to include in the prompt, or null/undefined to skip.
 */
export type PromptBlock<T> = (ctx: T) => string | null | undefined;

/**
 * Result of composing a text prompt.
 */
export interface ComposedTextPrompt {
  contents: string;
  config: {
    systemInstruction: string;
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
}

/**
 * Result of composing an image prompt.
 */
export interface ComposedImagePrompt {
  prompt: string;
  referenceImages: string[];
  referenceImageLabels?: string[];
  mascotPrompt?: string;
}
