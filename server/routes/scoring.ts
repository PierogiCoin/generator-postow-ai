import { Router } from 'express';
import logger, { logRequest, logCost } from '../logger.js';
import { scoreContent, compareWithBenchmark, quickValidate } from '../contentScoring.js';

export function createScoringRouter(): Router {
  const router = Router();
router.post('/api/score-content', async (req, res) => {
  logRequest(req, 200, 0);

  try {
    const { content, platform, context } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anon';

    // Walidacja
    if (!content || !platform) {
      return res.status(400).json({ error: 'Content and platform are required' });
    }

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
    const score = await scoreContent(content, platform, context);

    logCost(userId, 'content-scoring', 0.001, 'Internal'); // Minimalny koszt

    res.json({
      success: true,
      score,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[Content Scoring] Error:', error);
    res.status(500).json({
      error: 'Scoring failed',
      message: error.message
    });
  }
});

// ===============================================
// 🏆 BENCHMARK COMPARISON ENDPOINT (Optional)
// ===============================================
router.post('/api/benchmark-content', async (req, res) => {
  logRequest(req, 200, 0);

  try {
    const { content, platform, niche } = req.body;
    const userId = req.headers['x-user-id'] as string || 'anon';

    if (!content || !platform || !niche) {
      return res.status(400).json({
        error: 'Content, platform, and niche are required'
      });
    }

    logger.info(`[Benchmark] User: ${userId}, Niche: ${niche}`);

    const benchmark = await compareWithBenchmark(content, platform, niche);

    res.json({
      success: true,
      benchmark,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[Benchmark] Error:', error);
    res.status(500).json({
      error: 'Benchmark failed',
      message: error.message
    });
  }
});

  return router;
}
