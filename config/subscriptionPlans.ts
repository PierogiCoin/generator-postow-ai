import { UserPlan } from '../types';
import {
  CREDIT_PACK_PRICING,
  SUBSCRIPTION_PRICING,
  creditPackBadge,
  formatCreditPackPrice,
  formatSubscriptionPrice,
  formatUsdPrice,
  formatPlnPrice,
  savingsVsRetailPercent,
  yearlyPlnFromMonthly,
  yearlyUsdFromMonthly,
  type BillingInterval,
} from './pricingMath';

export type { BillingInterval };

export type PlanStripeKey =
  | 'free'
  | 'creator'
  | 'pro'
  | 'business'
  | 'agency'
  | 'enterprise';

export interface PlanFeatureRow {
  id: string;
  labelPl: string;
  limit?: string;
}

export interface SubscriptionPlanConfig {
  id: UserPlan;
  stripeKey: PlanStripeKey;
  name: string;
  namePl: string;
  priceUsd: number;
  pricePln: number;
  priceUsdYearly: number;
  pricePlnYearly: number;
  credits: number;
  /** Szacunek postów tekstowych / mies. (10 kredytów/post) */
  estimatedPosts: number;
  /** Oszczędność vs pakiet detaliczny (%) — tylko plany płatne */
  savingsPercent: number;
  descriptionPl: string;
  recommended?: boolean;
  stripePriceEnv: string | null;
  stripePriceEnvYearly: string | null;
  features: PlanFeatureRow[];
  usageLimits: {
    text: number;
    image: number;
    video: number;
    campaign: number;
  };
  flags: {
    scheduling: boolean;
    analytics: boolean;
    strategist: boolean;
    brandVoices: number;
    apiAccess: boolean;
  };
}

function withYearlyPricing(monthly: { priceUsd: number; pricePln: number; credits: number; estimatedPosts: number }) {
  return {
    ...monthly,
    priceUsdYearly: yearlyUsdFromMonthly(monthly.priceUsd),
    pricePlnYearly: yearlyPlnFromMonthly(monthly.priceUsd),
  };
}

/** Format limitu z usageLimits — ten sam string na kartach i w porównaniu */
export function formatUsageLimit(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  return n.toLocaleString('pl-PL');
}

export const CREDIT_PACKS = CREDIT_PACK_PRICING.map((pack) => ({
  id: pack.id,
  name: pack.id.charAt(0).toUpperCase() + pack.id.slice(1),
  namePl: { small: 'Mały', medium: 'Średni', large: 'Duży', mega: 'Mega' }[pack.id],
  credits: pack.credits,
  priceUsd: pack.priceUsd,
  pricePln: pack.pricePln,
  stripePriceEnv: `STRIPE_CREDITS_${pack.id.toUpperCase()}_PRICE_ID`,
  badge: creditPackBadge(pack),
}));

