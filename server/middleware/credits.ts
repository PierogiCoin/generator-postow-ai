import { Request, Response, NextFunction, RequestHandler } from 'express';
import { checkCredits, deductCredits, addCredits, PRICING } from '../stripe.js';
import { requireSupabaseAuth, assertNoSpoofedUserId } from './supabaseAuth.js';
import logger from '../logger.js';

type CreditAction = keyof typeof PRICING.costs;
type CostResolver = number | ((req: Request) => number);

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; appMetadata?: Record<string, unknown> };
      creditCost?: number;
      creditAction?: string;
      creditsReserved?: boolean;
    }
  }
}

function resolveCost(req: Request, action: CreditAction, cost?: CostResolver): number {
  if (typeof cost === 'function') return cost(req);
  if (typeof cost === 'number') return cost;
  return PRICING.costs[action];
}

/**
 * Debit przed pracą (rezerwacja). Przy non-2xx — refund.
 * Usuwa race check→work→debit i fail-open przy błędzie debitu po sukcesie.
 */
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

      try {
        const result = await deductCredits(userId, amount, action, {
          path: req.path,
          method: req.method,
          phase: 'reserve',
        });
        req.creditsReserved = true;
        res.setHeader('X-Credits-Remaining', String(result.remainingCredits));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Credit debit failed';
        if (message === 'Insufficient credits' || /insufficient/i.test(message)) {
          return res.status(402).json({
            error: 'insufficient_credits',
            message: 'Brak kredytów na tę operację. Ulepsz plan lub dokup pakiet kredytów.',
            required: amount,
            current: check.currentCredits,
            plan: check.plan,
          });
        }
        logger.error('Credit reserve/debit error:', error);
        return res.status(500).json({
          error: 'credit_debit_failed',
          message: 'Nie udało się pobrać kredytów. Spróbuj ponownie.',
        });
      }

      next();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Credit check failed';
      logger.error('Credit check error:', error);
      res.status(500).json({ error: message });
    }
  };
}

function refundOnFailure(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    let settled = false;

    const settle = async (): Promise<void> => {
      if (settled) return;
      settled = true;

      if (!req.creditsReserved || !req.user?.id || !req.creditCost) return;

      const status = res.statusCode;
      if (status >= 200 && status < 300) return;

      try {
        await addCredits(
          req.user.id,
          req.creditCost,
          `Refund failed request:${req.creditAction || 'unknown'}`
        );
        logger.info('[credits] Refunded after failed request', {
          userId: req.user.id,
          amount: req.creditCost,
          path: req.path,
          status,
        });
      } catch (error) {
        logger.error('[credits] CRITICAL: refund failed after non-2xx', error);
      }
    };

    const originalJson = res.json.bind(res);
    res.json = function jsonWithRefund(body?: unknown) {
      void (async () => {
        await settle();
        if (
          req.creditsReserved &&
          res.statusCode >= 200 &&
          res.statusCode < 300 &&
          body &&
          typeof body === 'object' &&
          body !== null &&
          !Array.isArray(body) &&
          !('creditsRemaining' in (body as object))
        ) {
          const remainingHeader = res.getHeader?.('X-Credits-Remaining');
          if (remainingHeader !== undefined) {
            (body as Record<string, unknown>).creditsRemaining = Number(remainingHeader);
          }
        }
        originalJson(body);
      })();
      return res;
    };

    const originalEnd = res.end.bind(res);
    res.end = function endWithRefund(...args: unknown[]) {
      void settle().finally(() => {
        (originalEnd as (...a: unknown[]) => unknown)(...args);
      });
      return res;
    } as typeof res.end;

    next();
  };
}

/** Auth Supabase + rezerwacja kredytów przed pracą + refund przy nie-2xx */
export function creditGate(action: CreditAction, cost?: CostResolver): RequestHandler[] {
  return [requireSupabaseAuth, assertNoSpoofedUserId, requireCredits(action, cost), refundOnFailure()];
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

  // Debit already done in requireCredits; keep for legacy callers that skip creditGate
  if (userId && cost && !req.creditsReserved) {
    await deductCredits(userId, cost, action, metadata);
  }
}
