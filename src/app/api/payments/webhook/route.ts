import { NextRequest, NextResponse } from 'next/server';
import stripe, { handleStripeWebhook } from '@server/stripe';
import logger from '@server/logger';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe signature' }, { status: 400 });
  }

  try {
    const rawBody = await req.text();
    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    await handleStripeWebhook(event);
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook error';
    logger.error('Stripe webhook error:', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
