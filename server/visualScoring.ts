/**
 * Vision QA for generated social images (Gemini multimodal).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger';
import { VISUAL_QA_MIN_SCORE } from '../src/shared/config/generationConfig';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export interface VisualScore {
  overall: number;
  thumbStop: number;
  brandFit: number;
  textLegibility: number;
  platformFit: number;
  contentMatch: number;
  subjectAccuracy: number;
  offerMatch: number;
  audienceMatch: number;
  negativeMatch: number;
  feedback: string[];
  improvedPromptHint?: string;
  badge: 'red' | 'yellow' | 'green';
}

export class VisualScoringUnavailableError extends Error {
  constructor(message = 'Visual scoring unavailable') {
    super(message);
    this.name = 'VisualScoringUnavailableError';
  }
}

export async function scoreImageVisual(params: {
  base64: string;
  mimeType: string;
  platform: string;
  briefSummary: string;
  postText: string;
  negativePrompt?: string;
  contentIntent: {
    primarySubject?: string;
    requiredObjects?: string[];
    audience?: string;
    coreBenefit?: string;
    offer?: string;
    location?: string;
    emotion?: string;
    action?: string;
    forbiddenInterpretations?: string[];
  };
}): Promise<VisualScore> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are a social media creative director. Score this image for publishing on ${params.platform}.

BRIEF INTENT:
${params.briefSummary}

POST TEXT:
${params.postText.slice(0, 4000)}

STRUCTURED CONTENT INTENT:
${JSON.stringify(params.contentIntent)}

Return ONLY JSON:
{
  "thumbStop": 0-100,
  "brandFit": 0-100,
  "textLegibility": 0-100,
  "platformFit": 0-100,
  "contentMatch": 0-100,
  "subjectAccuracy": 0-100,
  "offerMatch": 0-100,
  "audienceMatch": 0-100,
  "negativeMatch": 0-100,
  "feedback": ["specific issues or strengths"],
  "improvedPromptHint": "one short English regeneration direction if score would be low"
}

CRITERIA:
- thumbStop: clear focal subject, contrast at small size
- brandFit: colors/mood match brief (HEX if mentioned)
- textLegibility: if text appears, must be crisp; garbled AI text = low; no-text images can score 85+
- platformFit: composition suits ${params.platform} feed/thumbnail
- contentMatch: image communicates the post's actual central message and core benefit
- subjectAccuracy: required subject and objects are visibly correct; penalize generic metaphors replacing them
- offerMatch: image does not contradict or invent the offer; if no offer is required, score 100 when no unsupported offer is shown
- audienceMatch: people, context, and visual language fit the intended audience
- negativeMatch: if a negative prompt / avoid list is provided, check that no forbidden elements appear; if none are present, score 100
- Treat unsupported products, claims, prices, locations, or outcomes as severe semantic failures
`; 

  try {
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: params.mimeType || 'image/jpeg',
          data: params.base64,
        },
      },
    ]);

    const text = result.response.text().trim();
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const analysis = JSON.parse(jsonText);

    const thumbStop = Number(analysis.thumbStop) || 0;
    const brandFit = Number(analysis.brandFit) || 0;
    const textLegibility = Number(analysis.textLegibility) || 0;
    const platformFit = Number(analysis.platformFit) || 0;
    const contentMatch = Number(analysis.contentMatch) || 0;
    const subjectAccuracy = Number(analysis.subjectAccuracy) || 0;
    const offerMatch = Number(analysis.offerMatch) || 0;
    const audienceMatch = Number(analysis.audienceMatch) || 0;
    const negativeMatch = Number(analysis.negativeMatch) || 100;
    const overall = Math.round(
      thumbStop * 0.2 +
      brandFit * 0.12 +
      textLegibility * 0.1 +
      platformFit * 0.15 +
      contentMatch * 0.2 +
      subjectAccuracy * 0.13 +
      offerMatch * 0.05 +
      audienceMatch * 0.045 +
      negativeMatch * 0.005
    );

    let badge: 'red' | 'yellow' | 'green' = 'red';
    if (overall >= VISUAL_QA_MIN_SCORE + 15) badge = 'green';
    else if (overall >= VISUAL_QA_MIN_SCORE) badge = 'yellow';

    return {
      overall,
      thumbStop,
      brandFit,
      textLegibility,
      platformFit,
      contentMatch,
      subjectAccuracy,
      offerMatch,
      audienceMatch,
      negativeMatch,
      feedback: Array.isArray(analysis.feedback) ? analysis.feedback : [],
      improvedPromptHint: analysis.improvedPromptHint,
      badge,
    };
  } catch (error) {
    logger.warn('[VisualScore] Failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new VisualScoringUnavailableError(
      error instanceof Error ? error.message : 'Failed to score image'
    );
  }
}
