import { Router } from 'express';

function oauthConfigured(): Record<string, boolean> {
  return {
    linkedin: Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
    twitter: Boolean(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET),
    facebook: Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
    tiktok: Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
  };
}

function oauthCallbacks(backendUrl: string): Record<string, string> {
  const base = backendUrl.replace(/\/$/, '');
  return {
    linkedin: `${base}/api/auth/linkedin/callback`,
    twitter: `${base}/api/auth/twitter/callback`,
    facebook: `${base}/api/auth/facebook/callback`,
    tiktok: `${base}/api/auth/tiktok/callback`,
  };
}

function stripeStatus() {
  const secretKey = Boolean(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const priceIds = [
    process.env.STRIPE_PRICE_PRO,
    process.env.STRIPE_PRICE_BUSINESS,
    process.env.STRIPE_PRICE_CREDITS_STARTER,
    process.env.STRIPE_PRICE_PRO_YEARLY,
    process.env.STRIPE_PRICE_BUSINESS_YEARLY,
  ].filter(Boolean);
  const liveMode = Boolean(process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_'));
  const testMode = Boolean(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'));
  return {
    secretKey,
    webhookSecret,
    priceIdsConfigured: priceIds.length,
    priceIdsTotal: 5,
    ready: secretKey && webhookSecret && priceIds.length >= 1,
    liveMode,
    testMode,
    productionReady: liveMode && webhookSecret && priceIds.length >= 1,
  };
}

/**
 * Public health endpoint — only non-sensitive operational fields.
 * Detailed deploy/API/Stripe status must not be exposed publicly.
 */
export function createHealthRouter(): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  /**
   * Protected readiness probe for ops scripts (prod:readiness).
   * Header: x-cron-secret: $CRON_SECRET
   */
  router.get('/health/ready', (req, res) => {
    const expected = process.env.CRON_SECRET;
    const provided = String(req.headers['x-cron-secret'] || '');
    if (!expected || provided !== expected) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const backendUrl =
      process.env.PUBLIC_BACKEND_URL ||
      process.env.FRONTEND_URL ||
      `http://localhost:${process.env.PORT || 3001}`;

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      deploy: {
        oauthCallbacks: oauthCallbacks(backendUrl),
        oauthConfigured: oauthConfigured(),
        stripe: stripeStatus(),
      },
    });
  });

  return router;
}
