import { z } from 'zod';
import logger from '../logger';

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
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  })
  .passthrough()
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
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  [key: string]: string | number | undefined;
};

let cachedEnv: Env | null = null;

export function loadEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => i.message).join('; ');
    logger.warn(`Invalid environment configuration (using mocks): ${details}`);
  }

  const data: any = parsed.success ? parsed.data : {};

  const googleApiKey = data.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
  if (!googleApiKey) {
    logger.warn('Brak GOOGLE_API_KEY w .env - używam mocka do builda');
  }

  const supabaseServiceKey = data.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseServiceKey) {
    logger.warn('Brak konfiguracji Supabase w .env (SUPABASE_SERVICE_KEY) - używam mocka');
  }

  const supabaseUrl = data.SUPABASE_URL || data.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    logger.warn('Brak konfiguracji Supabase w .env - używam mocka');
  }

  cachedEnv = {
    ...data,
    GOOGLE_API_KEY: googleApiKey || 'mock-google-api-key',
    SUPABASE_SERVICE_KEY: supabaseServiceKey || 'mock-supabase-service-key',
    SUPABASE_URL: supabaseUrl || 'https://mock-url.supabase.co',
  } as Env;

  return cachedEnv;
}
