import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/api-utils';
import { redeemDealCode } from '@server/deals';
import logger from '@server/logger';

const redeemSchema = z.object({
  code: z.string().min(4).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const body = await req.json();
    const parsed = redeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Podaj prawidłowy kod' }, { status: 400 });
    }

    const result = await redeemDealCode(user.id, parsed.data.code);
    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error('Deal redeem error:', error);
    const message = error instanceof Error ? error.message : 'Redeem error';
    const status =
      message.includes('już') || message.includes('nie istnieje') || message.includes('wykorzystany')
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
