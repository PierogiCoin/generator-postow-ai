import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase.js';
import { AppError } from './errorHandler.js';

export interface SupabaseAuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
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
