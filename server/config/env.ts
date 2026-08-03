import dotenv from 'dotenv';
import { z } from 'zod';
import logger from '../logger.js';

dotenv.config();

const envSchema = z
  .object({
    GOOGLE_API_KEY: z.string().min(1).optional(),
    TOGETHER_API_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_KEY: z.string().min(1).optional(),
    SUPABASE_URL: z.string().min(1).optional(),
    VITE_SUPABASE_URL: z.string().min(1).optional(),
    PORT: z.coerce.number().default(3001),
    NODE_ENV: z.string().optional(),
    ALLOWED_ORIGINS: z.string().optional(),
    LUMA_API_KEY: z.string().optional(),
    REPLICATE_API_TOKEN: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    EMAIL_FROM_NAME: z.string().optional(),
    FRONTEND_URL: z.string().optional(),
    PUBLIC_BACKEND_URL: z.string().optional(),
    OAUTH_STATE_SECRET: z.string().optional(),
    CRON_SECRET: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    DISABLE_CREDIT_LIMITS: z.string().optional(),
  })
  .refine((data) => Boolean(data.SUPABASE_URL || data.VITE_SUPABASE_URL), {
    message: 'SUPABASE_URL or VITE_SUPABASE_URL is required',
  });

export type Env = {
  GOOGLE_API_KEY: string;
  TOGETHER_API_KEY?: string;
  SUPABASE_SERVICE_KEY: string;
  SUPABASE_URL: string;
  PORT: number;
  NODE_ENV?: string;
  ALLOWED_ORIGINS?: string;
  LUMA_API_KEY?: string;
  REPLICATE_API_TOKEN?: string;
  VITE_SUPABASE_URL?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_FROM_NAME?: string;
  FRONTEND_URL?: string;
  PUBLIC_BACKEND_URL?: string;
  OAUTH_STATE_SECRET?: string;
  CRON_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
};

let cachedEnv: Env | null = null;

/** Clear cache — tests only. */
export function resetEnvCache(): void {
  cachedEnv = null;
}

export function loadEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => i.message).join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const googleApiKey = parsed.data.GOOGLE_API_KEY;
  if (!googleApiKey) {
    logger.error('❌ BŁĄD: Brak GOOGLE_API_KEY w pliku .env!');
    throw new Error('Brak GOOGLE_API_KEY w .env');
  }

  const supabaseServiceKey = parsed.data.SUPABASE_SERVICE_KEY;
  if (!supabaseServiceKey) {
    throw new Error('Brak konfiguracji Supabase w .env (SUPABASE_SERVICE_KEY)');
  }

  const supabaseUrl = parsed.data.SUPABASE_URL || parsed.data.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Brak konfiguracji Supabase w .env');
  }

  const isProd = parsed.data.NODE_ENV === 'production';

  if (isProd) {
    if (parsed.data.DISABLE_CREDIT_LIMITS === 'true') {
      throw new Error(
        'DISABLE_CREDIT_LIMITS=true jest zabronione w production — usuń tę zmienną'
      );
    }
    if (!parsed.data.ALLOWED_ORIGINS?.trim()) {
      throw new Error('ALLOWED_ORIGINS jest wymagany w production');
    }
    if (!parsed.data.OAUTH_STATE_SECRET?.trim()) {
      throw new Error('OAUTH_STATE_SECRET jest wymagany w production');
    }
    if (!parsed.data.CRON_SECRET?.trim()) {
      throw new Error('CRON_SECRET jest wymagany w production');
    }
    if (parsed.data.STRIPE_SECRET_KEY && !parsed.data.STRIPE_WEBHOOK_SECRET) {
      throw new Error(
        'STRIPE_WEBHOOK_SECRET jest wymagany w production gdy STRIPE_SECRET_KEY jest ustawiony'
      );
    }
  }

  cachedEnv = {
    ...parsed.data,
    GOOGLE_API_KEY: googleApiKey,
    SUPABASE_SERVICE_KEY: supabaseServiceKey,
    SUPABASE_URL: supabaseUrl,
  };

  return cachedEnv;
}
