import { generateJson } from './apiClient';
import type { Platform } from '../types';
import { getPlatformVisualSpec } from '../utils/platformVisualSpec';
import { type VisualBrief, visualBriefToPrompt } from '../utils/visualBrief';

export type { VisualBrief };
export { visualBriefToPrompt };

/**
 * Gemini builds a structured visual brief from the full post (not just 200 chars).
 */
export async function buildVisualBrief(params: {
  postText: string;
  platform: Platform;
  imageStyle: string;
  brandColors?: string[];
  visualVibe?: string;
  mascotDescription?: string;
  userId: string;
}): Promise<VisualBrief> {
  const spec = getPlatformVisualSpec(params.platform);
  const textMode =
    spec.textOverlay === 'none' ? 'none' : spec.textOverlay === 'allowed' ? 'headline' : 'minimal';

  try {
    const brief = await generateJson<VisualBrief>(
      {
        model: 'gemini-2.5-flash',
        contents: `Create a JSON visual brief for a social media image.

PLATFORM: ${params.platform}
POST (full):
"""
${params.postText.slice(0, 2500)}
"""
VISUAL STYLE: ${params.imageStyle}
${params.visualVibe ? `VIBE: ${params.visualVibe}` : ''}
${params.brandColors?.length ? `BRAND HEX COLORS: ${params.brandColors.join(', ')}` : ''}
${params.mascotDescription ? `MASCOT (must appear if referenced): ${params.mascotDescription}` : ''}

Platform composition: ${spec.composition}
Color tone: ${spec.colorTone}
Text on image preference: ${textMode}
Avoid: ${spec.avoid.join('; ')}

Return JSON with exactly these keys:
{
  "scene": "1-2 sentence scene description",
  "subjects": ["main subject", "..."],
  "mood": "short mood",
  "brandHexColors": ["#RRGGBB"],
  "textOnImage": "none" | "minimal" | "headline",
  "headline": "optional short headline if textOnImage is headline",
  "camera": "camera/lens vibe e.g. 35mm f/1.8 natural light",
  "avoid": ["..."],
  "fluxPrompt": "One rich English prompt for FLUX.2 image model, photoreal or on-brand, include hex colors as 'hex #XXXXXX', no markdown"
}

Rules:
- Prefer photorealistic social-native look over stock sterile.
- For Instagram/TikTok: textOnImage should usually be "none".
- For LinkedIn/YouTube: "headline" allowed if short and punchy.
- fluxPrompt must be self-contained and detailed.`,
      },
      params.userId
    );

    return normalizeBrief(brief, params.brandColors, textMode);
  } catch (error: unknown) {
    console.warn('[visualBriefService] buildVisualBrief failed, using fallback', {
      error: error instanceof Error ? error.message : String(error),
      platform: params.platform,
      hasBrandColors: Boolean(params.brandColors?.length),
      hasVisualVibe: Boolean(params.visualVibe),
    });
    return fallbackBrief(params, textMode);
  }
}

function normalizeBrief(
  brief: Partial<VisualBrief>,
  brandColors: string[] | undefined,
  textMode: VisualBrief['textOnImage']
): VisualBrief {
  const colors =
    Array.isArray(brief.brandHexColors) && brief.brandHexColors.length > 0
      ? brief.brandHexColors
      : brandColors || [];

  return {
    scene: brief.scene || 'Product or lifestyle hero shot for social feed',
    subjects: Array.isArray(brief.subjects) ? brief.subjects : [],
    mood: brief.mood || 'authentic, high contrast',
    brandHexColors: colors,
    textOnImage: brief.textOnImage || textMode,
    headline: brief.headline,
    camera: brief.camera || 'shot on 35mm, natural light',
    avoid: Array.isArray(brief.avoid) ? brief.avoid : ['stock photo look', 'tiny illegible text'],
    fluxPrompt:
      brief.fluxPrompt ||
      `High quality social media photo, ${brief.scene || 'lifestyle'}, ${brief.mood || 'authentic'}`,
  };
}

function fallbackBrief(
  params: {
    postText: string;
    platform: Platform;
    imageStyle: string;
    brandColors?: string[];
    visualVibe?: string;
  },
  textMode: VisualBrief['textOnImage']
): VisualBrief {
  const spec = getPlatformVisualSpec(params.platform);
  const colors = params.brandColors || [];
  const colorLine = colors.length ? colors.map((c) => `hex ${c}`).join(', ') : '';
  return {
    scene: params.postText.slice(0, 160),
    subjects: [],
    mood: spec.colorTone,
    brandHexColors: colors,
    textOnImage: textMode,
    camera: '35mm natural light',
    avoid: spec.avoid,
    fluxPrompt: [
      `High quality ${params.platform} social image.`,
      `Style: ${params.imageStyle}.`,
      `Composition: ${spec.composition}.`,
      colorLine,
      params.visualVibe ? `Vibe: ${params.visualVibe}` : '',
      textMode === 'none' ? 'NO text on image.' : '',
    ]
      .filter(Boolean)
      .join(' '),
  };
}
