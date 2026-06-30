import express, { Request, Response, NextFunction } from 'express';
import {
  createCheckoutSession,
  createPortalSession,
  handleStripeWebhook,
  checkCredits,
  getUsageStats,
  PRICING,
} from '../stripe.js';
import { requireSupabaseAuth, SupabaseAuthRequest } from '../middleware/supabaseAuth.js';
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
      const { plan } = req.body as { plan?: string };
      const userId = req.user!.id;

      if (!plan || !isPaidPlan(plan)) {
        return res.status(400).json({ error: 'Nieprawidłowy plan subskrypcji' });
      }

      const planConfig = PRICING.subscriptions[plan];
      if (!planConfig?.priceId) {
        return res.status(503).json({
          error: 'Ten plan nie jest jeszcze skonfigurowany w Stripe. Skontaktuj się z supportem.',
        });
      }

      const session = await createCheckoutSession(userId, planConfig.priceId, 'subscription');

      res.json({ sessionId: session.id, url: session.url });
    } catch (error: unknown) {
      logger.error('Checkout error:', error);
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
