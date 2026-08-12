import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/api-utils';
import { createCheckoutSession, PRICING, isStripeConfigured } from '@server/stripe';
import logger from '@server/logger';
import { OWN_LTD_TIER } from '@/config/dealTiers';

const lifetimeCheckoutSchema = z.object({
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().default(OWN_LTD_TIER),
});

export async function POST(req: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Płatności Stripe nie są skonfigurowane.' }, { status: 503 });
    }

    const user = await getAuthUser(req);
    const body = await req.json().catch(() => ({}));
    const parsed = lifetimeCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Nieprawidłowe parametry' }, { status: 400 });
    }

    const lifetime = PRICING.subscriptions.lifetime;
    const priceId = lifetime?.priceId;
    if (!priceId) {
      return NextResponse.json(
        {
          error:
            'Lifetime Deal nie jest jeszcze skonfigurowany. Ustaw STRIPE_LIFETIME_PRICE_ID.',
        },
        { status: 503 }
      );
    }

    const session = await createCheckoutSession(user.id, priceId, 'payment', {
      type: 'lifetime',
      dealTier: String(parsed.data.tier),
      dealSource: 'own',
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: unknown) {
    logger.error('Lifetime checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout error' },
      { status: 500 }
    );
  }
}
