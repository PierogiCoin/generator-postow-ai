import express from 'express';
import { 
  createCheckoutSession, 
  createPortalSession,
  handleStripeWebhook,
  checkCredits,
  getUsageStats,
  PRICING
} from '../stripe';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// ============================================
// PRICING INFORMATION
// ============================================

router.get('/pricing', (req, res) => {
  res.json({
    subscriptions: PRICING.subscriptions,
    creditPacks: PRICING.creditPacks,
    costs: PRICING.costs
  });
});

// ============================================
// SUBSCRIPTION CHECKOUT
// ============================================

router.post('/checkout/subscription', requireAuth, async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;

    const planConfig = PRICING.subscriptions[plan as keyof typeof PRICING.subscriptions];
    if (!planConfig || !planConfig.priceId) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const session = await createCheckoutSession(
      userId,
      planConfig.priceId,
      'subscription'
    );

    res.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CREDIT PACK CHECKOUT
// ============================================

router.post('/checkout/credits', requireAuth, async (req, res) => {
  try {
    const { pack } = req.body;
    const userId = req.user.id;

    const packConfig = PRICING.creditPacks[pack as keyof typeof PRICING.creditPacks];
    if (!packConfig || !packConfig.priceId) {
      return res.status(400).json({ error: 'Invalid credit pack' });
    }

    const session = await createCheckoutSession(
      userId,
      packConfig.priceId,
      'payment'
    );

    res.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Credit checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CUSTOMER PORTAL
// ============================================

router.post('/portal', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const session = await createPortalSession(userId);
    
    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Portal error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CHECK CREDITS
// ============================================

router.post('/check-credits', requireAuth, async (req, res) => {
  try {
    const { action } = req.body;
    const userId = req.user.id;

    const cost = PRICING.costs[action as keyof typeof PRICING.costs];
    if (!cost) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const result = await checkCredits(userId, cost);
    res.json(result);
  } catch (error: any) {
    console.error('Check credits error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// USAGE STATS
// ============================================

router.get('/usage', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days as string) || 30;

    const stats = await getUsageStats(userId, days);
    res.json(stats);
  } catch (error: any) {
    console.error('Usage stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STRIPE WEBHOOK
// ============================================

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;

  try {
    const stripe = require('../stripe').default;
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    await handleStripeWebhook(event);
    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
