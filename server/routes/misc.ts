import { Router } from 'express';

export function createMiscRouter(): Router {
  const router = Router();
router.get('/api/rate-limit-status', (req, res) => {
  const userId = req.header('x-user-id') || req.ip || 'anonymous';

  const rateLimitInfo = {
    userId: userId,
    limits: {
      general: {
        window: '15 minutes',
        max: 100,
        description: 'All API endpoints'
      },
      text: {
        window: '5 minutes',
        max: 50,
        description: 'Text generation endpoints'
      },
      expensive: {
        window: '1 hour',
        max: 20,
        description: 'Image and video generation'
      }
    },
    note: 'Rate limit headers are included in each API response'
  };

  res.json(rateLimitInfo);
});

  return router;
}
