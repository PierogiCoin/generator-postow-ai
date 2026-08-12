import { supabase } from './supabase';
import logger from './logger';
import { DEAL_TIERS, type DealTier, type DealSource } from '../src/config/dealTiers';
import { addCredits } from './stripe';

export function normalizeDealCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

export interface RedeemResult {
  success: true;
  tier: DealTier;
  source: DealSource;
  credits: number;
  plan: 'lifetime';
}

export async function assignLifetimePlan(
  userId: string,
  tier: DealTier,
  source: DealSource
): Promise<{ credits: number }> {
  const config = DEAL_TIERS[tier];
  const credits = config.monthlyCredits;

  const { error } = await supabase
    .from('profiles')
    .update({
      plan: 'lifetime',
      credits,
      deal_source: source,
      deal_tier: tier,
      deal_redeemed_at: new Date().toISOString(),
      subscription_status: 'lifetime',
    })
    .eq('id', userId);

  if (error) {
    logger.error('[deals] assignLifetimePlan failed', error);
    throw new Error('Nie udało się aktywować planu Lifetime.');
  }

  return { credits };
}

/**
 * Upgrade stack Tier1→2→3 (AppSumo). Nie obniża tieru.
 */
export async function upgradeDealTier(
  userId: string,
  newTier: DealTier
): Promise<{ credits: number; previousTier: DealTier | null }> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('plan, deal_tier, deal_source, credits')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) throw new Error('Nie znaleziono profilu');
  if (profile.plan !== 'lifetime') {
    throw new Error('Stack upgrade jest dostępny tylko dla planu Lifetime');
  }

  const previousTier =
    profile.deal_tier === 1 || profile.deal_tier === 2 || profile.deal_tier === 3
      ? (profile.deal_tier as DealTier)
      : null;

  if (previousTier && newTier <= previousTier) {
    throw new Error('Kod nie daje wyższego tieru niż aktualny');
  }

  const config = DEAL_TIERS[newTier];
  const currentCredits = typeof profile.credits === 'number' ? profile.credits : 0;
  const creditDelta = Math.max(0, config.monthlyCredits - (previousTier ? DEAL_TIERS[previousTier].monthlyCredits : 0));
  const newCredits = currentCredits + creditDelta;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      deal_tier: newTier,
      credits: newCredits,
    })
    .eq('id', userId);

  if (updateError) throw new Error('Nie udało się podnieść tieru');

  if (creditDelta > 0) {
    try {
      await addCredits(userId, 0, `deal_stack_upgrade_t${newTier}`);
    } catch {
      // credits already set on profile
    }
  }

  return { credits: newCredits, previousTier };
}

export async function redeemDealCode(userId: string, rawCode: string): Promise<RedeemResult> {
  const codeNormalized = normalizeDealCode(rawCode);
  if (codeNormalized.length < 4) {
    throw new Error('Nieprawidłowy kod');
  }

  const { data: deal, error: findError } = await supabase
    .from('deal_codes')
    .select('*')
    .eq('code_normalized', codeNormalized)
    .maybeSingle();

  if (findError) {
    logger.error('[deals] find code', findError);
    throw new Error('Błąd weryfikacji kodu');
  }

  if (!deal) {
    throw new Error('Kod nie istnieje lub jest nieprawidłowy');
  }

  const tier = deal.tier as DealTier;
  const source = deal.source as DealSource;
  if (tier !== 1 && tier !== 2 && tier !== 3) {
    throw new Error('Nieprawidłowy tier kodu');
  }

  // Already redeemed by this user?
  const { data: existingRedemption } = await supabase
    .from('deal_redemptions')
    .select('id')
    .eq('deal_code_id', deal.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingRedemption) {
    throw new Error('Ten kod został już użyty na tym koncie');
  }

  if (deal.redemption_count >= deal.max_redemptions) {
    throw new Error('Kod został już wykorzystany');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, deal_tier')
    .eq('id', userId)
    .maybeSingle();

  const currentTier =
    profile?.deal_tier === 1 || profile?.deal_tier === 2 || profile?.deal_tier === 3
      ? (profile.deal_tier as DealTier)
      : null;

  // Stack: lifetime user redeeming higher tier
  if (profile?.plan === 'lifetime' && currentTier && tier > currentTier) {
    const upgraded = await upgradeDealTier(userId, tier);
    await recordRedemption(deal.id, userId, tier, source, deal.redemption_count);
    return {
      success: true,
      tier,
      source,
      credits: upgraded.credits,
      plan: 'lifetime',
    };
  }

  if (profile?.plan === 'lifetime' && currentTier && tier <= currentTier) {
    throw new Error('Masz już Lifetime na tym lub wyższym tierze');
  }

  const { credits } = await assignLifetimePlan(userId, tier, source);
  await recordRedemption(deal.id, userId, tier, source, deal.redemption_count);

  return {
    success: true,
    tier,
    source,
    credits,
    plan: 'lifetime',
  };
}

async function recordRedemption(
  dealCodeId: string,
  userId: string,
  tier: DealTier,
  source: DealSource,
  previousCount: number
) {
  const { error: insertError } = await supabase.from('deal_redemptions').insert({
    deal_code_id: dealCodeId,
    user_id: userId,
    tier,
    source,
  });

  if (insertError) {
    logger.warn('[deals] redemption insert', insertError);
  }

  await supabase
    .from('deal_codes')
    .update({
      redemption_count: previousCount + 1,
      redeemed_by: userId,
      redeemed_at: new Date().toISOString(),
    })
    .eq('id', dealCodeId);
}

export async function importDealCodes(
  rows: { code: string; tier: DealTier; source?: DealSource; notes?: string }[]
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const code = row.code.trim();
    const codeNormalized = normalizeDealCode(code);
    if (!codeNormalized) {
      skipped += 1;
      continue;
    }

    const { error } = await supabase.from('deal_codes').upsert(
      {
        code,
        code_normalized: codeNormalized,
        tier: row.tier,
        source: row.source ?? 'appsumo',
        max_redemptions: 1,
        notes: row.notes ?? null,
      },
      { onConflict: 'code_normalized', ignoreDuplicates: true }
    );

    if (error) {
      skipped += 1;
      logger.warn('[deals] import skip', { codeNormalized, error });
    } else {
      imported += 1;
    }
  }

  return { imported, skipped };
}
