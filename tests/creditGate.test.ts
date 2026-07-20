import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const checkCredits = vi.fn();
const deductCredits = vi.fn();

vi.mock('../server/stripe.js', () => ({
  checkCredits: (...args: unknown[]) => checkCredits(...args),
  deductCredits: (...args: unknown[]) => deductCredits(...args),
  PRICING: {
    costs: {
      generatePost: 10,
      publishPost: 20,
      generateImage: 50,
      generateVideo: 200,
      videoStoryShort: 200,
      videoStoryMedium: 350,
      videoStoryLong: 500,
      contentOptimization: 25,
      sentimentAnalysis: 15,
      brandVoiceAnalysis: 30,
    },
  },
}));

vi.mock('../server/middleware/supabaseAuth.js', () => ({
  requireSupabaseAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
  assertNoSpoofedUserId: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

vi.mock('../server/logger.js', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  requireCredits,
  creditGate,
  videoStoryCreditCost,
} from '../server/middleware/credits';

function mockRes() {
  const res = {
    statusCode: 200,
    status: vi.fn(function (this: { statusCode: number }, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (this: unknown, body?: unknown) {
      return this;
    }),
    setHeader: vi.fn(),
  };
  return res as unknown as Response & {
    statusCode: number;
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    setHeader: ReturnType<typeof vi.fn>;
  };
}

describe('requireCredits', () => {
  beforeEach(() => {
    checkCredits.mockReset();
    deductCredits.mockReset();
  });

  it('zwraca 401 bez użytkownika', async () => {
    const req = { user: undefined, body: {} } as Request;
    const res = mockRes();
    const next = vi.fn();

    await requireCredits('generatePost')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('zwraca 402 przy braku kredytów', async () => {
    checkCredits.mockResolvedValue({
      hasEnough: false,
      currentCredits: 5,
      requiredCredits: 10,
      plan: 'free',
    });

    const req = { user: { id: 'u1', email: 'a@b.c' }, body: {} } as Request;
    const res = mockRes();
    const next = vi.fn();

    await requireCredits('generatePost')(req, res, next);

    expect(checkCredits).toHaveBeenCalledWith('u1', 10);
    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'insufficient_credits', required: 10 })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('przepuszcza i ustawia creditCost przy wystarczającym saldzie', async () => {
    checkCredits.mockResolvedValue({
      hasEnough: true,
      currentCredits: 100,
      requiredCredits: 20,
      plan: 'pro',
    });

    const req = { user: { id: 'u1', email: 'a@b.c' }, body: {} } as Request;
    const res = mockRes();
    const next = vi.fn();

    await requireCredits('publishPost')(req, res, next);

    expect(req.creditCost).toBe(20);
    expect(req.creditAction).toBe('publishPost');
    expect(next).toHaveBeenCalledOnce();
  });

  it('używa dynamicznego cost resolvera', async () => {
    checkCredits.mockResolvedValue({
      hasEnough: true,
      currentCredits: 999,
      requiredCredits: 30,
      plan: 'pro',
    });

    const req = {
      user: { id: 'u1', email: 'a@b.c' },
      body: { platforms: ['a', 'b', 'c'] },
    } as Request;
    const res = mockRes();
    const next = vi.fn();

    await requireCredits('generatePost', (r) => 10 * (r.body.platforms as string[]).length)(
      req,
      res,
      next
    );

    expect(checkCredits).toHaveBeenCalledWith('u1', 30);
    expect(req.creditCost).toBe(30);
    expect(next).toHaveBeenCalledOnce();
  });
});

describe('creditGate', () => {
  it('składa auth + spoof check + credits + deduct', () => {
    const chain = creditGate('generatePost');
    expect(chain).toHaveLength(4);
    expect(chain.every((fn) => typeof fn === 'function')).toBe(true);
  });
});

describe('videoStoryCreditCost', () => {
  it('mapuje długość wideo na tier kosztów', () => {
    expect(videoStoryCreditCost({ body: { duration: 10 } } as Request)).toBe(200);
    expect(videoStoryCreditCost({ body: { duration: 20 } } as Request)).toBe(350);
    expect(videoStoryCreditCost({ body: { videoLength: 45 } } as Request)).toBe(500);
    expect(videoStoryCreditCost({ body: {} } as Request)).toBe(200);
  });
});
