import express from 'express';
import { applyCors } from './config/cors.js';
import { generalLimiter } from './middleware/rateLimiter.js';
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
import paymentsRouter, { stripeWebhookHandler } from './routes/payments.js';
import emailRouter from './routes/email.js';
import referralRouter from './routes/referral.js';
import teamsRouter from './routes/teams.js';

const NOT_FOUND_ENDPOINTS = [
  'GET /health',
  'POST /api/generate-content',
  'POST /api/generate-content-stream',
  'POST /api/generate-images',
  'POST /api/generate-video-story',
  'POST /api/optimize-multi-platform',
  'POST /api/score-content',
  'POST /api/benchmark-content',
  'POST /api/content/fetch-url',
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

  app.use(express.json({ limit: '50mb' }));
  app.use(generalLimiter);

  app.use(createHealthRouter());
  app.use('/api/payments', paymentsRouter);
  app.use('/api/templates', createTemplatesRouter());
  app.use(createSocialRouter());
  app.use(createBrandVoiceRouter());
  app.use(createGenerationRouter());
  app.use('/api/costs', createCostsRouter());
  app.use(createScoringRouter());
  app.use(createIntelligenceRouter());
  app.use(createVideoRouter());
  app.use(createMiscRouter());
  app.use(createContentFetchRouter());
  app.use('/api/email', emailRouter);
  app.use('/api/referral', referralRouter);
  app.use('/api/teams', teamsRouter);

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
