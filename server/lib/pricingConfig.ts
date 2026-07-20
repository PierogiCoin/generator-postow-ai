import type { PlanStripeKey } from '../../config/subscriptionPlans.js';
import * as subscriptionPlansModule from '../../config/subscriptionPlans.js';

/** tsx/Node ESM: named exports may appear on `default` when loading cross-root .ts files */
const subscriptionPlans =
  'SUBSCRIPTION_PLANS' in subscriptionPlansModule
    ? subscriptionPlansModule
    : (subscriptionPlansModule as { default: typeof subscriptionPlansModule }).default;

const { SUBSCRIPTION_PLANS, CREDIT_PACKS } = subscriptionPlans;

function readStripePrice(envKey: string | null): string | null {
  if (!envKey) return null;
  const value = process.env[envKey];
  return value && value.trim() ? value.trim() : null;
}

function limitToFeatureValue(n: number): number {
  return n === Infinity ? -1 : n;
}

export function buildSubscriptionsConfig() {
  const subscriptions: Record<
    PlanStripeKey,
    {
      name: string;
      price: number;
      pricePln: number;
      priceId: string | null;
      credits: number;
      estimatedPosts: number;
      savingsPercent: number;
      features: {
        postsPerMonth: number;
        imagesPerMonth: number;
        videosPerMonth: number;
        platforms: number;
        scheduling: boolean;
        analytics: boolean;
        brandVoices: number;
        apiAccess: boolean;
      };
    }
  > = {} as never;

  for (const plan of SUBSCRIPTION_PLANS) {
    const platforms =
      plan.stripeKey === 'free'
        ? 1
        : plan.stripeKey === 'creator'
          ? 3
          : plan.stripeKey === 'pro'
            ? 5
            : plan.stripeKey === 'agency' || plan.stripeKey === 'enterprise'
              ? -1
              : 10;

    subscriptions[plan.stripeKey] = {
      name: plan.name,
      price: plan.priceUsd,
      pricePln: plan.pricePln,
      credits: plan.credits,
      estimatedPosts: plan.estimatedPosts,
      savingsPercent: plan.savingsPercent,
      priceId: readStripePrice(plan.stripePriceEnv),
      features: {
        postsPerMonth: limitToFeatureValue(plan.usageLimits.text),
        imagesPerMonth: limitToFeatureValue(plan.usageLimits.image),
        videosPerMonth: limitToFeatureValue(plan.usageLimits.video),
        platforms,
        scheduling: plan.flags.scheduling,
        analytics: plan.flags.analytics,
        brandVoices: plan.flags.brandVoices,
        apiAccess: plan.flags.apiAccess,
      },
    };
  }

  return subscriptions;
}

export function buildCreditPacksConfig() {
  const packs: Record<
    string,
    {
      name: string;
      credits: number;
      price: number;
      pricePln: number;
      pricePerCreditUsd: number;
      badge: string | null;
      priceId: string | null;
      discount?: string;
    }
  > = {};

  for (const pack of CREDIT_PACKS) {
    packs[pack.id] = {
      name: pack.name,
      credits: pack.credits,
      price: pack.priceUsd,
      pricePln: pack.pricePln,
      pricePerCreditUsd: pack.priceUsd / pack.credits,
      badge: pack.badge ?? null,
      priceId: readStripePrice(pack.stripePriceEnv),
      ...(pack.badge ? { discount: pack.badge } : {}),
    };
  }

  return packs;
}
