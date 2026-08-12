import { UserPlan } from '../types';

export type DealSource = 'appsumo' | 'own';
export type DealTier = 1 | 2 | 3;

export interface DealTierConfig {
  tier: DealTier;
  name: string;
  namePl: string;
  /** Efektywny poziom funkcji (do planMeets / feature gates) */
  effectivePlan: UserPlan;
  monthlyCredits: number;
  descriptionPl: string;
}

/**
 * Tiery AppSumo / stack — mapują kod dealu na limity Lifetime.
 * Tier 1 ≈ Pro, Tier 2 ≈ Business, Tier 3 ≈ Agency.
 */
export const DEAL_TIERS: Record<DealTier, DealTierConfig> = {
  1: {
    tier: 1,
    name: 'Lifetime Starter',
    namePl: 'Lifetime Starter',
    effectivePlan: UserPlan.Pro,
    monthlyCredits: 1800,
    descriptionPl: 'Lifetime ≈ Pro: analityka, strategista, 1 800 kredytów / mies.',
  },
  2: {
    tier: 2,
    name: 'Lifetime Growth',
    namePl: 'Lifetime Growth',
    effectivePlan: UserPlan.Business,
    monthlyCredits: 6000,
    descriptionPl: 'Lifetime ≈ Business: teams, 6 000 kredytów / mies.',
  },
  3: {
    tier: 3,
    name: 'Lifetime Scale',
    namePl: 'Lifetime Scale',
    effectivePlan: UserPlan.Agency,
    monthlyCredits: 18000,
    descriptionPl: 'Lifetime ≈ Agency: ∞ kampanii, 18 000 kredytów / mies.',
  },
};

/** Własny LTD (Stripe one-time) = Tier 1 */
export const OWN_LTD_TIER: DealTier = 1;

/** Cena marketingowa własnego LTD (PLN) — Stripe Price ID z env */
export const OWN_LTD_PRICE_PLN = 499;

export function parseDealTier(value: unknown): DealTier | null {
  const n = typeof value === 'string' ? Number(value) : value;
  if (n === 1 || n === 2 || n === 3) return n;
  return null;
}

export function getDealTierConfig(tier: DealTier | null | undefined): DealTierConfig | null {
  if (!tier) return null;
  return DEAL_TIERS[tier] ?? null;
}

/** Plan używany do feature gates gdy user ma Lifetime + tier */
export function resolveEffectivePlan(
  plan: UserPlan,
  dealTier?: DealTier | null
): UserPlan {
  if (plan !== UserPlan.Lifetime) return plan;
  return getDealTierConfig(dealTier)?.effectivePlan ?? UserPlan.Pro;
}
