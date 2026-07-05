/**
 * Referral Routes — system poleceń z nagrodami w kredytach.
 * - Generuje unikalny kod polecającego
 * - Śledzi rejestracje z kodem polecającego
 * - Nagradza obu: polecający +500 kr, polecony +200 kr
 */

import express, { Request, Response, NextFunction } from 'express';
import { requireSupabaseAuth, SupabaseAuthRequest } from '../middleware/supabaseAuth.js';
import { supabase } from '../supabase.js';
import { addCredits } from '../stripe.js';
import logger from '../logger.js';

const router = express.Router();

const REFERRER_REWARD = 500;
const REFEREE_REWARD = 200;

/**
 * Generuje krótki, unikalny kod polecającego z ID użytkownika.
 */
function generateReferralCode(userId: string): string {
  const hash = userId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `GPA-${hash}`;
}

// ============================================
// GET /api/referral — status i statystyki referral
// ============================================

router.get(
  '/',
  requireSupabaseAuth,
  async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const referralCode = generateReferralCode(userId);

      // Pobierz statystyki
      const { data: referrals } = await supabase
        .from('referrals')
        .select('id, referee_id, status, reward_claimed, created_at')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });

      const totalReferrals = referrals?.length || 0;
      const completedReferrals = referrals?.filter((r) => r.status === 'completed').length || 0;
      const totalEarned = referrals
        ?.filter((r) => r.reward_claimed)
        .reduce((sum, r) => sum + REFERRER_REWARD, 0) || 0;

      res.json({
        referralCode,
        referralLink: `https://generatorpostow.ai/?ref=${referralCode}`,
        stats: {
          totalReferrals,
          completedReferrals,
          totalEarned,
          pendingRewards: (referrals?.filter((r) => !r.reward_claimed && r.status === 'completed').length || 0) * REFERRER_REWARD,
        },
        referrals: referrals || [],
        rewards: {
          referrer: REFERRER_REWARD,
          referee: REFEREE_REWARD,
        },
      });
    } catch (error: unknown) {
      logger.error('Referral GET error:', error);
      next(error);
    }
  }
);

// ============================================
// POST /api/referral/apply — zastosuj kod polecającego (dla nowego usera)
// ============================================

router.post(
  '/apply',
  requireSupabaseAuth,
  async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
    try {
      const { referralCode } = req.body as { referralCode?: string };
      const userId = req.user!.id;

      if (!referralCode) {
        return res.status(400).json({ error: 'Brak kodu polecającego' });
      }

      // Sprawdź czy użytkownik już użył kodu polecającego
      const { data: existing } = await supabase
        .from('referrals')
        .select('id')
        .eq('referee_id', userId)
        .limit(1);

      if (existing && existing.length > 0) {
        return res.status(409).json({ error: 'Kod polecający już został użyty' });
      }

      // Znajdź polecającego po kodzie
      // Kod format: GPA-XXXXXXXX — musimy odwrócić mapowanie
      // Alternatywa: przechowuj kod w tabeli profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .not('id', 'is', null);

      let referrerId: string | null = null;
      for (const p of profiles || []) {
        if (generateReferralCode(p.id) === referralCode) {
          referrerId = p.id;
          break;
        }
      }

      if (!referrerId || referrerId === userId) {
        return res.status(400).json({ error: 'Nieprawidłowy kod polecającego' });
      }

      // Utwórz wpis referral
      const { error: insertError } = await supabase.from('referrals').insert({
        referrer_id: referrerId,
        referee_id: userId,
        status: 'completed',
        reward_claimed: false,
      });

      if (insertError) throw insertError;

      // Nagrodź poleconego (natychmiast)
      await addCredits(userId, REFEREE_REWARD, 'Referral bonus (referee)');

      // Nagrodź polecającego (natychmiast)
      await addCredits(referrerId, REFERRER_REWARD, 'Referral bonus (referrer)');

      // Oznacz nagrodę jako odebraną
      await supabase
        .from('referrals')
        .update({ reward_claimed: true })
        .eq('referrer_id', referrerId)
        .eq('referee_id', userId);

      logger.info('[Referral] Completed', { referrerId, refereeId: userId });

      res.json({
        success: true,
        message: `Dodano ${REFEREE_REWARD} kredytów z kodu polecającego!`,
        creditsAwarded: REFEREE_REWARD,
      });
    } catch (error: unknown) {
      logger.error('Referral apply error:', error);
      next(error);
    }
  }
);

export default router;
