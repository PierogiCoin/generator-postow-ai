import Stripe from 'stripe';
import { supabase } from './supabase';
import logger from './logger.js';
import { buildCreditPacksConfig, buildSubscriptionsConfig } from './lib/pricingConfig.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
});

// ============================================
// PRICING CONFIGURATION
// ============================================

export const PRICING = {
  subscriptions: buildSubscriptionsConfig(),

  // Koszty per-use (w kredytach)
  costs: {
    // Generowanie treści
    generatePost: 10,
    generateHashtags: 5,
    generateImage: 50,
    generateVideo: 200,

    // Publishing
    publishPost: 20,
    schedulePost: 15,

    // Analityka
    analyticsSync: 5,

    // AI Features
    brandVoiceAnalysis: 30,
    contentOptimization: 25,
    sentimentAnalysis: 15,

    // Video Features (based on length)
    videoStoryShort: 200,    // 0-15s
    videoStoryMedium: 350,   // 16-30s
    videoStoryLong: 500,     // 31-60s

    // Image Features
    imageBasic: 50,          // Basic generation
    imageAdvanced: 100,      // With style transfer
    imageBatch: 40,          // Per image in batch (discount)
  },

  // Pakiety kredytów (one-time purchase)
  creditPacks: buildCreditPacksConfig(),
};

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

