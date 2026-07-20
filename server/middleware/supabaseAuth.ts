import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase.js';
import { AppError } from './errorHandler.js';

export interface AuthUser {
  id: string;
  email: string;
  appMetadata?: Record<string, unknown>;
}

export interface SupabaseAuthRequest extends Request {
  user?: AuthUser;
}

function parseCsvEnv(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

/** Admin: ADMIN_USER_IDS / ADMIN_EMAILS albo app_metadata.role=admin / is_admin=true */
export function isAdminUser(user: AuthUser): boolean {
  const adminIds = parseCsvEnv(process.env.ADMIN_USER_IDS);
  if (adminIds.has(user.id)) return true;

  const adminEmails = new Set(
    [...parseCsvEnv(process.env.ADMIN_EMAILS)].map((e) => e.toLowerCase())
  );
  if (user.email && adminEmails.has(user.email.toLowerCase())) return true;

  const meta = user.appMetadata ?? {};
  if (meta.role === 'admin' || meta.is_admin === true) return true;

  return false;
}

export const requireSupabaseAuth = async (
  req: SupabaseAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'Brak tokenu autoryzacji');
    }

    const token = authHeader.substring(7);
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new AppError(401, 'Nieprawidłowy lub wygasły token');
    }

    req.user = {
      id: data.user.id,
      email: data.user.email ?? '',
      appMetadata: (data.user.app_metadata ?? {}) as Record<string, unknown>,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export function getAuthUserId(req: SupabaseAuthRequest): string {
  if (!req.user?.id) {
    throw new AppError(401, 'Wymagane logowanie');
  }
  return req.user.id;
}

/** Odrzuca żądania, gdzie x-user-id nie zgadza się z tokenem JWT. */
export function assertNoSpoofedUserId(
  req: SupabaseAuthRequest,
  _res: Response,
  next: NextFunction
) {
  const headerId = req.headers['x-user-id'] as string | undefined;
  if (headerId && req.user?.id && headerId !== req.user.id) {
    return next(new AppError(403, 'Nagłówek x-user-id nie zgadza się z tokenem'));
  }
  next();
}

/** Wymaga zalogowanego admina (fail-closed gdy brak allowlisty i metadanych). */
export function requireAdmin(
  req: SupabaseAuthRequest,
  _res: Response,
  next: NextFunction
) {
  if (!req.user?.id) {
    return next(new AppError(401, 'Wymagane logowanie'));
  }
  if (!isAdminUser(req.user)) {
    return next(new AppError(403, 'Wymagane uprawnienia administratora'));
  }
  next();
}
