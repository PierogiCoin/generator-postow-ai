/**
 * Visual brief for image generation — structured JSON from post + brand.
 */

export interface VisualBrief {
  scene: string;
  subjects: string[];
  mood: string;
  brandHexColors: string[];
  textOnImage: 'none' | 'minimal' | 'headline';
  headline?: string;
  camera?: string;
  avoid: string[];
  fluxPrompt: string;
}

export function visualBriefToPrompt(brief: VisualBrief): string {
  const colorLine =
    brief.brandHexColors.length > 0
      ? `Brand colors (exact HEX): ${brief.brandHexColors.map((c) => `hex ${c}`).join(', ')}.`
      : '';

  const textLine =
    brief.textOnImage === 'none'
      ? 'NO text, letters, watermarks, or logos rendered in the image.'
      : brief.textOnImage === 'headline' && brief.headline
        ? `Include a short highly legible headline on image: "${brief.headline}".`
        : 'Minimal short text only if essential for composition.';

  return [
    brief.fluxPrompt,
    `Scene: ${brief.scene}.`,
    brief.subjects.length ? `Subjects: ${brief.subjects.join(', ')}.` : '',
    `Mood: ${brief.mood}.`,
    colorLine,
    brief.camera ? `Camera: ${brief.camera}.` : '',
    textLine,
    brief.avoid.length ? `AVOID: ${brief.avoid.join('; ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}
