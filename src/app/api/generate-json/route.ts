import { NextRequest, NextResponse } from 'next/server';
import { withCredits } from '@/lib/api-utils';
import { runTextGeneration, modelsWithFallback, sendGenerationError } from '../../../../server/routes/generation/helpers';
import { mapModel } from '../../../../server/lib/mapModel';
import { isGeminiQuotaError, geminiErrorMessage } from '../../../../server/lib/geminiErrors';
import { startGenerationTrace } from '../../../../server/lib/langfuse';
import logger from '../../../../server/logger';

export async function POST(req: NextRequest) {
  try {
    const creditCheck = await withCredits(req, 'generatePost');
    if ('error' in creditCheck) return creditCheck.error;

    const { user, deduct } = creditCheck;
    const body = await req.json();
    const { model = 'gemini-flash-latest', contents, config, systemInstruction } = body;
    
    const primaryModel = mapModel(model);
    const candidates = modelsWithFallback(primaryModel);
    const inputPreview = typeof contents === 'string' ? contents : JSON.stringify(contents)?.slice(0, 1500);

    const trace = startGenerationTrace({
      name: 'generate-json',
      userId: user.id,
      model: primaryModel,
      inputPreview,
      tags: ['generate-json', 'json'],
      metadata: { candidates },
    });

    let lastError: unknown;
    for (const modelName of candidates) {
      try {
        const mergedConfig = {
          ...config,
          responseMimeType: 'application/json',
          ...(systemInstruction && !config?.systemInstruction ? { systemInstruction } : {}),
        };
        
        const result = await runTextGeneration(modelName, contents, mergedConfig);
        if (modelName !== primaryModel) {
          logger.info(`[generate-json] Fallback ${primaryModel} → ${modelName} succeeded`);
        }
        trace.end({ output: result.text, model: modelName });
        
        await deduct(req.nextUrl.pathname, req.method);

        let parsed: unknown;
        try {
          parsed = JSON.parse(result.text);
        } catch {
          parsed = { raw: result.text };
        }
        
        return NextResponse.json(parsed);
      } catch (error) {
        lastError = error;
        if (!isGeminiQuotaError(error) || modelName === candidates[candidates.length - 1]) {
          break;
        }
        logger.warn(`[generate-json] Quota on ${modelName}, trying ${candidates[candidates.indexOf(modelName) + 1]}`);
      }
    }

    trace.end({
      level: 'ERROR',
      statusMessage: geminiErrorMessage(lastError),
      model: primaryModel,
    });
    
    return NextResponse.json({
      message: geminiErrorMessage(lastError),
      code: isGeminiQuotaError(lastError) ? 'GEMINI_QUOTA_EXCEEDED' : undefined,
    }, { status: 500 });
    
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'unknown';
    logger.error('generate-json error:', error);
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
