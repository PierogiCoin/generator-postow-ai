import { Platform, VisualStyle } from '../types';

export type VisualAspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface PlatformVisualSpec {
  platform: Platform;
  /** Domyślny format grafiki */
  defaultAspectRatio: VisualAspectRatio;
  /** Dozwolone proporcje w UI */
  allowedAspectRatios: VisualAspectRatio[];
  /** Krótki opis dla UI */
  summaryPl: string;
  /** Instrukcje kompozycji dla promptu obrazu */
  composition: string;
  colorTone: string;
  textOverlay: 'none' | 'minimal' | 'allowed';
  promptDirectives: string[];
  avoid: string[];
}

const SPECS: Record<Platform, PlatformVisualSpec> = {
  [Platform.Facebook]: {
    platform: Platform.Facebook,
    defaultAspectRatio: '16:9',
    allowedAspectRatios: ['16:9', '1:1', '4:3'],
    summaryPl: 'Feed FB: kontrast, czytelność na mobile, 1.91:1 lub kwadrat.',
    composition:
      'Landscape feed card (1.91:1 feel), subject centered, safe margins for mobile crop, room for optional short text overlay in lower third.',
    colorTone: 'Warm, high contrast, approachable lifestyle or product hero shot',
    textOverlay: 'minimal',
    promptDirectives: [
      'Optimized for Facebook feed scroll-stopping thumb-stop',
      'Clear focal point visible at small size',
      'Authentic UGC-adjacent look performs better than stock-photo sterile',
    ],
    avoid: ['Tiny text', 'Cluttered collages', 'Vertical-only framing'],
  },
  [Platform.Instagram]: {
    platform: Platform.Instagram,
    defaultAspectRatio: '1:1',
    allowedAspectRatios: ['1:1', '4:3', '9:16'],
    summaryPl: 'IG feed: kwadrat lub 4:5, żywe kolory, estetyka lifestyle.',
    composition:
      'Square or portrait feed aesthetic, vibrant cohesive palette, lifestyle or product flat-lay, clean negative space.',
    colorTone: 'Vibrant, saturated, cohesive Instagram aesthetic',
    textOverlay: 'none',
    promptDirectives: [
      'Instagram-native visual: aesthetic, aspirational, scroll-worthy',
      'No heavy text on image — caption carries message',
      'Strong color harmony and natural lighting',
    ],
    avoid: ['Corporate stock look', 'Dense paragraphs on image', 'Low saturation muddy tones'],
  },
  [Platform.LinkedIn]: {
    platform: Platform.LinkedIn,
    defaultAspectRatio: '16:9',
    allowedAspectRatios: ['16:9', '1:1', '4:3'],
    summaryPl: 'LinkedIn: profesjonalnie, czysto, biznesowy kontekst.',
    composition:
      'Professional thought-leadership visual, clean layout, subtle brand colors, people in business context or abstract data metaphor.',
    colorTone: 'Professional, restrained, trustworthy blues and neutrals',
    textOverlay: 'allowed',
    promptDirectives: [
      'B2B professional — credible, not flashy',
      'Suitable for executives and decision-makers',
      'Infographic-style headline allowed if legible',
    ],
    avoid: ['Meme aesthetics', 'Overly casual party imagery', 'Clickbait neon'],
  },
  [Platform.X]: {
    platform: Platform.X,
    defaultAspectRatio: '16:9',
    allowedAspectRatios: ['16:9', '1:1', '4:3'],
    summaryPl: 'X: mocny hook wizualny, prosty kadr, dobrze w timeline.',
    composition:
      'Bold simple composition, high contrast silhouette or single striking object, works in fast-scrolling timeline.',
    colorTone: 'High contrast, punchy, meme-friendly or newsy',
    textOverlay: 'minimal',
    promptDirectives: [
      'Timeline-optimized: instant read in under 1 second',
      'Strong contrast and single clear subject',
      'Works at small preview size',
    ],
    avoid: ['Busy backgrounds', 'Multiple competing subjects'],
  },
  [Platform.TikTok]: {
    platform: Platform.TikTok,
    defaultAspectRatio: '9:16',
    allowedAspectRatios: ['9:16', '1:1'],
    summaryPl: 'TikTok: pion 9:16, dynamiczny kadr, thumbnail energy.',
    composition:
      'Vertical 9:16 cover/thumbnail energy, dynamic angle, face or action near center-top safe zone, bold movement implied.',
    colorTone: 'Energetic, youthful, high saturation',
    textOverlay: 'minimal',
    promptDirectives: [
      'TikTok cover frame: vertical, energetic, Gen-Z native',
      'Face or product hero in upper two-thirds',
      'Feels like a paused video frame not a static ad',
    ],
    avoid: ['Horizontal landscape', 'Static corporate poses'],
  },
  [Platform.YouTube]: {
    platform: Platform.YouTube,
    defaultAspectRatio: '16:9',
    allowedAspectRatios: ['16:9', '4:3'],
    summaryPl: 'YouTube thumbnail: 16:9, twarz + emocja + kontrast.',
    composition:
      'YouTube thumbnail style 16:9, expressive face or clear object, 3-element rule, high contrast background separation.',
    colorTone: 'Bold complementary colors, thumbnail click-optimized',
    textOverlay: 'allowed',
    promptDirectives: [
      'Click-worthy YouTube thumbnail composition',
      'Exaggerated readable emotion or curiosity gap',
      'Background blur or solid color separation from subject',
    ],
    avoid: ['Flat low-contrast imagery', 'Illegible small text'],
  },
};

