import type { Response } from 'express';
import logger from '../../logger.js';
import { genAI } from '../../lib/clients.js';
import { retryWithBackoff, withTimeout } from '../../lib/retry.js';
import {
  isGeminiQuotaError,
  geminiErrorStatus,
  geminiErrorMessage,
} from '../../lib/geminiErrors.js';
import { enforceAntiSlopTextServer } from '../../lib/antiSlop.js';

export async function runTextGeneration(
  modelName: string,
  contents: unknown,
  config: Record<string, unknown> | undefined
): Promise<{ text: string; candidates?: unknown; usageMetadata?: unknown }> {
  const genModel = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: config?.systemInstruction as string | undefined,
  });

  const generationConfig = {
    temperature: config?.temperature as number | undefined,
    maxOutputTokens: config?.maxOutputTokens as number | undefined,
    topP: config?.topP as number | undefined,
    topK: config?.topK as number | undefined,
    stopSequences: config?.stopSequences as string[] | undefined,
    responseMimeType: config?.responseMimeType as string | undefined,
  };

  const tools = config?.tools as unknown[] | undefined;

  let finalContents = contents;
  if (typeof contents === 'string') {
    finalContents = [{ role: 'user', parts: [{ text: contents }] }];
  }

  const result = await retryWithBackoff(
    () =>
      withTimeout(
        genModel.generateContent({
            contents: finalContents as Parameters<typeof genModel.generateContent>[0],
            generationConfig,
            ...(tools?.length ? { tools: tools as never } : {}),
          } as never),
        120000,
        'Text generation timed out'
      ),
    { maxRetries: 3, baseDelay: 1000 }
  );

  const response = await result.response;
  const rawText = response.text();
  const cleaned = await enforceAntiSlopTextServer(rawText);

  return {
    text: cleaned.text,
    candidates: response.candidates,
    usageMetadata: response.usageMetadata,
  };
}

export function modelsWithFallback(modelName: string): string[] {
  if (modelName.includes('lite')) return [modelName];
  if (modelName.includes('2.0') || modelName.includes('2.5')) {
    return [modelName, 'gemini-flash-latest', 'gemini-flash-lite-latest'];
  }
  if (modelName.includes('pro')) {
    return [modelName, 'gemini-2.5-flash', 'gemini-flash-lite-latest'];
  }
  return ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest'];
}

export function sendGenerationError(res: Response, error: unknown): void {
  const status = geminiErrorStatus(error);
  const message = geminiErrorMessage(error);
  logger.error('Generation error:', { status, message, details: String(error) });
  res.status(status).json({
    message,
    code: isGeminiQuotaError(error) ? 'GEMINI_QUOTA_EXCEEDED' : undefined,
  });
}
