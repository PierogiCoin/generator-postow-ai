import { NextRequest, NextResponse } from 'next/server';
import { withCredits } from '@/lib/api-utils';
import { modelsWithFallback } from '@server/routes/generation/helpers';
import { mapModel } from '@server/lib/mapModel';
import { isGeminiQuotaError, geminiErrorMessage } from '@server/lib/geminiErrors';
import { genAI } from '@server/lib/clients';
import { withTimeout } from '@server/lib/retry';
import logger from '@server/logger';

export async function POST(req: NextRequest) {
  try {
    const creditCheck = await withCredits(req, 'generatePost');
    if ('error' in creditCheck) return creditCheck.error;

    const { user, deduct } = creditCheck;
    const body = await req.json();
    const { model = 'gemini-flash-latest', contents, config } = body;
    
    const candidates = modelsWithFallback(mapModel(model));

    let contentArray = contents;
    if (typeof contents === 'string') {
      contentArray = [{ role: 'user', parts: [{ text: contents }] }];
    }

    const generationConfig = {
      temperature: config?.temperature,
      maxOutputTokens: config?.maxOutputTokens,
      responseMimeType: config?.responseMimeType,
    };

    let lastError: unknown;
    for (const modelName of candidates) {
      try {
        const genModel = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: config?.systemInstruction,
        });

        const result = await withTimeout(
          genModel.generateContentStream({ contents: contentArray, generationConfig }),
          120000,
          'Streaming timed out'
        );

        if (modelName !== candidates[0]) {
          logger.info(`[generate-content-stream] Fallback → ${modelName} succeeded`);
        }

        // We deduct upfront or right before starting stream since we can't easily set headers during stream in Next.js without custom streaming response wrappers
        await deduct(req.nextUrl.pathname, req.method);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                if (chunkText) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunkText })}\n\n`));
                }
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: 'done' })}\n\n`));
              controller.close();
            } catch (err) {
              logger.error('Stream error:', err);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: geminiErrorMessage(err) })}\n\n`));
              controller.close();
            }
          }
        });

        return new NextResponse(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
        
      } catch (error) {
        lastError = error;
        if (!isGeminiQuotaError(error) || modelName === candidates[candidates.length - 1]) {
          break;
        }
        logger.warn(`[generate-content-stream] Quota on ${modelName}, trying next model`);
      }
    }

    logger.error('Error in /api/generate-content-stream:', lastError);
    return NextResponse.json({
      error: geminiErrorMessage(lastError),
      code: isGeminiQuotaError(lastError) ? 'GEMINI_QUOTA_EXCEEDED' : undefined
    }, { status: 500 });
    
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'unknown';
    logger.error('generate-content-stream error:', error);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
