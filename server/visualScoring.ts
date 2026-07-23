/**
 * Vision QA for generated social images (Gemini multimodal).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger.js';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export interface VisualScore {
  overall: number;
  thumbStop: number;
  brandFit: number;
  textLegibility: number;
  platformFit: number;
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
}): Promise<VisualScore> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are a social media creative director. Score this image for publishing on ${params.platform}.

BRIEF INTENT:
${params.briefSummary}

Return ONLY JSON:
{
  "thumbStop": 0-100,
  "brandFit": 0-100,
  "textLegibility": 0-100,
  "platformFit": 0-100,
  "feedback": ["specific issues or strengths"],
  "improvedPromptHint": "one short English regeneration direction if score would be low"
}

CRITERIA:
- thumbStop: clear focal subject, contrast at small size
- brandFit: colors/mood match brief (HEX if mentioned)
- textLegibility: if text appears, must be crisp; garbled AI text = low; no-text images can score 85+
- platformFit: composition suits ${params.platform} feed/thumbnail
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
    const overall = Math.round(
      thumbStop * 0.35 + brandFit * 0.2 + textLegibility * 0.2 + platformFit * 0.25
    );

    let badge: 'red' | 'yellow' | 'green' = 'red';
    if (overall >= 70) badge = 'green';
    else if (overall >= 50) badge = 'yellow';

    return {
      overall,
      thumbStop,
      brandFit,
      textLegibility,
      platformFit,
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
