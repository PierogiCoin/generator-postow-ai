import rateLimit, { ipKeyGenerator, RateLimitExceededEventHandler } from 'express-rate-limit';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { logRateLimit } from '../logger.js';
import { loadEnv } from '../config/env.js';

const env = loadEnv();
const hasUpstash = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

let upstashRedis: Redis | null = null;
if (hasUpstash) {
  upstashRedis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL!,
    token: env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

const rateLimitKeyGenerator = (req: Request): string => {
  const userId = req.user?.id;
  if (userId) return `user:${userId}`;
  return ipKeyGenerator(req.ip ?? '0.0.0.0');
};

const rateLimitHandler: RateLimitExceededEventHandler = (req, res, _next, options) => {
  logRateLimit(req.path, req.ip || 'unknown', req.user?.id);
  res.status(options.statusCode || 429).json({ message: options.message || 'Too many requests' });
};

function createAdaptiveLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
  prefix: string;
}): RequestHandler {
  const fallbackLimiter = rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
    keyGenerator: rateLimitKeyGenerator,
  });

  if (!upstashRedis) {
    return fallbackLimiter;
  }

  const windowSeconds = Math.ceil(options.windowMs / 1000);
  const upstashRatelimit = new Ratelimit({
    redis: upstashRedis,
    limiter: Ratelimit.slidingWindow(options.max, `${windowSeconds} s`),
    prefix: `@upstash/ratelimit/${options.prefix}`,
    analytics: true,
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identifier = rateLimitKeyGenerator(req);
      const { success, limit, remaining, reset } = await upstashRatelimit.limit(identifier);

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', reset);

      if (!success) {
        logRateLimit(req.path, req.ip || 'unknown', req.user?.id);
        res.status(429).json({ message: options.message });
        return;
      }

      next();
    } catch {
      // Fallback do in-memory w razie awarii połączenia Upstash
      fallbackLimiter(req, res, next);
    }
  };
}

export const generalLimiter = createAdaptiveLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  prefix: 'general',
});

export const expensiveLimiter = createAdaptiveLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Generation limit reached. Please wait before creating more content.',
  prefix: 'expensive',
});

export const textLimiter = createAdaptiveLimiter({
  windowMs: 5 * 60 * 1000,
  max: 50,
  message: 'Too many text generation requests. Please slow down.',
  prefix: 'text',
});

export const streamLimiter = createAdaptiveLimiter({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: 'Too many streaming requests. Please slow down.',
  prefix: 'stream',
});

