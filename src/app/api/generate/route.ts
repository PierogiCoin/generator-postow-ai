import { NextRequest, NextResponse } from 'next/server';
import { withCredits } from '@/lib/api-utils';
import { genAI } from '@server/lib/clients';
import { mapModel } from '@server/lib/mapModel';
import logger from '@server/logger';

export async function POST(req: NextRequest) {
  try {
    const creditCheck = await withCredits(req, 'generatePost');
    if ('error' in creditCheck) return creditCheck.error;

    const { deduct } = creditCheck;
    const body = await req.json();
    const { prompt, history, model = 'gemini-flash-latest' } = body;
    
    const modelName = mapModel(model);
    const genModel = genAI.getGenerativeModel({ model: modelName });

    const chat = genModel.startChat({
      history: history || [],
    });

    const result = await chat.sendMessageStream(prompt);
    
    await deduct(req.nextUrl.pathname, req.method);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(encoder.encode(chunkText));
            }
          }
          controller.close();
        } catch (err) {
          logger.error('Chat stream error:', err);
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });

  } catch (error: unknown) {
    logger.error('Error in /api/generate:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
