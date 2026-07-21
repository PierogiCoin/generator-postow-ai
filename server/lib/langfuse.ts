/**
 * Optional Langfuse tracing for generate-content.
 * No-op when LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY are missing.
 */

import logger from '../logger.js';

type TraceHandle = {
  end: (opts?: {
    output?: string;
    model?: string;
    level?: 'DEFAULT' | 'ERROR';
    statusMessage?: string;
  }) => void;
};

type LangfuseLike = {
  trace: (opts: Record<string, unknown>) => {
    generation: (opts: Record<string, unknown>) => {
      end: (opts?: Record<string, unknown>) => void;
    };
    update: (opts: Record<string, unknown>) => void;
  };
  flushAsync?: () => Promise<void>;
};

let langfuseClient: LangfuseLike | null = null;
let initAttempted = false;

async function getClientAsync(): Promise<LangfuseLike | null> {
  if (initAttempted) return langfuseClient;
  initAttempted = true;

  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  if (!publicKey || !secretKey) {
    return null;
  }

  try {
    const mod = await import('langfuse');
    const Langfuse = (mod as { Langfuse: new (o: Record<string, string>) => LangfuseLike }).Langfuse;
    langfuseClient = new Langfuse({
      publicKey,
      secretKey,
      baseUrl: process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
    });
    logger.info('[Langfuse] tracing enabled');
  } catch (e) {
    logger.warn('[Langfuse] init failed (is langfuse installed?)', e);
    langfuseClient = null;
  }

  return langfuseClient;
}

/** Sync start — uses cached client; first call may no-op until warm. */
export function startGenerationTrace(input: {
  name: string;
  userId?: string | null;
  model?: string;
  inputPreview?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}): TraceHandle {
  // Kick off async init without blocking
  void getClientAsync();

  const client = langfuseClient;
  if (!client) {
    return { end: () => undefined };
  }

  try {
    const trace = client.trace({
      name: input.name,
      userId: input.userId || undefined,
      tags: input.tags || ['generate-content'],
      metadata: input.metadata,
      input: input.inputPreview?.slice(0, 2000),
    });

    const generation = trace.generation({
      name: input.name,
      model: input.model,
      input: input.inputPreview?.slice(0, 2000),
    });

    return {
      end: (opts) => {
        try {
          generation.end({
            output: opts?.output?.slice(0, 4000),
            model: opts?.model || input.model,
            level: opts?.level,
            statusMessage: opts?.statusMessage,
          });
          trace.update({
            output: opts?.output?.slice(0, 2000),
          });
        } catch (e) {
          logger.warn('[Langfuse] end failed', e);
        }
      },
    };
  } catch (e) {
    logger.warn('[Langfuse] start failed', e);
    return { end: () => undefined };
  }
}

export function isLangfuseEnabled(): boolean {
  return Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
}
