import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

const constructEvent = vi.fn();
const handleStripeWebhook = vi.fn();

vi.mock('../server/stripe.js', () => ({
  default: {
    webhooks: {
      constructEvent: (...args: unknown[]) => constructEvent(...args),
    },
  },
  handleStripeWebhook: (...args: unknown[]) => handleStripeWebhook(...args),
  createCheckoutSession: vi.fn(),
  createTrialCheckoutSession: vi.fn(),
  createPortalSession: vi.fn(),
  checkCredits: vi.fn(),
  getUsageStats: vi.fn(),
  PRICING: { subscriptions: {}, creditPacks: {}, costs: {} },
}));

vi.mock('../server/middleware/supabaseAuth.js', () => ({
  requireSupabaseAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../server/supabase.js', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('../server/logger.js', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { stripeWebhookHandler } from '../server/routes/payments';

function mockRes() {
  const res = {
    status: vi.fn(function (this: unknown) {
      return this;
    }),
    json: vi.fn(function (this: unknown) {
      return this;
    }),
  };
  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

describe('stripeWebhookHandler', () => {
  const prevSecret = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    constructEvent.mockReset();
    handleStripeWebhook.mockReset();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  });

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = prevSecret;
  });

  it('zwraca 400 przy nieprawidłowej sygnaturze', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const req = {
      headers: { 'stripe-signature': 'bad' },
      body: Buffer.from('{}'),
    } as unknown as Request;
    const res = mockRes();

    await stripeWebhookHandler(req, res);

    expect(constructEvent).toHaveBeenCalled();
    expect(handleStripeWebhook).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid signature' });
  });

  it('przyjmuje poprawny event i woła handleStripeWebhook', async () => {
    const event = {
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: {} },
    };
    constructEvent.mockReturnValue(event);
    handleStripeWebhook.mockResolvedValue(undefined);

    const rawBody = Buffer.from('{"id":"evt_1"}');
    const req = {
      headers: { 'stripe-signature': 't=1,v1=abc' },
      body: rawBody,
    } as unknown as Request;
    const res = mockRes();

    await stripeWebhookHandler(req, res);

    expect(constructEvent).toHaveBeenCalledWith(rawBody, 't=1,v1=abc', 'whsec_test');
    expect(handleStripeWebhook).toHaveBeenCalledWith(event);
    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(res.status).not.toHaveBeenCalledWith(400);
  });
});
