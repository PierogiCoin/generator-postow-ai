import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-utils';
import { supabase } from '@server/supabase';
import logger from '@server/logger';

/**
 * Trwałe usunięcie konta (service role).
 * Wymaga Bearer token użytkownika — kasuje auth user + kaskadowe dane profilu.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);

    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      logger.error('[account/delete]', error);
      return NextResponse.json(
        { error: error.message || 'Nie udało się usunąć konta' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    logger.error('[account/delete]', error);
    const message = error instanceof Error ? error.message : 'Błąd usuwania konta';
    const status = message.includes('token') || message.includes('autoryzac') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