export const SUBSCRIPTION_PLANS: SubscriptionPlanConfig[] = [
  {
    id: UserPlan.Free,
    stripeKey: 'free',
    name: 'Free',
    namePl: 'Darmowy',
    ...withYearlyPricing(SUBSCRIPTION_PRICING.free),
    savingsPercent: 0,
    descriptionPl: 'Poznaj AI bez karty — limit zgodny z limitem konta.',
    stripePriceEnv: null,
    stripePriceEnvYearly: null,
    features: [
      { id: 'credits', labelPl: 'Kredyty / mies.', limit: formatUsageLimit(SUBSCRIPTION_PRICING.free.credits) },
      { id: 'text', labelPl: 'Posty tekstowe', limit: formatUsageLimit(10) },
      { id: 'image', labelPl: 'Obrazy AI', limit: formatUsageLimit(3) },
      { id: 'campaign', labelPl: 'Kampanie AI', limit: formatUsageLimit(1) },
    ],
    usageLimits: { text: 10, image: 3, video: 0, campaign: 1 },
    flags: {
      scheduling: false,
      analytics: false,
      strategist: false,
      brandVoices: 1,
      apiAccess: false,
    },
  },
  {
    id: UserPlan.Creator,
    stripeKey: 'creator',
    name: 'Creator',
    namePl: 'Creator',
    ...withYearlyPricing(SUBSCRIPTION_PRICING.creator),
    savingsPercent: savingsVsRetailPercent(
      SUBSCRIPTION_PRICING.creator.priceUsd,
      SUBSCRIPTION_PRICING.creator.credits
    ),
    descriptionPl: 'Freelancerzy i twórcy — kalendarz, wideo i głos marki.',
    stripePriceEnv: 'STRIPE_CREATOR_PRICE_ID',
    stripePriceEnvYearly: 'STRIPE_CREATOR_YEARLY_PRICE_ID',
    features: [
      { id: 'credits', labelPl: 'Kredyty / mies.', limit: formatUsageLimit(SUBSCRIPTION_PRICING.creator.credits) },
      { id: 'text', labelPl: 'Posty tekstowe', limit: formatUsageLimit(100) },
      { id: 'image', labelPl: 'Obrazy AI', limit: formatUsageLimit(20) },
      { id: 'video', labelPl: 'Wideo AI', limit: formatUsageLimit(2) },
      { id: 'schedule', labelPl: 'Planowanie i kalendarz' },
      { id: 'brand', labelPl: 'Profile głosu marki', limit: '1' },
    ],
    usageLimits: { text: 100, image: 20, video: 2, campaign: 5 },
    flags: {
      scheduling: true,
      analytics: false,
      strategist: false,
      brandVoices: 1,
      apiAccess: false,
    },
  },
  {
    id: UserPlan.Pro,
    stripeKey: 'pro',
    name: 'Pro',
    namePl: 'Pro',
    ...withYearlyPricing(SUBSCRIPTION_PRICING.pro),
    savingsPercent: savingsVsRetailPercent(
      SUBSCRIPTION_PRICING.pro.priceUsd,
      SUBSCRIPTION_PRICING.pro.credits
    ),
    recommended: true,
    descriptionPl: 'Najlepszy wybór solo — analityka, strategista i 5 profili marki.',
    stripePriceEnv: 'STRIPE_PRO_PRICE_ID',
    stripePriceEnvYearly: 'STRIPE_PRO_YEARLY_PRICE_ID',
    features: [
      { id: 'credits', labelPl: 'Kredyty / mies.', limit: formatUsageLimit(SUBSCRIPTION_PRICING.pro.credits) },
      { id: 'text', labelPl: 'Posty tekstowe', limit: formatUsageLimit(500) },
      { id: 'image', labelPl: 'Obrazy AI', limit: formatUsageLimit(100) },
      { id: 'video', labelPl: 'Wideo AI', limit: formatUsageLimit(10) },
      { id: 'analytics', labelPl: 'Analityka i strategista AI' },
      { id: 'brand', labelPl: 'Profile głosu marki', limit: '5' },
    ],
    usageLimits: { text: 500, image: 100, video: 10, campaign: 20 },
    flags: {
      scheduling: true,
      analytics: true,
      strategist: true,
      brandVoices: 5,
      apiAccess: false,
    },
  },
  {
    id: UserPlan.Business,
    stripeKey: 'business',
    name: 'Business',
    namePl: 'Business',
    ...withYearlyPricing(SUBSCRIPTION_PRICING.business),
    savingsPercent: savingsVsRetailPercent(
      SUBSCRIPTION_PRICING.business.priceUsd,
      SUBSCRIPTION_PRICING.business.credits
    ),
    descriptionPl: 'Zespoły marketingowe — API, 6 000 kredytów i 20 profili marki.',
    stripePriceEnv: 'STRIPE_BUSINESS_PRICE_ID',
    stripePriceEnvYearly: 'STRIPE_BUSINESS_YEARLY_PRICE_ID',
    features: [
      { id: 'credits', labelPl: 'Kredyty / mies.', limit: formatUsageLimit(SUBSCRIPTION_PRICING.business.credits) },
      { id: 'text', labelPl: 'Posty tekstowe', limit: formatUsageLimit(800) },
      { id: 'image', labelPl: 'Obrazy AI', limit: formatUsageLimit(200) },
      { id: 'video', labelPl: 'Wideo AI', limit: formatUsageLimit(50) },
      { id: 'api', labelPl: 'Dostęp API' },
      { id: 'brand', labelPl: 'Profile głosu marki', limit: '20' },
    ],
    usageLimits: { text: 800, image: 200, video: 50, campaign: 50 },
    flags: {
      scheduling: true,
      analytics: true,
      strategist: true,
      brandVoices: 20,
      apiAccess: true,
    },
  },
  {
    id: UserPlan.Agency,
    stripeKey: 'agency',
    name: 'Agency',
    namePl: 'Agency',
    ...withYearlyPricing(SUBSCRIPTION_PRICING.agency),
    savingsPercent: savingsVsRetailPercent(
      SUBSCRIPTION_PRICING.agency.priceUsd,
      SUBSCRIPTION_PRICING.agency.credits
    ),
    descriptionPl: 'Agencje — 18 000 kredytów, więcej wideo niż Business, ∞ kampanii.',
    stripePriceEnv: 'STRIPE_AGENCY_PRICE_ID',
    stripePriceEnvYearly: 'STRIPE_AGENCY_YEARLY_PRICE_ID',
    features: [
      { id: 'credits', labelPl: 'Kredyty / mies.', limit: formatUsageLimit(SUBSCRIPTION_PRICING.agency.credits) },
      { id: 'text', labelPl: 'Posty tekstowe', limit: formatUsageLimit(2000) },
      { id: 'image', labelPl: 'Obrazy AI', limit: formatUsageLimit(400) },
      { id: 'video', labelPl: 'Wideo AI', limit: formatUsageLimit(80) },
      { id: 'campaign', labelPl: 'Kampanie AI', limit: '∞' },
      { id: 'brand', labelPl: 'Profile głosu marki', limit: '∞' },
    ],
    usageLimits: { text: 2000, image: 400, video: 80, campaign: Infinity },
    flags: {
      scheduling: true,
      analytics: true,
      strategist: true,
      brandVoices: -1,
      apiAccess: true,
    },
  },
  {
    id: UserPlan.Enterprise,
    stripeKey: 'enterprise',
    name: 'Enterprise',
    namePl: 'Enterprise',
    ...withYearlyPricing(SUBSCRIPTION_PRICING.enterprise),
    savingsPercent: savingsVsRetailPercent(
      SUBSCRIPTION_PRICING.enterprise.priceUsd,
      SUBSCRIPTION_PRICING.enterprise.credits
    ),
    descriptionPl: '28 000 kredytów, white-label i priorytetowy support.',
    stripePriceEnv: 'STRIPE_ENTERPRISE_PRICE_ID',
    stripePriceEnvYearly: 'STRIPE_ENTERPRISE_YEARLY_PRICE_ID',
    features: [
      { id: 'credits', labelPl: 'Kredyty / mies.', limit: formatUsageLimit(SUBSCRIPTION_PRICING.enterprise.credits) },
      { id: 'text', labelPl: 'Posty tekstowe', limit: '∞' },
      { id: 'unlimited', labelPl: 'Limity generacji', limit: '∞' },
      { id: 'api_whitelabel', labelPl: 'API + white-label' },
      { id: 'support', labelPl: 'Priorytetowy support' },
    ],
    usageLimits: { text: Infinity, image: Infinity, video: Infinity, campaign: Infinity },
    flags: {
      scheduling: true,
      analytics: true,
      strategist: true,
      brandVoices: -1,
      apiAccess: true,
    },
  },
];

