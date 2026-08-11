import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../server/supabase';
import { checkCredits, deductCredits, PRICING } from '../../../server/stripe';
import { AppError } from '../../../server/middleware/errorHandler';

export async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'Brak tokenu autoryzacji');
  }

  const token = authHeader.substring(7);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new AppError(401, 'Nieprawidłowy lub wygasły token');
  }

  const headerId = req.headers.get('x-user-id');
  if (headerId && headerId !== data.user.id) {
    throw new AppError(403, 'Nagłówek x-user-id nie zgadza się z tokenem');
  }

  return data.user;
}

export async function withCredits(
  req: NextRequest,
  action: keyof typeof PRICING.costs,
  costOverride?: number
) {
  const user = await getAuthUser(req);
  const amount = costOverride ?? PRICING.costs[action];

  const check = await checkCredits(user.id, amount);

  if (!check.hasEnough) {
    return {
      error: NextResponse.json(
        {
          error: 'insufficient_credits',
          message: 'Brak kredytów na tę operację. Ulepsz plan lub dokup pakiet kredytów.',
          required: amount,
          current: check.currentCredits,
          plan: check.plan,
        },
        { status: 402 }
      ),
    };
  }

  return {
    user,
    cost: amount,
    deduct: async (path: string, method: string) => {
      const result = await deductCredits(user.id, amount, action, { path, method });
      return result.remainingCredits;
    },
  };
}
