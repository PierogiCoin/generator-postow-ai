import express from 'express';
import { applyCors } from './config/cors.js';
import { generalLimiter, checkPublicEndpointRateLimit } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createHealthRouter } from './routes/health.js';
import { createTemplatesRouter } from './routes/templates.js';
import { createSocialRouter } from './routes/social.js';
import { createBrandVoiceRouter } from './routes/brandVoice.js';
import { createGenerationRouter } from './routes/generation/index.js';
import { createCostsRouter } from './routes/costs.js';
import { createScoringRouter } from './routes/scoring.js';
import { createVideoRouter } from './routes/video.js';
import { createMiscRouter } from './routes/misc.js';
import { createIntelligenceRouter } from './routes/intelligence.js';
import { createContentFetchRouter } from './routes/contentFetch.js';
import { createBrandMemoryRouter } from './routes/brandMemory.js';
import paymentsRouter, { stripeWebhookHandler } from './routes/payments.js';
import emailRouter from './routes/email.js';
import referralRouter from './routes/referral.js';
import teamsRouter from './routes/teams.js';
import evergreenRouter from './routes/evergreen.js';

const NOT_FOUND_ENDPOINTS = [
  'GET /health',
  'POST /api/generate-content',
  'POST /api/generate-content-stream',
  'POST /api/generate-json',
  'POST /api/generate-images',
  'POST /api/generate-video-story',
  'POST /api/optimize-multi-platform',
  'POST /api/score-content',
  'POST /api/benchmark-content',
  'POST /api/content/fetch-url',
  'POST /api/brand-memory/retrieve',
  'POST /api/brand-memory/ingest',
  'GET /api/social/comments',
  'POST /api/intelligence/news',
  'POST /api/intelligence/trends',
  'POST /api/intelligence/competitor',
  'POST /api/intelligence/schedule-gaps',
  'GET /api/social/best-times',
  'POST /api/social/post-mortem',
  'GET /api/costs/user/:userId',
  'GET /api/costs/daily',
  'GET /api/costs/top-spenders',
  'GET /api/rate-limit-status',
  'GET /api/payments/pricing',
  'POST /api/payments/checkout/subscription',
  'POST /api/payments/checkout/trial',
  'POST /api/payments/portal',
  'GET /api/payments/rollover-history',
  'GET /api/email/status',
  'POST /api/email/welcome',
  'POST /api/email/low-credits',
  'POST /api/email/credits-exhausted',
  'POST /api/email/reengagement',
  'POST /api/email/upgrade-nudge',
  'POST /api/email/trial-started',
  'POST /api/email/unsubscribe',
  'POST /api/email/abandoned-checkout',
  'GET /api/email/preferences',
  'GET /api/referral',
  'POST /api/referral/apply',
  'GET /api/teams',
  'POST /api/teams',
  'POST /api/teams/invite',
  'POST /api/teams/invites/accept',
];

export function createApp(): express.Application {
  const app = express();

  app.set('trust proxy', 1);
  applyCors(app);

  // Stripe webhook wymaga surowego body — przed express.json()
  app.post(
    '/api/payments/webhook',
    express.raw({ type: 'application/json' }),
    stripeWebhookHandler
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(generalLimiter);

  app.get('/', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Generator Postów AI Backend API',
      version: '1.0.0',
      health: '/health',
    });
  });

  app.use(createHealthRouter());
  app.use('/api/payments', checkPublicEndpointRateLimit('publicApi'), paymentsRouter);
  app.use('/api/templates', checkPublicEndpointRateLimit('publicApi'), createTemplatesRouter());
  app.use(checkPublicEndpointRateLimit('publicApi'), createSocialRouter());
  app.use(checkPublicEndpointRateLimit('publicApi'), createBrandVoiceRouter());
  app.use(createGenerationRouter());
  app.use('/api/costs', checkPublicEndpointRateLimit('publicApi'), createCostsRouter());
  app.use(checkPublicEndpointRateLimit('publicApi'), createScoringRouter());
  app.use(checkPublicEndpointRateLimit('publicApi'), createIntelligenceRouter());
  app.use(checkPublicEndpointRateLimit('publicApi'), createVideoRouter());
  app.use(checkPublicEndpointRateLimit('publicApi'), createMiscRouter());
  app.use(checkPublicEndpointRateLimit('publicApi'), createContentFetchRouter());
  app.use(checkPublicEndpointRateLimit('publicApi'), createBrandMemoryRouter());
  app.use('/api/email', checkPublicEndpointRateLimit('publicApi'), emailRouter);
  app.use('/api/referral', checkPublicEndpointRateLimit('publicApi'), referralRouter);
  app.use('/api/teams', checkPublicEndpointRateLimit('publicApi'), teamsRouter);
  app.use('/api/evergreen', checkPublicEndpointRateLimit('publicApi'), evergreenRouter);

  app.use(errorHandler);

  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.originalUrl} does not exist`,
      availableEndpoints: NOT_FOUND_ENDPOINTS,
    });
  });

  return app;
}
