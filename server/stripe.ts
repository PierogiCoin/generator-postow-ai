import Stripe from 'stripe';
import { supabase } from './supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as any,
});

// ============================================
// PRICING CONFIGURATION
// ============================================

export const PRICING = {
  // Subskrypcje miesięczne
  subscriptions: {
    free: {
      name: 'Free',
      price: 0,
      priceId: null,
      credits: 100,
      features: {
        postsPerMonth: 10,
        imagesPerMonth: 5,
        videosPerMonth: 0,
        platforms: 1,
        scheduling: false,
        analytics: false,
        brandVoices: 1,
        apiAccess: false,
      }
    },
    pro: {
      name: 'Pro',
      price: 29,
      priceId: process.env.STRIPE_PRO_PRICE_ID,
      credits: 1000,
      features: {
        postsPerMonth: 100,
        imagesPerMonth: 50,
        videosPerMonth: 10,
        platforms: 5,
        scheduling: true,
        analytics: true,
        brandVoices: 5,
        apiAccess: false,
      }
    },
    business: {
      name: 'Business',
      price: 99,
      priceId: process.env.STRIPE_BUSINESS_PRICE_ID,
      credits: 5000,
      features: {
        postsPerMonth: 500,
        imagesPerMonth: 200,
        videosPerMonth: 50,
        platforms: 10,
        scheduling: true,
        analytics: true,
        brandVoices: 20,
        apiAccess: true,
      }
    },
    enterprise: {
      name: 'Enterprise',
      price: 299,
      priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
      credits: 20000,
      features: {
        postsPerMonth: -1, // Unlimited
        imagesPerMonth: -1,
        videosPerMonth: -1,
        platforms: -1,
        scheduling: true,
        analytics: true,
        brandVoices: -1,
        apiAccess: true,
      }
    }
  },

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
  creditPacks: {
    small: {
      name: 'Small Pack',
      credits: 500,
      price: 9.99,
      priceId: process.env.STRIPE_CREDITS_SMALL_PRICE_ID,
    },
    medium: {
      name: 'Medium Pack',
      credits: 1500,
      price: 24.99,
      priceId: process.env.STRIPE_CREDITS_MEDIUM_PRICE_ID,
      discount: '17%'
    },
    large: {
      name: 'Large Pack',
      credits: 3500,
      price: 49.99,
      priceId: process.env.STRIPE_CREDITS_LARGE_PRICE_ID,
      discount: '29%'
    },
    mega: {
      name: 'Mega Pack',
      credits: 10000,
      price: 99.99,
      priceId: process.env.STRIPE_CREDITS_MEGA_PRICE_ID,
      discount: '50%'
    }
  }
};

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

export async function createCheckoutSession(
  userId: string,
  priceId: string,
  mode: 'subscription' | 'payment' = 'subscription'
) {
  const { data: user } = await supabase
    .from('users')
    .select('email, stripe_customer_id')
    .eq('id', userId)
    .single();

  if (!user) throw new Error('User not found');

  let customerId = user.stripe_customer_id;

  // Create Stripe customer if doesn't exist
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId }
    });
    customerId = customer.id;

    await supabase
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/pricing`,
    metadata: { userId }
  });

  return session;
}

export async function createPortalSession(userId: string) {
  const { data: user } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (!user?.stripe_customer_id) {
    throw new Error('No Stripe customer found');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${process.env.FRONTEND_URL}/dashboard`
  });

  return session;
}

// ============================================
// CREDIT MANAGEMENT
// ============================================

export async function deductCredits(
  userId: string,
  amount: number,
  action: string,
  metadata?: any
) {
  // Premium mode: track usage only, never block or deduct
  try {
    await supabase.from('usage_tracking').insert({
      user_id: userId,
      action,
      credits_used: amount,
      metadata
    });
  } catch (_) {
    // Ignore tracking errors silently
  }
  return { success: true, remainingCredits: 999999 };
}

export async function addCredits(userId: string, amount: number, reason: string) {
  const { data: user } = await supabase
    .from('users')
    .select('credits')
    .eq('id', userId)
    .single();

  if (!user) throw new Error('User not found');

  const { error } = await supabase
    .from('users')
    .update({ credits: user.credits + amount })
    .eq('id', userId);

  if (error) throw error;

  // Track credit addition
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount,
    type: 'credit',
    reason,
    balance_after: user.credits + amount
  });

  return { success: true, newBalance: user.credits + amount };
}

export async function checkCredits(userId: string, requiredAmount: number) {
  // Premium mode: always allow – no credit limits enforced
  return {
    hasEnough: true,
    currentCredits: 999999,
    requiredCredits: requiredAmount,
    plan: 'enterprise'
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
      console.log(`Unhandled event type: ${event.type}`);
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
  const userId = subscription.metadata.userId;
  if (!userId) return;

  const priceId = subscription.items.data[0].price.id;

  // Find plan by price ID
  let plan = 'free';
  for (const [key, value] of Object.entries(PRICING.subscriptions)) {
    if (value.priceId === priceId) {
      plan = key;
      break;
    }
  }

  // Update user plan and credits
  const planConfig = PRICING.subscriptions[plan as keyof typeof PRICING.subscriptions];

  await supabase
    .from('users')
    .update({
      plan,
      credits: planConfig.credits,
      subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_current_period_end: new Date((subscription as any).current_period_end * 1000)
    })
    .eq('id', userId);

  // Create subscription record
  await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    plan,
    status: subscription.status,
    current_period_start: new Date((subscription as any).current_period_start * 1000),
    current_period_end: new Date((subscription as any).current_period_end * 1000),
    cancel_at_period_end: subscription.cancel_at_period_end
  });
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  if (!userId) return;

  await supabase
    .from('users')
    .update({
      plan: 'free',
      credits: PRICING.subscriptions.free.credits,
      subscription_id: null,
      subscription_status: 'canceled'
    })
    .eq('id', userId);

  await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', subscription.id);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const userId = (invoice as any).subscription_details?.metadata?.userId;
  if (!userId) return;

  // Refill monthly credits
  const { data: user } = await supabase
    .from('users')
    .select('plan')
    .eq('id', userId)
    .single();

  if (user) {
    const planConfig = PRICING.subscriptions[user.plan as keyof typeof PRICING.subscriptions];
    await supabase
      .from('users')
      .update({ credits: planConfig.credits })
      .eq('id', userId);
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
