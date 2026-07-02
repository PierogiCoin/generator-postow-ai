import { Request, Response, NextFunction, RequestHandler } from 'express';
import { checkCredits, deductCredits, PRICING } from '../stripe.js';
import { requireSupabaseAuth, assertNoSpoofedUserId } from './supabaseAuth.js';
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

    const runDeduction = async (): Promise<number | null> => {
      if (deducted) return null;
      if (res.statusCode < 200 || res.statusCode >= 300) return null;
      if (!req.user?.id || !req.creditCost) return null;

      deducted = true;
      const userId = req.user.id;
      const cost = req.creditCost;
      const action = req.creditAction || 'unknown';

      try {
        const result = await deductCredits(userId, cost, action, {
          path: req.path,
          method: req.method,
        });
        return result.remainingCredits;
      } catch (error) {
        logger.error('Credit deduction error:', error);
        return null;
      }
    };

    const originalJson = res.json.bind(res);

    res.json = function jsonWithCredits(body?: unknown) {
      void (async () => {
        const remaining = await runDeduction();
        if (remaining !== null) {
          res.setHeader('X-Credits-Remaining', String(remaining));
          if (body && typeof body === 'object' && body !== null && !Array.isArray(body)) {
            (body as Record<string, unknown>).creditsRemaining = remaining;
          }
        }
        originalJson(body);
      })();
      return res;
    };

    next();
  };
}

/** Auth Supabase + sprawdzenie salda + pobranie kredytów po sukcesie */
export function creditGate(action: CreditAction, cost?: CostResolver): RequestHandler[] {
  return [requireSupabaseAuth, assertNoSpoofedUserId, requireCredits(action, cost), deductOnSuccess()];
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