export const PAID_SUBSCRIPTION_PLANS = SUBSCRIPTION_PLANS.filter((p) => p.priceUsd > 0);

export function getPlanByUserPlan(plan: UserPlan): SubscriptionPlanConfig {
  return SUBSCRIPTION_PLANS.find((p) => p.id === plan) ?? SUBSCRIPTION_PLANS[0];
}

export function getPlanByStripeKey(key: string): SubscriptionPlanConfig | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.stripeKey === key);
}

export {
  formatUsdPrice,
  formatPlnPrice,
  formatSubscriptionPrice,
  formatCreditPackPrice,
  yearlyUsdFromMonthly,
  yearlyPlnFromMonthly,
  ANNUAL_MONTHS_BILLED,
} from './pricingMath';

export function buildUsageLimitsRecord(): Record<
  UserPlan,
  { text: number; image: number; video: number; campaign: number }
> {
  return SUBSCRIPTION_PLANS.reduce(
    (acc, plan) => {
      acc[plan.id] = plan.usageLimits;
      return acc;
    },
    {} as Record<UserPlan, { text: number; image: number; video: number; campaign: number }>
  );
}

export function buildCreditsByPlan(): Record<UserPlan, number> {
  return SUBSCRIPTION_PLANS.reduce(
    (acc, plan) => {
      acc[plan.id] = plan.credits;
      return acc;
    },
    {} as Record<UserPlan, number>
  );
}
