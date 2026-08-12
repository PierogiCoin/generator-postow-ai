import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-utils';
import { createCheckoutSession, PRICING } from '@server/stripe';
import logger from '@server/logger';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const body = await req.json();
    const { pack } = body as { pack?: string };

    const packConfig = PRICING.creditPacks[pack as keyof typeof PRICING.creditPacks];
    if (!packConfig?.priceId) {
      return NextResponse.json({ error: 'Nieprawidłowy pakiet kredytów' }, { status: 400 });
    }

    const session = await createCheckoutSession(user.id, packConfig.priceId, 'payment');
    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: unknown) {
    logger.error('Credit checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Credit checkout error' },
      { status: 500 }
    );
  }
}
