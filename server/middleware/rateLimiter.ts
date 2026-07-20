import rateLimit, { ipKeyGenerator, RateLimitExceededEventHandler } from 'express-rate-limit';
import type { Request } from 'express';
import { logRateLimit } from '../logger.js';

/**
 * Klucz limitu: zweryfikowany user z JWT (req.user) albo IP.
 * Nigdy nie ufamy nagłówkom klienta (x-user-id / x-user-tier).
 */
const rateLimitKeyGenerator = (req: Request): string => {
  const userId = req.user?.id;
  if (userId) return `user:${userId}`;
  return ipKeyGenerator(req.ip ?? '0.0.0.0');
};

const rateLimitHandler: RateLimitExceededEventHandler = (req, res, _next, options) => {
  logRateLimit(req.path, req.ip || 'unknown', req.user?.id);
  res.status(options.statusCode || 429).json({ message: options.message || 'Too many requests' });
};

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: rateLimitKeyGenerator,
});

export const expensiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Generation limit reached. Please wait before creating more content.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: rateLimitKeyGenerator,
  // Tier z nagłówka klienta był spoofowalny — limit dotyczy wszystkich;
  // dostęp premium kontroluje creditGate + plan w DB.
});

export const textLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
  message: 'Too many text generation requests. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: rateLimitKeyGenerator,
});

export const streamLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: 'Too many streaming requests. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  keyGenerator: rateLimitKeyGenerator,
});
