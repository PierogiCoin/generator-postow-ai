import { NextResponse } from 'next/server';
import { PRICING } from '@server/stripe';

export async function GET() {
  return NextResponse.json({
    subscriptions: PRICING.subscriptions,
    creditPacks: PRICING.creditPacks,
    costs: PRICING.costs,
  });
}