export function getPlatformVisualSpec(platform: Platform): PlatformVisualSpec {
  return SPECS[platform] ?? SPECS[Platform.Facebook];
}

export function resolveAspectRatioForPlatform(
  platform: Platform,
  userRatio?: VisualAspectRatio,
  visualStyle?: VisualStyle
): VisualAspectRatio {
  const spec = getPlatformVisualSpec(platform);
  if (visualStyle === VisualStyle.PlatformSpecific) {
    return spec.defaultAspectRatio;
  }
  if (userRatio && spec.allowedAspectRatios.includes(userRatio)) {
    return userRatio;
  }
  return userRatio || spec.defaultAspectRatio;
}

export function buildPlatformImagePrompt(params: {
  postText: string;
  platform: Platform;
  imageStyle: string;
  visualVibe?: string;
  mascotPrompt?: string;
  postMortemHint?: string;
}): string {
  const spec = getPlatformVisualSpec(params.platform);
  const lines = [
    `High quality social media image for ${params.platform}.`,
    `Topic/context from post: "${params.postText.substring(0, 200)}".`,
    `Visual style: ${params.imageStyle}.`,
    `Composition: ${spec.composition}`,
    `Color & mood: ${spec.colorTone}.`,
    `Text on image: ${spec.textOverlay === 'none' ? 'NO text on image' : spec.textOverlay === 'minimal' ? 'minimal short text only if essential' : 'short headline allowed if highly legible'}.`,
    ...spec.promptDirectives.map((d) => `- ${d}`),
    spec.avoid.length ? `AVOID: ${spec.avoid.join('; ')}.` : '',
  ];

  if (params.visualVibe) {
    lines.push(`Maintain visual vibe: ${params.visualVibe}.`);
  }
  if (params.mascotPrompt) {
    lines.push(params.mascotPrompt);
  }
  if (params.postMortemHint) {
    lines.push(`PROVEN STYLE: ${params.postMortemHint}`);
  }

  return lines.filter(Boolean).join(' ');
}

export function isAspectRatioAllowedForPlatform(
  platform: Platform,
  ratio: VisualAspectRatio
): boolean {
  return getPlatformVisualSpec(platform).allowedAspectRatios.includes(ratio);
}
