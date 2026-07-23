import { Router } from 'express';
import axios from 'axios';
import logger, { logRequest, logCost } from '../logger.js';
import { scoreContent, compareWithBenchmark, quickValidate } from '../contentScoring.js';
import { scoreImageVisual, VisualScoringUnavailableError } from '../visualScoring.js';
import { creditGate } from '../middleware/credits.js';
import { getAuthUserId } from '../middleware/supabaseAuth.js';
import {
  validateRequest,
  scoreContentSchema,
  benchmarkContentSchema,
  scoreImageSchema,
} from '../middleware/validate.js';

export function createScoringRouter(): Router {
  const router = Router();

  router.post(
    '/api/score-content',
    ...creditGate('sentimentAnalysis'),
    validateRequest(scoreContentSchema),
    async (req, res) => {
      logRequest(req, 200, 0);

      try {
        const { content, platform, context } = req.body;
        const userId = getAuthUserId(req);

        const validation = quickValidate(content, platform);
        if (!validation.isValid) {
          return res.status(400).json({
            error: 'Validation failed',
            issues: validation.errors,
          });
        }

        logger.info(`[Content Scoring] User: ${userId}, Platform: ${platform}`);

        const score = await scoreContent(content, platform, {
          ...context,
          userId: userId || undefined,
        });

        logCost(userId, 'content-scoring', 0.001, 'Internal');

        res.json({
          success: true,
          score,
          timestamp: new Date().toISOString(),
        });
      } catch (error: unknown) {
        logger.error('[Content Scoring] Error:', error);
        res.status(500).json({
          error: 'Scoring failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  router.post(
    '/api/score-image',
    ...creditGate('sentimentAnalysis'),
    validateRequest(scoreImageSchema),
    async (req, res) => {
      try {
        const { imageUrl, base64, mimeType, platform, briefSummary } = req.body;
        const userId = getAuthUserId(req);

        let imageBase64 = typeof base64 === 'string' ? base64 : '';
        let imageMime = mimeType || 'image/jpeg';

        if (!imageBase64 && imageUrl && typeof imageUrl === 'string') {
          if (imageUrl.startsWith('data:')) {
            const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              imageMime = match[1];
              imageBase64 = match[2];
            }
          } else {
            const imgRes = await axios.get(imageUrl, {
              responseType: 'arraybuffer',
              timeout: 30_000,
            });
            imageMime = (imgRes.headers['content-type'] as string) || 'image/jpeg';
            imageBase64 = Buffer.from(imgRes.data).toString('base64');
          }
        }

        if (!imageBase64) {
          return res.status(400).json({ error: 'imageUrl or base64 required' });
        }

        logger.info(`[Visual Scoring] User: ${userId}, Platform: ${platform}`);
        const score = await scoreImageVisual({
          base64: imageBase64,
          mimeType: imageMime,
          platform,
          briefSummary: briefSummary || '',
        });

        logCost(userId, 'visual-scoring', 0.002, 'Gemini');
        res.json({ success: true, score, timestamp: new Date().toISOString() });
      } catch (error: unknown) {
        logger.error('[Visual Scoring] Error:', error);
        if (error instanceof VisualScoringUnavailableError) {
          return res.status(503).json({
            error: 'Visual scoring unavailable',
            message: error.message,
            code: 'VISUAL_SCORING_UNAVAILABLE',
          });
        }
        res.status(500).json({
          error: 'Visual scoring failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  router.post(
    '/api/benchmark-content',
    ...creditGate('contentOptimization'),
    validateRequest(benchmarkContentSchema),
    async (req, res) => {
      logRequest(req, 200, 0);

      try {
        const { content, platform, niche } = req.body;
        const userId = getAuthUserId(req);

        logger.info(`[Benchmark] User: ${userId}, Niche: ${niche}`);

        const benchmark = await compareWithBenchmark(content, platform, niche);

        res.json({
          success: true,
          benchmark,
          timestamp: new Date().toISOString(),
        });
      } catch (error: unknown) {
        logger.error('[Benchmark] Error:', error);
        res.status(500).json({
          error: 'Benchmark failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  return router;
}
