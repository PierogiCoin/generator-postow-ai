import { Router } from 'express';
import axios from 'axios';
import logger from '../logger.js';
import { expensiveLimiter } from '../middleware/rateLimiter.js';

const VEO_MODEL = 'veo-3.1-fast-generate-preview';

export function createVideoRouter(): Router {
  const router = Router();

  // Veo używa operacji długotrwałych (LRO) — właściwy endpoint to :predictLongRunning, nie :predict
  router.post('/api/generate-videos', expensiveLimiter, async (req, res) => {
    try {
      const { prompt, image, config } = req.body;
      const currentApiKey = process.env.GOOGLE_API_KEY || process.env.VITE_API_KEY;

      if (!currentApiKey) {
        return res.status(503).json({ message: 'Google API key not configured' });
      }

      const instance: Record<string, unknown> = { prompt };
      if (image?.imageBytes) {
        instance.image = { bytesBase64Encoded: image.imageBytes, mimeType: image.mimeType };
      }

      const parameters: Record<string, unknown> = {};
      if (config?.aspectRatio) parameters.aspectRatio = config.aspectRatio;

      const response = await axios
        .post(
          `https://generativelanguage.googleapis.com/v1beta/models/${VEO_MODEL}:predictLongRunning?key=${currentApiKey}`,
          { instances: [instance], parameters },
          { headers: { 'Content-Type': 'application/json' } }
        )
        .catch((e) => {
          throw new Error(e.response?.data?.error?.message || e.message);
        });

      res.json(response.data);
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('[Veo] Video generation failed:', { error: err.message });
      res.status(500).json({ message: err.message });
    }
  });

  router.post('/api/get-videos-operation', async (req, res) => {
    try {
      const { operation } = req.body;
      const currentApiKey = process.env.GOOGLE_API_KEY || process.env.VITE_API_KEY;

      if (!currentApiKey) return res.status(503).json({ message: 'Google API key not configured' });
      if (!operation?.name) return res.status(400).json({ message: 'operation.name is required' });

      const response = await axios
        .get(`https://generativelanguage.googleapis.com/v1beta/${operation.name}?key=${currentApiKey}`)
        .catch((e) => {
          throw new Error(e.response?.data?.error?.message || e.message);
        });

      res.json(response.data);
    } catch (error: unknown) {
      const err = error as Error;
      res.status(500).json({ message: err.message });
    }
  });

  return router;
}
