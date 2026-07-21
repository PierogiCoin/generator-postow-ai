import { Router } from 'express';
import { z } from 'zod';
import { requireSupabaseAuth, getAuthUserId } from '../middleware/supabaseAuth.js';
import { validateRequest } from '../middleware/validate.js';
import {
  retrieveBrandMemory,
  ingestBrandMemoryDocument,
  formatBrandMemoryPromptBlock,
} from '../lib/brandMemory.js';
import logger from '../logger.js';

const retrieveSchema = z.object({
  topic: z.string().max(2000).optional(),
  platform: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(12).optional(),
});

const ingestSchema = z.object({
  sourceType: z.enum(['url', 'pdf', 'manual', 'top_post']),
  excerpt: z.string().min(20).max(12000),
  title: z.string().max(500).optional(),
  sourceUrl: z.string().url().max(2000).optional().or(z.literal('')),
  platform: z.string().max(50).optional(),
  engagementScore: z.number().min(0).max(1_000_000).optional(),
});

export function createBrandMemoryRouter(): Router {
  const router = Router();

  router.post(
    '/api/brand-memory/retrieve',
    requireSupabaseAuth,
    validateRequest(retrieveSchema),
    async (req, res) => {
      try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { topic, platform, limit } = req.body as z.infer<typeof retrieveSchema>;
        const chunks = await retrieveBrandMemory({ userId, topic, platform, limit });
        const promptBlock = formatBrandMemoryPromptBlock(chunks);

        return res.json({
          success: true,
          chunks,
          promptBlock,
          count: chunks.length,
        });
      } catch (error) {
        logger.error('[BrandMemory] retrieve:', error);
        return res.status(500).json({ message: 'Brand memory retrieve failed' });
      }
    }
  );

  router.post(
    '/api/brand-memory/ingest',
    requireSupabaseAuth,
    validateRequest(ingestSchema),
    async (req, res) => {
      try {
        const userId = getAuthUserId(req);
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const body = req.body as z.infer<typeof ingestSchema>;
        const result = await ingestBrandMemoryDocument({
          userId,
          sourceType: body.sourceType,
          excerpt: body.excerpt,
          title: body.title,
          sourceUrl: body.sourceUrl || undefined,
          platform: body.platform,
          engagementScore: body.engagementScore,
        });

        return res.json({ success: true, id: result?.id });
      } catch (error) {
        logger.error('[BrandMemory] ingest:', error);
        return res.status(500).json({
          message:
            error instanceof Error && error.message.includes('brand_memory')
              ? 'Uruchom DATABASE_SCHEMA_BRAND_MEMORY.sql w Supabase'
              : 'Brand memory ingest failed',
        });
      }
    }
  );

  return router;
}
