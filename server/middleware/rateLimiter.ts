import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

const LIMITS: Record<string, RateLimitConfig> = {
  '/api/generate': { windowMs: 60000, maxRequests: 10 },
  '/api/social/publish': { windowMs: 60000, maxRequests: 20 },
  'default': { windowMs: 60000, maxRequests: 60 }
};

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const key = (req.headers['x-user-id'] || req.ip) as string;
  const endpoint = req.path;
  const config = LIMITS[endpoint] || LIMITS['default'];
  
  const now = Date.now();
  const record = requestCounts.get(key);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + config.windowMs });
    return next();
  }
  
  if (record.count >= config.maxRequests) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  
  record.count++;
  next();
};
