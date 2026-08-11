import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-utils';
import { createPortalSession } from '../../../../server/stripe';
import logger from '../../../../server/logger';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const session = await createPortalSession(user.id);
    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    logger.error('Portal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Portal error' },
      { status: 500 }
    );
  }
}
