import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

const checkCredits = vi.fn();
const deductCredits = vi.fn();

vi.mock('../server/stripe.js', () => ({
  checkCredits: (...args: unknown[]) => checkCredits(...args),
  deductCredits: (...args: unknown[]) => deductCredits(...args),
  PRICING: {
    costs: {
      generatePost: 10,
      generateImage: 50,
      generateVideo: 200,
      videoStoryShort: 200,
      videoStoryMedium: 350,
      videoStoryLong: 500,
    },
  },
}));

vi.mock('../server/middleware/supabaseAuth.js', () => ({
  requireSupabaseAuth: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: 'u1', email: 'a@b.c' };
    next();
  },
  assertNoSpoofedUserId: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../server/logger.js', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { rateLimitedCreditGate } from '../server/middleware/credits';

describe('rateLimitedCreditGate', () => {
  beforeEach(() => {
    checkCredits.mockReset();
    deductCredits.mockReset();
    checkCredits.mockResolvedValue({
      hasEnough: true,
      currentCredits: 100,
      requiredCredits: 10,
      plan: 'pro',
    });
  });

  it('kolejność: auth → limiter → credits (limiter widzi req.user)', async () => {
    const seenKeys: Array<string | undefined> = [];
    const fakeLimiter: RequestHandler = (req, _res, next) => {
      seenKeys.push(req.user?.id);
      next();
    };

    const chain = rateLimitedCreditGate(fakeLimiter, 'generatePost');
    expect(chain).toHaveLength(5);

    const req = { body: {}, headers: {} } as Request;
    const res = {
      statusCode: 200,
      status: vi.fn(function (this: unknown) {
        return this;
      }),
      json: vi.fn(function (this: unknown) {
        return this;
      }),
      setHeader: vi.fn(),
    } as unknown as Response;

    // Run auth
    await new Promise<void>((resolve, reject) => {
      chain[0](req, res, (err?: unknown) => (err ? reject(err) : resolve()));
    });
    expect(req.user?.id).toBe('u1');

    // spoof check
    await new Promise<void>((resolve) => chain[1](req, res, () => resolve()));

    // limiter — must see user
    await new Promise<void>((resolve) => chain[2](req, res, () => resolve()));
    expect(seenKeys).toEqual(['u1']);
  });
});
