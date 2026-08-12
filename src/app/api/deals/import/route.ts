import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/api-utils';
import { importDealCodes } from '@server/deals';
import logger from '@server/logger';

/**
 * Import kodów AppSumo / własnych.
 * Chronione sekretem DEALS_IMPORT_SECRET (header x-deals-import-secret).
 */
const rowSchema = z.object({
  code: z.string().min(4),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  source: z.enum(['appsumo', 'own']).optional(),
  notes: z.string().optional(),
});

const bodySchema = z.object({
  codes: z.array(rowSchema).min(1).max(5000),
});

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.DEALS_IMPORT_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'DEALS_IMPORT_SECRET nie jest ustawiony' }, { status: 503 });
    }

    const header = req.headers.get('x-deals-import-secret');
    if (header !== secret) {
      // Allow authenticated admin via same secret only — no public import
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional: also require a logged-in user for audit trail
    try {
      await getAuthUser(req);
    } catch {
      // import script may use secret alone
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Nieprawidłowy payload codes[]' }, { status: 400 });
    }

    const result = await importDealCodes(parsed.data.codes);
    return NextResponse.json(result);
  } catch (error: unknown) {
    logger.error('Deal import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import error' },
      { status: 500 }
    );
  }
}
