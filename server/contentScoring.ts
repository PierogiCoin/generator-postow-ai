/**
 * 🎯 AI-POWERED CONTENT QUALITY SCORING
 * 
 * Ocenia jakość contentu przed publikacją i daje sugestie ulepszeń
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger.js';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export interface ContentScore {
  overall: number; // 0-100
  engagement: {
    score: number;
    level: 'low' | 'medium' | 'high';
    feedback: string[];
  };
  seo: {
    score: number;
    level: 'low' | 'medium' | 'high';
    feedback: string[];
  };
  platformFit: {
    score: number;
    level: 'poor' | 'good' | 'excellent';
    feedback: string[];
  };
  suggestions: string[];
  badge: 'red' | 'yellow' | 'green';
  /** Calibrated auto-publish threshold (may differ from default 70). */
  calibratedMinScore?: number;
  calibrationSampleSize?: number;
}

/**
 * Główna funkcja scoringu
 */
export async function scoreContent(
  content: string,
  platform: string,
  context?: {
    hasHashtags?: boolean;
    hasEmojis?: boolean;
    targetAudience?: string;
    userId?: string;
  }
): Promise<ContentScore> {

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
You are a professional social media content analyst. Analyze this content and provide a detailed quality score.

CONTENT: "${content}"
PLATFORM: ${platform}
CONTEXT: ${JSON.stringify(context || {})}

Provide a JSON response with this structure:
{
  "engagement": {
    "score": 0-100,
    "level": "low/medium/high",
    "feedback": ["specific feedback points"]
  },
  "seo": {
    "score": 0-100,
    "level": "low/medium/high", 
    "feedback": ["keyword usage, readability, structure"]
  },
  "platformFit": {
    "score": 0-100,
    "level": "poor/good/excellent",
    "feedback": ["how well it fits ${platform}"]
  },
  "suggestions": ["actionable improvements"]
}

SCORING CRITERIA:

ENGAGEMENT (0-100):
- Emotional hook (first 3 words)
- Storytelling / narrative flow
- Call-to-action clarity
- Emoji usage (platform-appropriate)
- Length optimization (TikTok: short, LinkedIn: longer)
- Curiosity gap / cliffhanger

SEO (0-100):
- Keyword density (not overstuffed)
- Readability (Flesch score equivalent)
- Sentence variety
- Hashtag relevance (#3-5 for Instagram, #1-3 for LinkedIn)
- Searchable phrases

PLATFORM FIT (0-100):
- TikTok: Casual, trends, humor, Gen Z language
- Instagram: Visual-first, lifestyle, aspirational
- LinkedIn: Professional, insights, value-driven
- Facebook: Community-focused, relatable, conversational
- Twitter/X: Concise, witty, news/opinion-driven

Return ONLY valid JSON, no markdown.
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Usuń markdown code blocks jeśli są
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const analysis = JSON.parse(jsonText);

    // Oblicz overall score (średnia ważona)
    let overall = Math.round(
      (analysis.engagement.score * 0.4) +
      (analysis.seo.score * 0.3) +
      (analysis.platformFit.score * 0.3)
    );

    let engagementScore = Number(analysis.engagement.score) || 0;
    let calibratedMinScore = 70;
    let calibrationSampleSize = 0;

    if (context?.userId) {
      try {
        const { getQualityCalibration, applyCalibrationToScore } = await import(
          './lib/qualityCalibration.js'
        );
        const calibration = await getQualityCalibration(context.userId, platform);
        const applied = applyCalibrationToScore(overall, engagementScore, calibration);
        overall = applied.overall;
        engagementScore = applied.engagementScore;
        calibratedMinScore = applied.minScore;
        calibrationSampleSize = calibration.sampleSize;
        analysis.engagement.score = engagementScore;
      } catch {
        /* keep uncalibrated */
      }
    }

    // Ustal badge względem skalibrowanego progu
    let badge: 'red' | 'yellow' | 'green';
    if (overall >= calibratedMinScore) badge = 'green';
    else if (overall >= calibratedMinScore - 20) badge = 'yellow';
    else badge = 'red';

    return {
      overall,
      engagement: analysis.engagement,
      seo: analysis.seo,
      platformFit: analysis.platformFit,
      suggestions: analysis.suggestions,
      badge,
      calibratedMinScore,
      calibrationSampleSize,
    };

  } catch (error) {
    logger.error('[Content Scoring] Error:', error);
    // Fallback: basic scoring
    return getFallbackScore(content, platform);
  }
}

