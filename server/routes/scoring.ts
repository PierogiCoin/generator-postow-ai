import { Router } from 'express';
import logger, { logRequest, logCost } from '../logger.js';
import { scoreContent, compareWithBenchmark, quickValidate } from '../contentScoring.js';
import { creditGate } from '../middleware/credits.js';
import { getAuthUserId } from '../middleware/supabaseAuth.js';
import {
  validateRequest,
  scoreContentSchema,
  benchmarkContentSchema,
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

    // Quick validation
    const validation = quickValidate(content, platform);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        issues: validation.errors
      });
    }

    logger.info(`[Content Scoring] User: ${userId}, Platform: ${platform}`);

    // Scoring
    const score = await scoreContent(content, platform, {
      ...context,
      userId: userId || undefined,
    });

    logCost(userId, 'content-scoring', 0.001, 'Internal'); // Minimalny koszt

    res.json({
      success: true,
      score,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    logger.error('[Content Scoring] Error:', error);
    res.status(500).json({
      error: 'Scoring failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===============================================
// 🏆 BENCHMARK COMPARISON ENDPOINT (Optional)
// ===============================================
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
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    logger.error('[Benchmark] Error:', error);
    res.status(500).json({
      error: 'Benchmark failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

  return router;
}
