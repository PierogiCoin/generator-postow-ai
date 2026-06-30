import { Router } from 'express';
import { apiKey, openai, luma, replicate, supabase, costTracker } from '../lib/clients.js';
import { resolveFrontendUrl, resolvePublicBackendUrl } from '../lib/publicUrl.js';
import { facebookConfig, linkedInConfig, tiktokConfig, twitterConfig } from '../config/social.js';

export function createHealthRouter(): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    const publicBackend = resolvePublicBackendUrl();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      deploy: {
        publicBackendUrl: publicBackend,
        frontendUrl: resolveFrontendUrl(),
        oauthCallbacks: {
          linkedin: linkedInConfig.redirectUri,
          twitter: twitterConfig.callbackUrl,
          facebook: facebookConfig.redirectUri,
          tiktok: tiktokConfig.redirectUri,
        },
        oauthConfigured: {
          linkedin: Boolean(linkedInConfig.clientId && linkedInConfig.clientSecret),
          twitter: Boolean(twitterConfig.appKey && twitterConfig.appSecret),
          facebook: Boolean(facebookConfig.appId && facebookConfig.appSecret),
          tiktok: Boolean(tiktokConfig.clientKey && tiktokConfig.clientSecret),
        },
      },
      apis: {
        gemini: !!apiKey,
        openai: !!openai,
        luma: !!luma,
        replicate: !!replicate,
        supabase: !!supabase,
        costTracker: !!costTracker,
      },
    });
  });

  router.get('/api/trends', (_req, res) => {
    res.json({ trends: [] });
  });

  return router;
}
