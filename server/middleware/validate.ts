import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { logValidationError } from '../logger.js';

export const textGenerationSchema = z.object({
  model: z.string().max(100).optional(),
  contents: z.union([
    z.string().min(1).max(50000),
    z.array(z.object({
      role: z.enum(['user', 'model', 'function']).optional(),
      parts: z.array(z.object({
        text: z.string().optional(),
        inlineData: z.object({
          mimeType: z.string(),
          data: z.string(),
        }).optional(),
        functionCall: z.object({
          name: z.string(),
          args: z.record(z.string(), z.unknown()).optional(),
        }).optional(),
        functionResponse: z.object({
          name: z.string(),
          response: z.record(z.string(), z.unknown()).optional(),
        }).optional(),
      }).passthrough()),
    }).passthrough()),
  ]),
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
  prompt: z.string().min(1).max(8000),
  model: z.string().max(100).optional(),
  provider: z.enum(['auto', 'together', 'imagen']).optional(),
  quality: z.enum(['standard', 'typography', 'hd']).optional(),
  referenceImages: z.array(z.string().min(1).max(2_000_000)).max(8).optional(),
  config: z
    .object({
      numberOfImages: z.number().min(1).max(1).optional(),
      outputMimeType: z.enum(['image/jpeg', 'image/png']).optional(),
      aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional(),
      quality: z.enum(['standard', 'typography', 'hd']).optional(),
      safetyFilterLevel: z.string().optional(),
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
  targetPlatforms: z.array(z.string().min(1).max(50)).min(1).max(10),
  tone: z.string().max(100).optional(),
  hashtags: z.array(z.string().max(100)).max(30).optional(),
});

export const batchGenerationSchema = z.object({
  topic: z.string().min(1).max(2000),
  platforms: z.array(z.string().min(1).max(50)).min(1).max(10),
  style: z.string().max(100).optional().default('Professional'),
  tone: z.string().max(100).optional().default('Casual'),
});

const chatHistoryItemSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z
    .array(
      z.object({
        text: z.string().max(50000).optional(),
      }).passthrough()
    )
    .min(1)
    .max(50),
});

export const chatGenerationSchema = z.object({
  prompt: z.string().min(1).max(50000),
  history: z.array(chatHistoryItemSchema).max(40).optional().default([]),
  model: z.string().max(100).optional().default('gemini-flash-latest'),
});

export const abVariantsSchema = z.object({
  originalText: z.string().min(1).max(10000),
  platform: z.string().min(1).max(50),
  tone: z.string().min(1).max(100),
});

export const veoVideoGenerationSchema = z.object({
  prompt: z.string().min(1).max(4000),
  model: z.string().max(100).optional(),
  image: z
    .object({
      imageBytes: z.string().min(1).max(15_000_000),
      mimeType: z.string().min(1).max(100),
    })
    .optional(),
  config: z
    .object({
      numberOfVideos: z.number().int().min(1).max(1).optional(),
      resolution: z.string().max(20).optional(),
      aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional(),
    })
    .optional(),
});

export const getVideosOperationSchema = z.object({
  operation: z.object({
    name: z
      .string()
      .min(1)
      .max(500)
      .regex(
        /^models\/[\w.-]+\/operations\/[\w.-]+$/,
        'Invalid Veo operation name'
      ),
  }),
});

export const brandVoiceExtractUrlSchema = z.object({
  url: z
    .string()
    .trim()
    .min(3)
    .max(2000)
    .refine(
      (u) => !u.includes(' ') && (u.includes('.') || /^https?:\/\//i.test(u)),
      'Invalid website URL'
    ),
});

/** learn nie wymaga body — odrzuca nie-obiekt / tablicę */
export const brandVoiceLearnSchema = z.object({}).passthrough();

export const scoreContentSchema = z.object({
  content: z.string().min(1).max(50000),
  platform: z.string().min(1).max(50),
  context: z
    .object({
      hasHashtags: z.boolean().optional(),
      hasEmojis: z.boolean().optional(),
      targetAudience: z.string().max(500).optional(),
    })
    .optional(),
});

export const scoreImageSchema = z.object({
  platform: z.string().min(1).max(50),
  briefSummary: z.string().max(4000).optional(),
  imageUrl: z.string().max(2_000_000).optional(),
  base64: z.string().max(8_000_000).optional(),
  mimeType: z.string().max(100).optional(),
}).refine((d) => Boolean(d.imageUrl || d.base64), {
  message: 'imageUrl or base64 required',
});

export const benchmarkContentSchema = z.object({
  content: z.string().min(1).max(50000),
  platform: z.string().min(1).max(50),
  niche: z.string().min(1).max(200),
});

export const applyTemplateSchema = z.object({
  templateId: z.string().min(1).max(200),
  userInput: z
    .record(z.string(), z.unknown())
    .optional()
    .default({}),
});

export const templateCategoryParamSchema = z.object({
  category: z.string().min(1).max(100),
});

export const templatePlatformParamSchema = z.object({
  platform: z.string().min(1).max(50),
});

export function validateRequest(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});

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

    req.body = result.data;
    next();
  };
}

export function validateParams(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'params',
        message: issue.message,
        code: issue.code,
      }));

      logValidationError(req.path, errors, req.ip || 'unknown');

      return res.status(400).json({
        message: 'Validation failed',
        errors,
      });
    }

    req.params = result.data as typeof req.params;
    next();
  };
}
