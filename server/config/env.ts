import dotenv from 'dotenv';
import { z } from 'zod';
import logger from '../logger.js';

dotenv.config();

const envSchema = z
  .object({
    GOOGLE_API_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_KEY: z.string().min(1).optional(),
    SUPABASE_URL: z.string().min(1).optional(),
    VITE_SUPABASE_URL: z.string().min(1).optional(),
    PORT: z.coerce.number().default(3001),
    NODE_ENV: z.string().optional(),
    ALLOWED_ORIGINS: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    LUMA_API_KEY: z.string().optional(),
    REPLICATE_API_TOKEN: z.string().optional(),
  })
  .refine((data) => Boolean(data.SUPABASE_URL || data.VITE_SUPABASE_URL), {
    message: 'SUPABASE_URL or VITE_SUPABASE_URL is required',
  });

export type Env = {
  GOOGLE_API_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  SUPABASE_URL: string;
  PORT: number;
  NODE_ENV?: string;
  ALLOWED_ORIGINS?: string;
  OPENAI_API_KEY?: string;
  LUMA_API_KEY?: string;
  REPLICATE_API_TOKEN?: string;
  VITE_SUPABASE_URL?: string;
};

let cachedEnv: Env | null = null;

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
    process.exit(1);
  }

  const supabaseServiceKey = parsed.data.SUPABASE_SERVICE_KEY;
  if (!supabaseServiceKey) {
    throw new Error('Brak konfiguracji Supabase w .env (SUPABASE_SERVICE_KEY)');
  }

  const supabaseUrl = parsed.data.SUPABASE_URL || parsed.data.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Brak konfiguracji Supabase w .env');
  }

  cachedEnv = {
    ...parsed.data,
    GOOGLE_API_KEY: googleApiKey,
    SUPABASE_SERVICE_KEY: supabaseServiceKey,
    SUPABASE_URL: supabaseUrl,
  };

  return cachedEnv;
}
