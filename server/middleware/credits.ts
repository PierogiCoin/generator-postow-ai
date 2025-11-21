import { Request, Response, NextFunction } from 'express';
import { checkCredits, deductCredits, PRICING } from '../stripe';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      creditCost?: number;
    }
  }
}

/**
 * Middleware to check if user has enough credits for an action
 * Usage: app.post('/api/generate', requireCredits('generatePost'), handler)
 */
export function requireCredits(action: keyof typeof PRICING.costs) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const cost = PRICING.costs[action];
      const check = await checkCredits(userId, cost);

      if (!check.hasEnough) {
        return res.status(402).json({
          error: 'insufficient_credits',
          message: 'Not enough credits for this action',
          required: cost,
          current: check.currentCredits,
          plan: check.plan
        });
      }

      // Store cost for later deduction
      req.creditCost = cost;
      next();
    } catch (error: any) {
      console.error('Credit check error:', error);
      res.status(500).json({ error: error.message });
    }
  };
}

/**
 * Middleware to deduct credits after successful operation
 * Usage: Add after your handler completes successfully
 */
export async function deductCreditsMiddleware(
  req: Request,
  res: Response,
  action: string,
  metadata?: any
) {
  try {
    const userId = req.user?.id;
    const cost = req.creditCost;

    if (userId && cost) {
      await deductCredits(userId, cost, action, metadata);
    }
  } catch (error) {
    console.error('Credit deduction error:', error);
    // Don't fail the request if deduction fails
  }
}

/**
 * Helper to wrap handlers with automatic credit deduction
 */
export function withCreditDeduction(
  action: keyof typeof PRICING.costs,
  handler: (req: Request, res: Response) => Promise<void>
) {
  return async (req: Request, res: Response) => {
    try {
      // Execute handler
      await handler(req, res);

      // Deduct credits after success
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await deductCreditsMiddleware(req, res, action);
      }
    } catch (error: any) {
      console.error('Handler error:', error);
      res.status(500).json({ error: error.message });
    }
  };
}
