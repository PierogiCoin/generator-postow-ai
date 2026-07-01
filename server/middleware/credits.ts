import { Request, Response, NextFunction, RequestHandler } from 'express';
import { checkCredits, deductCredits, PRICING } from '../stripe.js';
import { requireSupabaseAuth } from './supabaseAuth.js';
import logger from '../logger.js';

type CreditAction = keyof typeof PRICING.costs;
type CostResolver = number | ((req: Request) => number);

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
      creditCost?: number;
      creditAction?: string;
    }
  }
}

function resolveCost(req: Request, action: CreditAction, cost?: CostResolver): number {
  if (typeof cost === 'function') return cost(req);
  if (typeof cost === 'number') return cost;
  return PRICING.costs[action];
}

export function requireCredits(action: CreditAction, cost?: CostResolver) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Wymagane logowanie' });
      }

      const amount = resolveCost(req, action, cost);
      const check = await checkCredits(userId, amount);

      if (!check.hasEnough) {
        return res.status(402).json({
          error: 'insufficient_credits',
          message: 'Brak kredytów na tę operację. Ulepsz plan lub dokup pakiet kredytów.',
          required: amount,
          current: check.currentCredits,
          plan: check.plan,
        });
      }

      req.creditCost = amount;
      req.creditAction = action;
      next();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Credit check failed';
      logger.error('Credit check error:', error);
      res.status(500).json({ error: message });
    }
  };
}

function deductOnSuccess(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    let deducted = false;

    const maybeDeduct = () => {
      if (deducted) return;
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      if (!req.user?.id || !req.creditCost) return;

      deducted = true;
      const userId = req.user.id;
      const cost = req.creditCost;
      const action = req.creditAction || 'unknown';

      void deductCredits(userId, cost, action, {
        path: req.path,
        method: req.method,
      }).catch((error) => {
        logger.error('Credit deduction error:', error);
      });
    };

    const originalJson = res.json.bind(res);
    const originalEnd = res.end.bind(res);

    res.json = function jsonWithCredits(...args: Parameters<typeof res.json>) {
      maybeDeduct();
      return originalJson(...args);
    };

    res.end = function endWithCredits(...args: Parameters<typeof res.end>) {
      maybeDeduct();
      return originalEnd(...args);
    };

    next();
  };
}

/** Auth Supabase + sprawdzenie salda + pobranie kredytów po sukcesie */
export function creditGate(action: CreditAction, cost?: CostResolver): RequestHandler[] {
  return [requireSupabaseAuth, requireCredits(action, cost), deductOnSuccess()];
}

export function videoStoryCreditCost(req: Request): number {
  const duration = Number(req.body?.duration ?? req.body?.videoLength ?? 15);
  if (duration <= 15) return PRICING.costs.videoStoryShort;
  if (duration <= 30) return PRICING.costs.videoStoryMedium;
  return PRICING.costs.videoStoryLong;
}

export async function deductCreditsMiddleware(
  req: Request,
  _res: Response,
  action: string,
  metadata?: Record<string, unknown>
) {
  const userId = req.user?.id;
  const cost = req.creditCost;

  if (userId && cost) {
    await deductCredits(userId, cost, action, metadata);
  }
}
