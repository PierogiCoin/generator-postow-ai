import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { logValidationError } from '../logger.js';

export const textGenerationSchema = z.object({
  model: z.string().max(100).optional(),
  contents: z.union([z.string().min(1).max(50000), z.array(z.any())]),
  config: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      maxOutputTokens: z.number().min(1).max(8192).optional(),
      topP: z.number().min(0).max(1).optional(),
      topK: z.number().min(0).max(100).optional(),
      stopSequences: z.array(z.string()).optional(),
      systemInstruction: z.string().max(10000).optional(),
      responseMimeType: z.string().optional(),
      tools: z.array(z.record(z.string(), z.unknown())).optional(),
    })
    .optional(),
});

export const imageGenerationSchema = z.object({
  prompt: z.string().min(1).max(4000),
  config: z
    .object({
      numberOfImages: z.number().min(1).max(1).optional(),
      outputMimeType: z.enum(['image/jpeg', 'image/png']).optional(),
      aspectRatio: z.enum(['1:1', '16:9', '9:16']).optional(),
      quality: z.enum(['standard', 'hd']).optional(),
    })
    .optional(),
});

export const videoGenerationSchema = z.object({
  postText: z.string().min(1).max(5000),
  platform: z.string().min(1).max(50),
  style: z.string().max(100).optional(),
  prompt: z.string().max(4000).optional(),
  needsAudio: z.boolean().optional(),
  aspectRatio: z.enum(['1:1', '16:9', '9:16']).optional(),
  provider: z.enum(['auto', 'veo', 'luma', 'replicate']).optional(),
  async: z.boolean().optional(),
});

export const multiPlatformSchema = z.object({
  originalText: z.string().min(1).max(10000),
  targetPlatforms: z.array(z.string()).min(1).max(10),
  tone: z.string().max(100).optional(),
  hashtags: z.array(z.string()).max(30).optional(),
});

export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
        code: issue.code,
      }));

      logValidationError(req.path, errors, req.ip || 'unknown');

      return res.status(400).json({
        message: 'Validation failed',
        errors,
      });
    }

    next();
  };
}
