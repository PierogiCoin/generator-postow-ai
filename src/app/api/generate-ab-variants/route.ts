import { NextRequest, NextResponse } from 'next/server';
import { withCredits } from '@/lib/api-utils';
import { genAI } from '@server/lib/clients';

export async function POST(req: NextRequest) {
  try {
    const creditCheck = await withCredits(req, 'contentOptimization');
    if ('error' in creditCheck) return creditCheck.error;

    const { deduct } = creditCheck;
    const body = await req.json();
    const { originalText, platform, tone } = body;
    
    const systemPrompt = `Create A/B variants for ${platform} (${tone}). Original: "${originalText}". Return JSON: { "variantA": "...", "variantB": "..." }`;

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(systemPrompt);
    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '');

    await deduct(req.nextUrl.pathname, req.method);

    return NextResponse.json(JSON.parse(text));
  } catch (error: unknown) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}
