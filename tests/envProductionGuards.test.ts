import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('loadEnv production credit/stripe guards', () => {
  const prev: Record<string, string | undefined> = {};

  function snap(keys: string[]) {
    for (const k of keys) prev[k] = process.env[k];
  }

  function restore() {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    // Nie zostawiaj procesu bez Supabase — inne suite'y importują server/supabase.ts
    if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
      process.env.SUPABASE_URL = 'https://example.supabase.co';
    }
    if (
      !process.env.SUPABASE_SERVICE_KEY &&
      !process.env.SUPABASE_ANON_KEY &&
      !process.env.VITE_SUPABASE_ANON_KEY
    ) {
      process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
    }
  }

  beforeEach(() => {
    vi.resetModules();
    snap([
      'NODE_ENV',
      'DISABLE_CREDIT_LIMITS',
      'GOOGLE_API_KEY',
      'SUPABASE_SERVICE_KEY',
      'SUPABASE_URL',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'OAUTH_STATE_SECRET',
      'CRON_SECRET',
    ]);
    process.env.GOOGLE_API_KEY = 'test-google';
    process.env.SUPABASE_SERVICE_KEY = 'test-service';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
  });

  afterEach(() => {
    restore();
    vi.resetModules();
  });

  it('rzuca gdy DISABLE_CREDIT_LIMITS=true w production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DISABLE_CREDIT_LIMITS = 'true';

    const { loadEnv } = await import('../server/config/env');
    expect(() => loadEnv()).toThrow(/DISABLE_CREDIT_LIMITS/);
  });

  it('rzuca gdy STRIPE_SECRET_KEY bez WEBHOOK_SECRET w production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DISABLE_CREDIT_LIMITS;
    process.env.STRIPE_SECRET_KEY = 'sk_live_x';
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const { loadEnv } = await import('../server/config/env');
    expect(() => loadEnv()).toThrow(/STRIPE_WEBHOOK_SECRET/);
  });
});
