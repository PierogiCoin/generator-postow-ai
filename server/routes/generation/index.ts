import { Router } from 'express';
import { createTextGenerationRouter } from './textRoutes.js';
import { createImageGenerationRouter } from './imageRoutes.js';
import { createVideoStoryRouter } from './videoStoryRoutes.js';

/** Agreguje trasy generacji tekstu / obrazu / wideo. */
export function createGenerationRouter(): Router {
  const router = Router();
  router.use(createTextGenerationRouter());
  router.use(createImageGenerationRouter());
  router.use(createVideoStoryRouter());
  return router;
}
