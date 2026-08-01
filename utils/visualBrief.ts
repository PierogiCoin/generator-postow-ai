/**
 * Visual brief for image generation — structured JSON from post + brand.
 */

export interface VisualContentIntent {
  primarySubject: string;
  requiredObjects: string[];
  audience: string;
  coreBenefit: string;
  offer?: string;
  location?: string;
  emotion: string;
  action?: string;
  forbiddenInterpretations: string[];
}

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
  contentIntent: VisualContentIntent;
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

  const intent = brief.contentIntent;

  return [
    brief.fluxPrompt,
    `Scene: ${brief.scene}.`,
    brief.subjects.length ? `Subjects: ${brief.subjects.join(', ')}.` : '',
    `PRIMARY SUBJECT: ${intent.primarySubject}.`,
    intent.requiredObjects.length ? `MUST SHOW: ${intent.requiredObjects.join('; ')}.` : '',
    intent.audience ? `TARGET AUDIENCE: ${intent.audience}.` : '',
    intent.coreBenefit ? `MUST COMMUNICATE VISUALLY: ${intent.coreBenefit}.` : '',
    intent.offer ? `OFFER CONTEXT: ${intent.offer}. Do not render offer text unless explicitly allowed by the text policy.` : '',
    intent.location ? `LOCATION CONTEXT: ${intent.location}.` : '',
    intent.action ? `ACTION: ${intent.action}.` : '',
    intent.emotion ? `EMOTION: ${intent.emotion}.` : '',
    intent.forbiddenInterpretations.length
      ? `DO NOT INVENT OR MISREPRESENT: ${intent.forbiddenInterpretations.join('; ')}.`
      : '',
    `Mood: ${brief.mood}.`,
    colorLine,
    brief.camera ? `Camera: ${brief.camera}.` : '',
    textLine,
    brief.avoid.length ? `AVOID: ${brief.avoid.join('; ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}
