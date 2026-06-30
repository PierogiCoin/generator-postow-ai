import { Router } from 'express';
import logger from '../logger.js';
import { costTracker } from '../lib/clients.js';

export function createCostsRouter(): Router {
  const router = Router();
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    if (!costTracker) {
      return res.status(503).json({ message: 'Cost tracking not available' });
    }

    const costs = await costTracker.getUserCosts(userId, days);
    res.json(costs);
  } catch (error: any) {
    logger.error('[API] Failed to get user costs', { error: error.message });
    res.status(500).json({ message: error.message });
  }
});

// Get daily costs summary
router.get('/daily', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    if (!costTracker) {
      return res.status(503).json({ message: 'Cost tracking not available' });
    }

    const costs = await costTracker.getDailyCosts(days);
    res.json(costs);
  } catch (error: any) {
    logger.error('[API] Failed to get daily costs', { error: error.message });
    res.status(500).json({ message: error.message });
  }
});

// Get top spenders
router.get('/top-spenders', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const days = parseInt(req.query.days as string) || 30;

    if (!costTracker) {
      return res.status(503).json({ message: 'Cost tracking not available' });
    }

    const spenders = await costTracker.getTopSpenders(limit, days);
    res.json(spenders);
  } catch (error: any) {
    logger.error('[API] Failed to get top spenders', { error: error.message });
    res.status(500).json({ message: error.message });
  }
});

// Check user budget
router.get('/check-budget/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const dailyBudget = parseFloat(req.query.budget as string) || 10.0;

    if (!costTracker) {
      return res.status(503).json({ message: 'Cost tracking not available' });
    }

    const budgetCheck = await costTracker.checkBudget(userId, dailyBudget);
    res.json(budgetCheck);
  } catch (error: any) {
    logger.error('[API] Failed to check budget', { error: error.message });
    res.status(500).json({ message: error.message });
  }
});

  return router;
}
