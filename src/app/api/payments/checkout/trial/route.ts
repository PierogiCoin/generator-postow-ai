import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/api-utils';
import { createTrialCheckoutSession, PRICING } from '@server/stripe';
import logger from '@server/logger';

const trialCheckoutSchema = z.object({
  plan: z.enum(['creator', 'pro', 'agency', 'business', 'enterprise']).default('pro'),
  trialDays: z.number().int().min(1).max(30).optional().default(7),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const body = await req.json().catch(() => ({}));

    const parseResult = trialCheckoutSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Nieprawidłowe parametry trialu' },
        { status: 400 }
      );
    }

    const { plan, trialDays } = parseResult.data;
    const planConfig = PRICING.subscriptions[plan];
    const priceId = planConfig?.priceId;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Ten plan nie jest jeszcze skonfigurowany w Stripe.' },
        { status: 503 }
      );
    }

    const session = await createTrialCheckoutSession(user.id, priceId, trialDays);
    return NextResponse.json({ sessionId: session.id, url: session.url, trialDays });
  } catch (error: unknown) {
    logger.error('Trial checkout error:', error);
    const message = error instanceof Error ? error.message : 'Checkout error';
    const status = message.includes('Trial już był wykorzystany') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
