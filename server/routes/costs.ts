import { Router } from 'express';
import logger from '../logger.js';
import { costTracker } from '../lib/clients.js';
import { requireSupabaseAuth, getAuthUserId } from '../middleware/supabaseAuth.js';
import { AppError } from '../middleware/errorHandler.js';

function assertSelfUser(req: import('../middleware/supabaseAuth.js').SupabaseAuthRequest, paramUserId: string) {
  if (getAuthUserId(req) !== paramUserId) {
    throw new AppError(403, 'Brak dostępu do danych innego użytkownika');
  }
}

export function createCostsRouter(): Router {
  const router = Router();

  router.get('/user/:userId', requireSupabaseAuth, async (req, res, next) => {
    try {
      assertSelfUser(req, req.params.userId);
      const { userId } = req.params;
      const days = parseInt(req.query.days as string) || 30;

      if (!costTracker) {
        return res.status(503).json({ message: 'Cost tracking not available' });
      }

      const costs = await costTracker.getUserCosts(userId, days);
      res.json(costs);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[API] Failed to get user costs', { error: message });
      next(error);
    }
  });

  router.get('/daily', requireSupabaseAuth, async (req, res, next) => {
    try {
      const days = parseInt(req.query.days as string) || 7;

      if (!costTracker) {
        return res.status(503).json({ message: 'Cost tracking not available' });
      }

      const costs = await costTracker.getDailyCosts(days);
      res.json(costs);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[API] Failed to get daily costs', { error: message });
      next(error);
    }
  });

  router.get('/top-spenders', requireSupabaseAuth, async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const days = parseInt(req.query.days as string) || 30;

      if (!costTracker) {
        return res.status(503).json({ message: 'Cost tracking not available' });
      }

      const spenders = await costTracker.getTopSpenders(limit, days);
      res.json(spenders);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[API] Failed to get top spenders', { error: message });
      next(error);
    }
  });

  router.get('/check-budget/:userId', requireSupabaseAuth, async (req, res, next) => {
    try {
      assertSelfUser(req, req.params.userId);
      const { userId } = req.params;
      const dailyBudget = parseFloat(req.query.budget as string) || 10.0;

      if (!costTracker) {
        return res.status(503).json({ message: 'Cost tracking not available' });
      }

      const budgetCheck = await costTracker.checkBudget(userId, dailyBudget);
      res.json(budgetCheck);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[API] Failed to check budget', { error: message });
      next(error);
    }
  });

  return router;
}
