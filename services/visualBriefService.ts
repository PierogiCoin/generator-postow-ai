import { generateJson } from './apiClient';
import type { BrandVoiceData, Platform } from '../types';
import { getPlatformVisualSpec } from '../utils/platformVisualSpec';
import { type VisualBrief, visualBriefToPrompt } from '../utils/visualBrief';

export type { VisualBrief };
export { visualBriefToPrompt };

function mergeUnique(...arrays: string[][]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const arr of arrays) {
    for (const item of arr) {
      const lower = item.toLowerCase().trim();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(item);
      }
    }
  }
  return result;
}

/**
 * Gemini builds a structured visual brief from the full post (not just 200 chars).
 */
export async function buildVisualBrief(params: {
  postText: string;
  platform: Platform;
  imageStyle: string;
  brandVoice?: BrandVoiceData | null;
  brandColors?: string[];
  visualVibe?: string;
  mascotDescription?: string;
  industryMustShow?: string[];
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
${params.brandVoice?.description ? `BRAND IDENTITY: ${params.brandVoice.description.trim()}` : ''}
${params.brandVoice?.visualStyle ? `BRAND VISUAL STYLE: ${params.brandVoice.visualStyle.trim()}` : ''}
${params.brandVoice?.keywords ? `BRAND KEYWORDS: ${params.brandVoice.keywords.trim()}` : ''}
${params.brandVoice?.avoid ? `VISUAL ELEMENTS TO AVOID: ${params.brandVoice.avoid.trim()}` : ''}
${params.mascotDescription ? `MASCOT (must appear if referenced): ${params.mascotDescription}` : ''}
${params.industryMustShow?.length ? `INDUSTRY MUST SHOW: ${params.industryMustShow.join('; ')}.` : ''}

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
  "fluxPrompt": "One rich English prompt for FLUX.2 image model, photoreal or on-brand, include hex colors as 'hex #XXXXXX', no markdown",
  "contentIntent": {
    "primarySubject": "the single most important subject that must appear",
    "requiredObjects": ["only concrete objects essential to communicate the post"],
    "audience": "who the visual is for",
    "coreBenefit": "the main promise the image must communicate visually",
    "offer": "specific offer/promotion if present, otherwise empty",
    "location": "specific location if present, otherwise empty",
    "emotion": "desired viewer emotion",
    "action": "visible action if relevant, otherwise empty",
    "forbiddenInterpretations": ["plausible but incorrect interpretations or invented claims"]
  }
}

Rules:
- Prefer photorealistic social-native look over stock sterile.
- For Instagram/TikTok: textOnImage should usually be "none".
- For LinkedIn/YouTube: "headline" allowed if short and punchy.
- Extract contentIntent from explicit facts in the post. Do not invent products, people, prices, locations, outcomes, or offers.
- requiredObjects must contain only objects necessary for semantic fidelity.
- forbiddenInterpretations must prevent likely visual misreadings and unsupported claims.
- fluxPrompt must be self-contained and detailed and visually express contentIntent.`,
      },
      params.userId
    );

    return normalizeBrief(brief, params.brandColors, textMode, params.industryMustShow);
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
  textMode: VisualBrief['textOnImage'],
  industryMustShow?: string[]
): VisualBrief {
  const colors =
    Array.isArray(brief.brandHexColors) && brief.brandHexColors.length > 0
      ? brief.brandHexColors
      : brandColors || [];

  const contentIntent = brief.contentIntent;

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
    contentIntent: {
      primarySubject: contentIntent?.primarySubject || brief.subjects?.[0] || brief.scene || 'main post subject',
      requiredObjects: mergeUnique(
        Array.isArray(contentIntent?.requiredObjects) ? contentIntent.requiredObjects : [],
        industryMustShow || []
      ),
      audience: contentIntent?.audience || '',
      coreBenefit: contentIntent?.coreBenefit || '',
      offer: contentIntent?.offer || undefined,
      location: contentIntent?.location || undefined,
      emotion: contentIntent?.emotion || brief.mood || 'interest',
      action: contentIntent?.action || undefined,
      forbiddenInterpretations: Array.isArray(contentIntent?.forbiddenInterpretations)
        ? contentIntent.forbiddenInterpretations
        : ['unsupported claims', 'unrelated products or services'],
    },
  };
}

function fallbackBrief(
  params: {
    postText: string;
    platform: Platform;
    imageStyle: string;
    brandVoice?: BrandVoiceData | null;
    brandColors?: string[];
    visualVibe?: string;
    industryMustShow?: string[];
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
      params.brandVoice?.description ? `Brand identity: ${params.brandVoice.description.trim()}.` : '',
      params.brandVoice?.visualStyle ? `Brand visual style: ${params.brandVoice.visualStyle.trim()}.` : '',
      params.brandVoice?.keywords ? `Brand keywords: ${params.brandVoice.keywords.trim()}.` : '',
      params.brandVoice?.avoid ? `Avoid: ${params.brandVoice.avoid.trim()}.` : '',
      params.visualVibe ? `Vibe: ${params.visualVibe}` : '',
      params.industryMustShow?.length ? `MUST SHOW: ${params.industryMustShow.join('; ')}.` : '',
      textMode === 'none' ? 'NO text on image.' : '',
    ]
      .filter(Boolean)
      .join(' '),
    contentIntent: {
      primarySubject: params.postText.slice(0, 160),
      requiredObjects: params.industryMustShow || [],
      audience: '',
      coreBenefit: '',
      emotion: spec.colorTone,
      forbiddenInterpretations: ['unsupported claims', 'unrelated products or services'],
    },
  };
}