const frontendUrl = () =>
  (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

async function getBillingUser(userId: string) {
  const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
  if (authError || !authData.user?.email) {
    throw new Error('Nie znaleziono użytkownika');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, plan, stripe_customer_id')
    .eq('id', userId)
    .maybeSingle();

  return {
    email: authData.user.email,
    stripeCustomerId: profile?.stripe_customer_id as string | undefined,
  };
}

export async function createCheckoutSession(
  userId: string,
  priceId: string,
  mode: 'subscription' | 'payment' = 'subscription'
) {
  const billingUser = await getBillingUser(userId);
  let customerId = billingUser.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: billingUser.email,
      metadata: { userId },
    });
    customerId = customer.id;

    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${frontendUrl()}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendUrl()}/pricing?canceled=1`,
    metadata: { userId },
    ...(mode === 'subscription'
      ? { subscription_data: { metadata: { userId } } }
      : {}),
  });

  return session;
}

export async function createPortalSession(userId: string) {
  const billingUser = await getBillingUser(userId);

  if (!billingUser.stripeCustomerId) {
    throw new Error('Brak aktywnej subskrypcji Stripe');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: billingUser.stripeCustomerId,
    return_url: `${frontendUrl()}/account`,
  });

  return session;
}

// ============================================
// CREDIT MANAGEMENT
// ============================================

const creditsDisabled = () => process.env.DISABLE_CREDIT_LIMITS === 'true';

export async function deductCredits(
  userId: string,
  amount: number,
  action: string,
  metadata?: Record<string, unknown>
) {
  if (creditsDisabled()) {
    try {
      await supabase.from('usage_tracking').insert({
        user_id: userId,
        action,
        credits_used: amount,
        metadata,
      });
    } catch {
      // ignore
    }
    return { success: true, remainingCredits: 999999 };
  }

  const check = await checkCredits(userId, amount);
  if (!check.hasEnough) {
    throw new Error('Insufficient credits');
  }

  const newBalance = check.currentCredits - amount;
  const { error } = await supabase
    .from('profiles')
    .update({ credits: newBalance })
    .eq('id', userId);

  if (error) throw error;

  try {
    await supabase.from('usage_tracking').insert({
      user_id: userId,
      action,
      credits_used: amount,
      metadata,
    });
  } catch {
    // ignore tracking errors
  }

  try {
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount: -amount,
      type: 'debit',
      reason: action,
      balance_after: newBalance,
    });
  } catch {
    // optional table
  }

  return { success: true, remainingCredits: newBalance };
}

export async function addCredits(userId: string, amount: number, reason: string) {
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .maybeSingle();

  if (fetchError || !profile) throw new Error('User not found');

  const newBalance = (profile.credits ?? 0) + amount;
  const { error } = await supabase
    .from('profiles')
    .update({ credits: newBalance })
    .eq('id', userId);

  if (error) throw error;

  try {
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      amount,
      type: 'credit',
      reason,
      balance_after: newBalance,
    });
  } catch {
    // optional table
  }

  return { success: true, newBalance };
}

export async function checkCredits(userId: string, requiredAmount: number) {
  if (creditsDisabled()) {
    return {
      hasEnough: true,
      currentCredits: 999999,
      requiredCredits: requiredAmount,
      plan: 'enterprise',
    };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('credits, plan')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) {
    return {
      hasEnough: false,
      currentCredits: 0,
      requiredCredits: requiredAmount,
      plan: 'free',
    };
  }

  const currentCredits = profile.credits ?? 0;
  return {
    hasEnough: currentCredits >= requiredAmount,
    currentCredits,
    requiredCredits: requiredAmount,
    plan: profile.plan || 'free',
  };
}

// ============================================
// WEBHOOK HANDLERS
// ============================================

export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      logger.warn(`Unhandled Stripe event type: ${event.type}`);
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  // Get session details
  const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
    session.id,
    { expand: ['line_items.data.price.product'] }
  );

  const lineItem = sessionWithLineItems.line_items?.data[0];
  const priceId = lineItem?.price?.id;

  // Check if it's a subscription or credit pack
  if (session.mode === 'subscription') {
    // Handled by subscription.created webhook
    return;
  }

  // Handle credit pack purchase
  const creditPack = Object.values(PRICING.creditPacks).find(
    pack => pack.priceId === priceId
  );

  if (creditPack) {
    await addCredits(userId, creditPack.credits, 'Credit pack purchase');
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  let userId = subscription.metadata?.userId;

  if (!userId && subscription.customer) {
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    userId = profile?.id;
  }

  if (!userId) return;

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) return;

  let plan = 'free';
  for (const [key, value] of Object.entries(PRICING.subscriptions)) {
    if (value.priceId === priceId) {
      plan = key;
      break;
    }
  }

  const planConfig = PRICING.subscriptions[plan as keyof typeof PRICING.subscriptions];

  await supabase
    .from('profiles')
    .update({
      plan,
      credits: planConfig.credits,
      subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_current_period_end: new Date((subscription as any).current_period_end * 1000),
    })
    .eq('id', userId);

  await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    plan,
    status: subscription.status,
    current_period_start: new Date((subscription as any).current_period_start * 1000),
    current_period_end: new Date((subscription as any).current_period_end * 1000),
    cancel_at_period_end: subscription.cancel_at_period_end,
  });
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  let userId = subscription.metadata?.userId;

  if (!userId && subscription.customer) {
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    userId = profile?.id;
  }

  if (!userId) return;

  await supabase
    .from('profiles')
    .update({
      plan: 'free',
      credits: PRICING.subscriptions.free.credits,
      subscription_id: null,
      subscription_status: 'canceled',
    })
    .eq('id', userId);

  await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', subscription.id);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;

  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.plan) {
    const planConfig = PRICING.subscriptions[profile.plan as keyof typeof PRICING.subscriptions];
    if (planConfig) {
      await supabase
        .from('profiles')
        .update({ credits: planConfig.credits })
        .eq('id', userId);
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const userId = (invoice as any).subscription_details?.metadata?.userId;
  if (!userId) return;

  // Notify user about payment failure
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'payment_failed',
    title: 'Payment Failed',
    message: 'Your subscription payment failed. Please update your payment method.',
    metadata: { invoiceId: invoice.id }
  });
}

// ============================================
// USAGE TRACKING
// ============================================

export async function trackUsage(
  userId: string,
  action: keyof typeof PRICING.costs,
  metadata?: any
) {
  const cost = PRICING.costs[action];

  try {
    await deductCredits(userId, cost, action, metadata);
    return { success: true, cost };
  } catch (error: any) {
    if (error.message === 'Insufficient credits') {
      return { success: false, error: 'insufficient_credits', cost };
    }
    throw error;
  }
}

export async function getUsageStats(userId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  const stats = {
    totalCreditsUsed: 0,
    byAction: {} as Record<string, number>,
    byDay: {} as Record<string, number>
  };

  data?.forEach(usage => {
    stats.totalCreditsUsed += usage.credits_used;
    stats.byAction[usage.action] = (stats.byAction[usage.action] || 0) + usage.credits_used;

    const day = new Date(usage.created_at).toISOString().split('T')[0];
    stats.byDay[day] = (stats.byDay[day] || 0) + usage.credits_used;
  });

  return stats;
}

export default stripe;
