import { buildCompetitorPromptBlock } from '../../../utils/competitorBrandVoice';
import type { TextPromptContext, ImagePromptContext } from '../types';

export function brandBlock(ctx: TextPromptContext): string | null {
  const { brandVoice, insights, memory } = ctx;
  if (!brandVoice && !insights?.length && !memory?.promptBlock) return null;

  const parts: string[] = [];

  if (brandVoice) {
    parts.push(`\nBRAND VOICE: Follow this brand profile: ${JSON.stringify(brandVoice)}.`);

    if (brandVoice.successPatterns && brandVoice.successPatterns.length > 0) {
      parts.push(
        `CRITICAL: Replicate these specific success patterns that worked for this brand: ${brandVoice.successPatterns.join(', ')}.`
      );
    }

    // Logo: only textual guidance; actual overlay happens in CreativeCanvas.
    if (ctx.formData.includeLogo && brandVoice.logoUrl) {
      parts.push(
        `BRANDING: The brand logo will be added in post-production. Do not describe the logo unless it is central to the message; focus the copy on the value proposition.`
      );
    }

    // Mascot: softer instruction than "YOU MUST INCLUDE".
    if (ctx.formData.useMascot === true && brandVoice.mascotDescription) {
      parts.push(
        `MASCOT: If it fits the topic naturally, feature the brand mascot "${brandVoice.mascotName || 'the mascot'}" (${brandVoice.mascotDescription}). Keep the mention organic, not forced.`
      );
    } else if (ctx.formData.useMascot === 'auto' && brandVoice.mascotDescription) {
      parts.push(
        `MASCOT: The brand has a mascot "${brandVoice.mascotName || 'the mascot'}" (${brandVoice.mascotDescription}). Decide if including it would increase engagement for this specific topic. If yes, incorporate it creatively and organically.`
      );
    }

    const competitorBlock = buildCompetitorPromptBlock(brandVoice);
    if (competitorBlock) {
      parts.push(competitorBlock);
    }
  }

  if (memory?.promptBlock) {
    parts.push(`\n${memory.promptBlock}`);
  }

  if (insights && insights.length > 0) {
    parts.push(`\nUse these high-performance insights retrieved from analytics: ${JSON.stringify(insights)}. Focus on "positive" insights to replicate success.`);

    const postMortemInsight = insights.find(
      (i) =>
        (i as AIInsightWithTemplate).textTemplateSuggestion ||
        (i as AIInsightWithTemplate).imagePromptSuggestion
    );
    if (postMortemInsight) {
      const extended = postMortemInsight as AIInsightWithTemplate;
      if (extended.textTemplateSuggestion) {
        parts.push(
          `CRITICAL: Follow this proven text template that worked best for this brand: "${extended.textTemplateSuggestion}".`
        );
      }
    }
  }

  return parts.length ? parts.join('\n') : null;
}

interface AIInsightWithTemplate {
  textTemplateSuggestion?: string;
  imagePromptSuggestion?: string;
  category?: string;
  text?: string;
}

export function brandImageBlock(ctx: ImagePromptContext): { referenceImages: string[]; mascotPrompt?: string } {
  const { brandVoice, useMascot } = ctx;
  const referenceImages: string[] = [];
  let mascotPrompt: string | undefined;

  // Logo is intentionally NOT passed as reference image; it is overlaid in CreativeCanvas.
  // This avoids FLUX "baking" the logo into the generated scene.

  if (useMascot && brandVoice?.mascotDescription) {
    mascotPrompt = `FEATURED MASCOT: Include the brand mascot "${brandVoice.mascotName || 'the mascot'}". Description: ${brandVoice.mascotDescription}.`;
    if (brandVoice.mascotUrl) {
      referenceImages.push(brandVoice.mascotUrl);
    }
  }

  return { referenceImages, mascotPrompt };
}