/**
 * Fallback scoring (jeśli API zawiedzie)
 */
function getFallbackScore(content: string, platform: string): ContentScore {
  const length = content.length;
  const hasEmojis = /[\u{1F600}-\u{1F64F}]/u.test(content);
  const hasHashtags = content.includes('#');
  const hasQuestion = content.includes('?');
  const hasCTA = /\b(klik|sprawdź|zobacz|download|kupić|dołącz|zapisz|link)\b/i.test(content);

  let score = 50; // Bazowy

  // Długość
  if (platform === 'TikTok' && length < 150) score += 10;
  if (platform === 'LinkedIn' && length > 200 && length < 600) score += 10;
  if (platform === 'Twitter' && length < 280) score += 10;

  // Emoji
  if (hasEmojis) score += 5;

  // Hashtagi
  if (hasHashtags) score += 5;

  // Pytanie (engagement)
  if (hasQuestion) score += 10;

  // CTA
  if (hasCTA) score += 10;

  const badge = score >= 70 ? 'green' : score >= 50 ? 'yellow' : 'red';

  return {
    overall: Math.min(score, 100),
    engagement: {
      score: score,
      level: score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low',
      feedback: ['Automatic analysis unavailable']
    },
    seo: {
      score: score,
      level: score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low',
      feedback: ['Automatic analysis unavailable']
    },
    platformFit: {
      score: score,
      level: score >= 70 ? 'excellent' : score >= 50 ? 'good' : 'poor',
      feedback: [`Content length: ${length} characters`]
    },
    suggestions: [
      !hasEmojis && 'Dodaj emoji dla większego zaangażowania',
      !hasHashtags && 'Dodaj relevantne hashtagi (#3-5)',
      !hasCTA && 'Dodaj wyraźne Call-to-Action',
      length < 50 && 'Content może być za krótki - rozbuduj historię'
    ].filter(Boolean) as string[],
    badge
  };
}

/**
 * Szybka walidacja przed pełnym scoringiem
 */
export function quickValidate(content: string, platform: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Długość
  if (content.length < 10) errors.push('Content jest za krótki (min. 10 znaków)');
  if (platform === 'Twitter' && content.length > 280) errors.push('Twitter limit: 280 znaków');
  if (platform === 'Instagram' && content.length > 2200) errors.push('Instagram limit: 2200 znaków');

  // Spam detection
  const exclamationCount = (content.match(/!/g) || []).length;
  if (exclamationCount > 5) errors.push('Zbyt wiele wykrzykników (wygląda jak spam)');

  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.5) errors.push('Zbyt dużo CAPS LOCKA (wygląda jak krzyk)');

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Benchmark konkurencji (opcjonalne - future feature)
 */
export async function compareWithBenchmark(
  content: string,
  platform: string,
  niche: string
): Promise<{
  yourScore: number;
  averageScore: number;
  topPerformers: number;
  position: 'bottom_25' | 'average' | 'top_25' | 'top_10';
}> {
  // Note: Mock implementation - integrate with viral content database when available
  const yourScore = (await scoreContent(content, platform)).overall;

  return {
    yourScore,
    averageScore: 65,
    topPerformers: 85,
    position: yourScore >= 85 ? 'top_10' :
      yourScore >= 75 ? 'top_25' :
        yourScore >= 50 ? 'average' : 'bottom_25'
  };
}
