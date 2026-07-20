import cors from 'cors';
import type { Application, Request, Response, NextFunction } from 'express';
import { loadEnv } from './env.js';

function isDev(): boolean {
  return (process.env.NODE_ENV || 'development') !== 'production';
}

export function getCorsOptions(): cors.CorsOptions {
  const env = loadEnv();
  const allowedOriginsEnv = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    origin: (origin, callback) => {
      // Brak Origin = klient nie-przeglądarkowy (curl, webhooki, mobile) — CORS tego nie dotyczy
      if (!origin) return callback(null, true);

      try {
        if (allowedOriginsEnv.includes(origin)) return callback(null, true);

        const u = new URL(origin);
        const host = u.hostname;
        const isLocalhost = host === 'localhost' || host === '127.0.0.1';
        const isLocalNetworkIP = /^192\.168\.\d+\.\d+$/.test(host);

        // localhost / LAN tylko w development — na prod wyłącznie ALLOWED_ORIGINS
        if (isDev() && (isLocalhost || isLocalNetworkIP)) {
          return callback(null, true);
        }

        return callback(new Error(`Not allowed by CORS: ${origin}`), false);
      } catch {
        return callback(new Error(`Invalid origin URL: ${origin}`), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-user-id', 'Authorization', 'x-cron-key'],
  };
}

export function applyCors(app: Application): void {
  const corsOptions = getCorsOptions();
  app.use(cors(corsOptions));
  app.options(/.*/, cors(corsOptions));

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'OPTIONS' && req.header('Origin')) {
      res.header('Access-Control-Allow-Credentials', 'true');
      return res.status(204).end();
    }
    next();
  });
}
