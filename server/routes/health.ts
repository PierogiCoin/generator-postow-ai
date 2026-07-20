import { Router } from 'express';

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

  return router;
}
