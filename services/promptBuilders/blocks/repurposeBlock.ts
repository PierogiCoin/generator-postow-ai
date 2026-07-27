import { GenerationType } from '../../../types';
import type { TextPromptContext } from '../types';

export function repurposeBlock(ctx: TextPromptContext): string | null {
  const { formData, insights } = ctx;
  if (!formData.repurposeFrom && !formData.repurposeImageFrom) return null;

  const parts: string[] = [];

  if (formData.repurposeFrom) {
    if (formData.generationType === GenerationType.SeriesFollowUp) {
      parts.push(
        `\nSERIES MODE: You are creating a follow-up. Build upon this previous post: "${formData.repurposeFrom}". Reference its key points if appropriate to create a narrative journey.`
      );
    } else if (formData.topic.includes('Odśwież ten post')) {
      parts.push(
        `\nRECYCLE MODE: Refresh this high-performing post: "${formData.repurposeFrom}". Maintain its core "vibe" but update the hook and context for today.`
      );
    } else {
      parts.push(
        `\nREPURPOSE MODE: Adapt this content for ${formData.platform}: "${formData.repurposeFrom}".`
      );
    }
  }

  // If we have insights but no specific repurpose, echo previous related context.
  if (!formData.repurposeFrom && insights && insights.length > 0) {
    const contextStr = insights.find((i) => (i as { category?: string }).category === 'context')?.text;
    if (contextStr) {
      parts.push(
        `\nCONTEXT ECHO: Your previous related post was about: "${contextStr}". Ensure this new post feels like a natural next step in the brand's story.`
      );
    }
  }

  return parts.length ? parts.join('\n') : null;
}
