import { formatNicheUserPromptLines } from '../../../utils/nicheContext';
import type { TextPromptContext } from '../types';

export function userPromptBlock(ctx: TextPromptContext): string {
  const { formData, nicheCtx } = ctx;
  return `Generate an engaging ${formData.platform} post.
TOPIC: ${formData.topic || 'General engaging content'}
TONE: ${formData.tone}
AUDIENCE: ${formData.audience || nicheCtx.niche || 'General public'}
${formatNicheUserPromptLines(nicheCtx)}

CRITICAL: Do not ask for more information. Do not respond conversationally. Provide ONLY the post content.`;
}
