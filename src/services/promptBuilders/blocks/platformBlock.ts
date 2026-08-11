import { Platform } from '../../../types';
import type { TextPromptContext } from '../types';

export function platformBlock(ctx: TextPromptContext): string {
  const instructions: Record<Platform, string> = {
    [Platform.Facebook]: `
FACEBOOK STYLE GUIDELINES:
- Write in a friendly, conversational, and community-oriented tone.
- Keep the structure highly readable with short paragraphs and spacing.
- Include an engaging question at the end to prompt discussions and comments.
- Use a moderate amount of emojis (3-6 max).`,

    [Platform.Instagram]: `
INSTAGRAM STYLE GUIDELINES:
- The very first line MUST be an extremely compelling hook that forces the user to click "...more".
- Move hashtags to the very bottom, separating them from the main copy by 4-5 empty lines or dots (e.g., ".").
- Use spacing to make lists readable. Tone should be visually evoking, lifestyle-focused, or inspiring.`,

    [Platform.LinkedIn]: `
LINKEDIN STYLE GUIDELINES:
- Write in an expert, professional, yet conversational and authentic tone.
- Avoid corporate jargon or excessive corporate fluff.
- Use mobile-friendly layouts: maximum 1-2 sentences per line/paragraph.
- Use bullet points or numbered lists to structure complex ideas.
- Include a "Key Takeaway" or action step at the end.
- CRITICAL: Keep emojis to an absolute minimum (maximum 3 in the entire post).`,

    [Platform.X]: `
X (TWITTER) STYLE GUIDELINES:
- Be highly concise, punchy, and direct. Skip introductions entirely.
- Hook in the very first sentence. Use bold claims, contrarian views, or stats.
- Keep it strictly within the character limit. Use at most 1 relevant hashtag at the end (or none).`,

    [Platform.TikTok]: `
TIKTOK STYLE GUIDELINES:
- Write in an energetic, informal, speaking-oriented verbal format.
- Include suggested overlay text captions in brackets [like this] that should appear on screen.
- Focus on short, fast-paced setups.`,

    [Platform.YouTube]: `
YOUTUBE STYLE GUIDELINES:
- Focus on searchability and hooks.
- Write a compelling description layout: brief hook, timestamp indicators, and call to action.`,
  };

  const platform = ctx.formData.platform;
  const block = instructions[platform];
  return block ? `\n${block}` : '';
}
