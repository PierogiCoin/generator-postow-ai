import { NextRequest, NextResponse } from 'next/server';
import { withCredits } from '@/lib/api-utils';
import { genAI } from '../../../../server/lib/clients';
import { retryWithBackoff, withTimeout } from '../../../../server/lib/retry';
import logger from '../../../../server/logger';

const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  Facebook: 63206,
  Instagram: 2200,
  TikTok: 2200,
  X: 280,
  LinkedIn: 3000,
  YouTube: 5000,
};

async function optimizeOnePlatform(platform: string, originalText: string, tone: string) {
  const systemPrompt = `You are a social media expert. Optimize this post for ${platform} (Tone: ${tone}).
    Original: "${originalText}"
    Return ONLY valid JSON: { "text": "...", "hashtags": [], "tips": [] }`;

  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  const result = await retryWithBackoff(
    () => withTimeout(model.generateContent(systemPrompt), 75_000, `Optimization timed out for ${platform}`),
    { maxRetries: 2, baseDelay: 1000 }
  );
  
  const response = await result.response;
  const text = response.text().trim().replace(/```json/g, '').replace(/```/g, '');
  const aiResult = JSON.parse(text) as { text: string; hashtags?: string[]; tips?: string[] };

  return {
    platform,
    text: aiResult.text,
    hashtags: aiResult.hashtags || [],
    characterCount: aiResult.text.length,
    characterLimit: PLATFORM_CHAR_LIMITS[platform] ?? 2200,
    tips: aiResult.tips || [],
    engagement: { score: 85, prediction: 'Wysoki potencjał (AI)' },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { originalText, targetPlatforms, tone } = body;
    
    const platformsCount = Math.max(1, Array.isArray(targetPlatforms) ? targetPlatforms.length : 1);
    
    // We override cost in withCredits since it's a multiplier
    const creditCheck = await withCredits(req, 'contentOptimization', 2 * platformsCount);
    if ('error' in creditCheck) return creditCheck.error;
    
    const { deduct } = creditCheck;

    const settled = await Promise.allSettled(
      targetPlatforms.map((platform: string) => optimizeOnePlatform(platform, originalText, tone))
    );

    const optimizations = settled
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof optimizeOnePlatform>>> => r.status === 'fulfilled')
      .map((r) => r.value);

    settled.forEach((r, i) => {
      if (r.status === 'rejected') {
        logger.error(`Optimization failed for ${targetPlatforms[i]}`, r.reason);
      }
    });

    if (optimizations.length === 0) {
      return NextResponse.json({ message: 'Nie udało się zoptymalizować żadnej platformy. Spróbuj ponownie.' }, { status: 500 });
    }
    
    await deduct(req.nextUrl.pathname, req.method);

    return NextResponse.json(optimizations);
  } catch (error: unknown) {
    const err = error as { message?: string };
    logger.error('Error in /api/optimize-multi-platform:', error);
    return NextResponse.json({ message: err.message || 'Optymalizacja multi-platform nie powiodła się' }, { status: 500 });
  }
}
