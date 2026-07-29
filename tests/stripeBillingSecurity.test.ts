import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

const { fromMock, rpcMock } = vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_p0_security';
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'service-test-key';
  return {
    fromMock: vi.fn(),
    rpcMock: vi.fn(),
  };
});

vi.mock('../server/supabase.js', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    rpc: (...args: unknown[]) => rpcMock(...args),
    auth: { admin: { getUserById: vi.fn() } },
  },
}));

vi.mock('../server/logger.js', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('../server/lib/pricingConfig.js', () => ({
  buildSubscriptionsConfig: () => ({
    free: { credits: 50, priceId: '', yearlyPriceId: '' },
    pro: { credits: 1000, priceId: 'price_pro', yearlyPriceId: 'price_pro_y' },
    business: { credits: 5000, priceId: 'price_biz', yearlyPriceId: '' },
  }),
  buildCreditPacksConfig: () => ({
    starter: { credits: 500, priceId: 'price_pack' },
  }),
}));

vi.mock('../server/lib/stripeUserResolve.js', () => ({
  resolveUserIdFromInvoice: vi.fn(async () => 'user-1'),
}));

import { handleStripeWebhook, creditsDisabled, addCredits } from '../server/stripe';

describe('creditsDisabled', () => {
  const prevNode = process.env.NODE_ENV;
  const prevFlag = process.env.DISABLE_CREDIT_LIMITS;

  afterEach(() => {
    if (prevNode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNode;
    if (prevFlag === undefined) delete process.env.DISABLE_CREDIT_LIMITS;
    else process.env.DISABLE_CREDIT_LIMITS = prevFlag;
  });

  it('w production zawsze false mimo flagi', () => {
    process.env.NODE_ENV = 'production';
    process.env.DISABLE_CREDIT_LIMITS = 'true';
    expect(creditsDisabled()).toBe(false);
  });

  it('poza production honoruje flagę', () => {
    process.env.NODE_ENV = 'development';
    process.env.DISABLE_CREDIT_LIMITS = 'true';
    expect(creditsDisabled()).toBe(true);
  });
});

describe('handleStripeWebhook idempotency', () => {
  let profileUpdateCount: number;

  beforeEach(() => {
    fromMock.mockReset();
    rpcMock.mockReset();
    profileUpdateCount = 0;
  });

  it('pomija ponowne przetwarzanie tego samego event.id', async () => {
    let insertCalls = 0;

    fromMock.mockImplementation((table: string) => {
      if (table === 'stripe_webhook_events') {
        return {
          insert: vi.fn(async () => {
            insertCalls += 1;
            if (insertCalls === 1) return { data: null, error: null };
            return { data: null, error: { code: '23505', message: 'duplicate key' } };
          }),
        };
      }
      if (table === 'profiles') {
        return {
          update: vi.fn(() => {
            profileUpdateCount += 1;
            return {
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }),
        };
      }
      return {
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const event = {
      id: 'evt_same',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1',
          metadata: { userId: 'user-1' },
          status: 'active',
          cancel_at_period_end: false,
          customer: 'cus_1',
          items: { data: [{ price: { id: 'price_pro' } }] },
          current_period_start: 1_700_000_000,
          current_period_end: 1_702_592_000,
        },
      },
    } as unknown as Stripe.Event;

    await handleStripeWebhook(event);
    await handleStripeWebhook(event);

    expect(insertCalls).toBe(2);
    expect(profileUpdateCount).toBe(1);
  });
});

describe('subscription.updated nie kasuje kredytów', () => {
  beforeEach(() => {
    fromMock.mockReset();
    rpcMock.mockReset();
  });

  it('update profilu bez pola credits', async () => {
    let profileUpdatePayload: Record<string, unknown> | null = null;

    fromMock.mockImplementation((table: string) => {
      if (table === 'stripe_webhook_events') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      if (table === 'profiles') {
        return {
          update: vi.fn((payload: Record<string, unknown>) => {
            profileUpdatePayload = payload;
            return {
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }),
        };
      }
      return {
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const event = {
      id: 'evt_sub_upd',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1',
          metadata: { userId: 'user-1' },
          status: 'active',
          cancel_at_period_end: false,
          customer: 'cus_1',
          items: { data: [{ price: { id: 'price_pro' } }] },
          current_period_start: 1_700_000_000,
          current_period_end: 1_702_592_000,
        },
      },
    } as unknown as Stripe.Event;

    await handleStripeWebhook(event);

    expect(profileUpdatePayload).not.toBeNull();
    expect(profileUpdatePayload).toHaveProperty('plan', 'pro');
    expect(profileUpdatePayload).not.toHaveProperty('credits');
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe('addCredits RPC', () => {
  beforeEach(() => {
    fromMock.mockReset();
    rpcMock.mockReset();
  });

  it('używa RPC add_credits gdy dostępne', async () => {
    rpcMock.mockResolvedValue({ data: 420, error: null });
    fromMock.mockImplementation(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));

    const result = await addCredits('user-1', 20, 'test');
    expect(rpcMock).toHaveBeenCalledWith('add_credits', {
      p_user_id: 'user-1',
      p_amount: 20,
    });
    expect(result.newBalance).toBe(420);
  });
});
