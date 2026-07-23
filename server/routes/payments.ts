import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  createCheckoutSession,
  createTrialCheckoutSession,
  createPortalSession,
  handleStripeWebhook,
  checkCredits,
  getUsageStats,
  PRICING,
} from '../stripe.js';

const subscriptionCheckoutSchema = z.object({
  plan: z.enum(['creator', 'pro', 'agency', 'business', 'enterprise']),
  interval: z.enum(['month', 'year']).optional().default('month'),
});
import { requireSupabaseAuth, SupabaseAuthRequest } from '../middleware/supabaseAuth.js';
import { supabase } from '../supabase.js';
import logger from '../logger.js';
import stripe from '../stripe.js';

const router = express.Router();

const PAID_PLANS = ['creator', 'pro', 'agency', 'business', 'enterprise'] as const;
type PaidPlan = (typeof PAID_PLANS)[number];

function isPaidPlan(plan: string): plan is PaidPlan {
  return (PAID_PLANS as readonly string[]).includes(plan);
}

// ============================================
// PRICING INFORMATION
// ============================================

router.get('/pricing', (_req, res) => {
  res.json({
    subscriptions: PRICING.subscriptions,
    creditPacks: PRICING.creditPacks,
    costs: PRICING.costs,
  });
});

// ============================================
// SUBSCRIPTION CHECKOUT
// ============================================

router.post(
  '/checkout/subscription',
  requireSupabaseAuth,
  async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
    try {
      const parseResult = subscriptionCheckoutSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Nieprawidłowe parametry planu lub okresu rozliczeniowego' });
      }

      const { plan, interval } = parseResult.data;
      const userId = req.user!.id;

      const planConfig = PRICING.subscriptions[plan];
      const priceId =
        interval === 'year' ? planConfig?.yearlyPriceId : planConfig?.priceId;

      if (!priceId) {
        return res.status(503).json({
          error:
            interval === 'year'
              ? 'Rozliczenie roczne nie jest jeszcze skonfigurowane w Stripe dla tego planu.'
              : 'Ten plan nie jest jeszcze skonfigurowany w Stripe. Skontaktuj się z supportem.',
        });
      }

      const session = await createCheckoutSession(userId, priceId, 'subscription');

      res.json({ sessionId: session.id, url: session.url, interval });
    } catch (error: unknown) {
      logger.error('Checkout error:', error);
      next(error);
    }
  }
);

// ============================================
// FREE TRIAL CHECKOUT (7 days Pro)
// ============================================

router.post(
  '/checkout/trial',
  requireSupabaseAuth,
  async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
    try {
      const { plan = 'pro', trialDays = 7 } = req.body as { plan?: string; trialDays?: number };
      const userId = req.user!.id;

      if (!isPaidPlan(plan)) {
        return res.status(400).json({ error: 'Nieprawidłowy plan' });
      }

      const planConfig = PRICING.subscriptions[plan];
      if (!planConfig?.priceId) {
        return res.status(503).json({
          error: 'Ten plan nie jest jeszcze skonfigurowany w Stripe.',
        });
      }

      const session = await createTrialCheckoutSession(userId, planConfig.priceId, trialDays);

      res.json({ sessionId: session.id, url: session.url, trialDays });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('Trial już był wykorzystany')) {
        return res.status(409).json({ error: errMsg });
      }
      logger.error('Trial checkout error:', error);
      next(error);
    }
  }
);

// ============================================
// CREDIT PACK CHECKOUT
// ============================================

router.post(
  '/checkout/credits',
  requireSupabaseAuth,
  async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
    try {
      const { pack } = req.body as { pack?: string };
      const userId = req.user!.id;

      const packConfig = PRICING.creditPacks[pack as keyof typeof PRICING.creditPacks];
      if (!packConfig?.priceId) {
        return res.status(400).json({ error: 'Nieprawidłowy pakiet kredytów' });
      }

      const session = await createCheckoutSession(userId, packConfig.priceId, 'payment');

      res.json({ sessionId: session.id, url: session.url });
    } catch (error: unknown) {
      logger.error('Credit checkout error:', error);
      next(error);
    }
  }
);

// ============================================
// CUSTOMER PORTAL
// ============================================

router.post(
  '/portal',
  requireSupabaseAuth,
  async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const session = await createPortalSession(userId);

      res.json({ url: session.url });
    } catch (error: unknown) {
      logger.error('Portal error:', error);
      next(error);
    }
  }
);

// ============================================
// CHECK CREDITS
// ============================================

router.post(
  '/check-credits',
  requireSupabaseAuth,
  async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
    try {
      const { action } = req.body as { action?: string };
      const userId = req.user!.id;

      const cost = PRICING.costs[action as keyof typeof PRICING.costs];
      if (!cost) {
        return res.status(400).json({ error: 'Nieprawidłowa akcja' });
      }

      const result = await checkCredits(userId, cost);
      res.json(result);
    } catch (error: unknown) {
      logger.error('Check credits error:', error);
      next(error);
    }
  }
);

// ============================================
// USAGE STATS
// ============================================

router.get(
  '/usage',
  requireSupabaseAuth,
  async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const days = parseInt(req.query.days as string, 10) || 30;

      const stats = await getUsageStats(userId, days);
      res.json(stats);
    } catch (error: unknown) {
      logger.error('Usage stats error:', error);
      next(error);
    }
  }
);

// ============================================
// CREDIT ROLLOVER HISTORY
// ============================================

router.get(
  '/rollover-history',
  requireSupabaseAuth,
  async (req: SupabaseAuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const { data, error } = await supabase
        .from('credit_rollover_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;

      const totalRolledOver = (data || []).reduce((sum, r) => sum + r.rolled_over, 0);

      res.json({
        history: data || [],
        totalRolledOver,
      });
    } catch (error: unknown) {
      logger.error('Rollover history error:', error);
      next(error);
    }
  }
);

// ============================================
// STRIPE WEBHOOK (mounted separately with raw body)
// ============================================

export async function stripeWebhookHandler(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    await handleStripeWebhook(event);
    res.json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook error';
    logger.error('Webhook error:', error);
    res.status(400).json({ error: message });
  }
}

export default router;
