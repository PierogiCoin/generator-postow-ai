import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const checkCredits = vi.fn();
const deductCredits = vi.fn();
const addCredits = vi.fn();

vi.mock('../server/stripe.js', () => ({
  checkCredits: (...args: unknown[]) => checkCredits(...args),
  deductCredits: (...args: unknown[]) => deductCredits(...args),
  addCredits: (...args: unknown[]) => addCredits(...args),
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
    getHeader: vi.fn(),
    end: vi.fn(function (this: unknown) {
      return this;
    }),
  };
  return res as unknown as Response & {
    statusCode: number;
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
    setHeader: ReturnType<typeof vi.fn>;
    getHeader: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
  };
}

describe('requireCredits', () => {
  beforeEach(() => {
    checkCredits.mockReset();
    deductCredits.mockReset();
    addCredits.mockReset();
  });

  it('zwraca 401 bez użytkownika', async () => {
    const req = { user: undefined, body: {} } as Request;
    const res = mockRes();
    const next = vi.fn();

    await requireCredits('generatePost')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(deductCredits).not.toHaveBeenCalled();
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
    expect(deductCredits).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'insufficient_credits', required: 10 })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('debetuje przed next() przy wystarczającym saldzie', async () => {
    checkCredits.mockResolvedValue({
      hasEnough: true,
      currentCredits: 100,
      requiredCredits: 20,
      plan: 'pro',
    });
    deductCredits.mockResolvedValue({ success: true, remainingCredits: 80 });

    const req = { user: { id: 'u1', email: 'a@b.c' }, body: {} } as Request;
    const res = mockRes();
    const next = vi.fn();

    await requireCredits('publishPost')(req, res, next);

    expect(deductCredits).toHaveBeenCalledWith(
      'u1',
      20,
      'publishPost',
      expect.objectContaining({ phase: 'reserve' })
    );
    expect(req.creditCost).toBe(20);
    expect(req.creditAction).toBe('publishPost');
    expect(req.creditsReserved).toBe(true);
    expect(res.setHeader).toHaveBeenCalledWith('X-Credits-Remaining', '80');
    expect(next).toHaveBeenCalledOnce();
  });

  it('zwraca 500 gdy debit się nie powiedzie (fail-closed)', async () => {
    checkCredits.mockResolvedValue({
      hasEnough: true,
      currentCredits: 100,
      requiredCredits: 10,
      plan: 'pro',
    });
    deductCredits.mockRejectedValue(new Error('db down'));

    const req = { user: { id: 'u1', email: 'a@b.c' }, body: {} } as Request;
    const res = mockRes();
    const next = vi.fn();

    await requireCredits('generatePost')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'credit_debit_failed' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('używa dynamicznego cost resolvera', async () => {
    checkCredits.mockResolvedValue({
      hasEnough: true,
      currentCredits: 999,
      requiredCredits: 30,
      plan: 'pro',
    });
    deductCredits.mockResolvedValue({ success: true, remainingCredits: 969 });

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
    expect(deductCredits).toHaveBeenCalledWith(
      'u1',
      30,
      'generatePost',
      expect.any(Object)
    );
    expect(req.creditCost).toBe(30);
    expect(next).toHaveBeenCalledOnce();
  });
});

describe('creditGate', () => {
  it('składa auth + spoof check + credits + refund', () => {
    const chain = creditGate('generatePost');
    expect(chain).toHaveLength(4);
    expect(chain.every((fn) => typeof fn === 'function')).toBe(true);
  });

  it('refunduje kredyty przy non-2xx', async () => {
    checkCredits.mockResolvedValue({
      hasEnough: true,
      currentCredits: 50,
      requiredCredits: 10,
      plan: 'pro',
    });
    deductCredits.mockResolvedValue({ success: true, remainingCredits: 40 });
    addCredits.mockResolvedValue({ success: true, newBalance: 50 });

    const req = {
      user: { id: 'u1', email: 'a@b.c' },
      body: {},
      path: '/api/test',
      method: 'POST',
    } as Request;
    const res = mockRes();
    const next = vi.fn();

    const [, , requireMw, refundMw] = creditGate('generatePost');
    await (requireMw as (a: Request, b: Response, c: NextFunction) => Promise<void>)(
      req,
      res,
      next
    );
    expect(req.creditsReserved).toBe(true);

    (refundMw as (a: Request, b: Response, c: NextFunction) => void)(req, res, vi.fn());
    res.statusCode = 500;
    res.json({ error: 'fail' });

    await vi.waitFor(() => {
      expect(addCredits).toHaveBeenCalledWith(
        'u1',
        10,
        expect.stringContaining('Refund')
      );
    });
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
