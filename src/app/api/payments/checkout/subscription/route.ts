import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/api-utils';
import { createCheckoutSession, PRICING } from '../../../../../server/stripe';
import logger from '../../../../../server/logger';

const subscriptionCheckoutSchema = z.object({
  plan: z.enum(['creator', 'pro', 'agency', 'business', 'enterprise']),
  interval: z.enum(['month', 'year']).optional().default('month'),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const body = await req.json();

    const parseResult = subscriptionCheckoutSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Nieprawidłowe parametry planu lub okresu rozliczeniowego' },
        { status: 400 }
      );
    }

    const { plan, interval } = parseResult.data;
    const planConfig = PRICING.subscriptions[plan];
    const priceId = interval === 'year' ? planConfig?.yearlyPriceId : planConfig?.priceId;

    if (!priceId) {
      return NextResponse.json(
        {
          error: interval === 'year'
            ? 'Rozliczenie roczne nie jest jeszcze skonfigurowane w Stripe dla tego planu.'
            : 'Ten plan nie jest jeszcze skonfigurowany w Stripe.',
        },
        { status: 503 }
      );
    }

    const session = await createCheckoutSession(user.id, priceId, 'subscription');
    return NextResponse.json({ sessionId: session.id, url: session.url, interval });
  } catch (error: unknown) {
    logger.error('Subscription checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout error' },
      { status: 500 }
    );
  }
}
