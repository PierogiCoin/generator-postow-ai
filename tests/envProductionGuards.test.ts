import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('loadEnv production hardening (P1)', () => {
  const prev: Record<string, string | undefined> = {};

  function snap(keys: string[]) {
    for (const k of keys) prev[k] = process.env[k];
  }

  function restore() {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
      process.env.SUPABASE_URL = 'https://example.supabase.co';
    }
    if (!process.env.SUPABASE_SERVICE_KEY) {
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
      'ALLOWED_ORIGINS',
    ]);
    process.env.GOOGLE_API_KEY = 'test-google';
    process.env.SUPABASE_SERVICE_KEY = 'test-service';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
  });

  afterEach(() => {
    restore();
    vi.resetModules();
  });

  it('wymaga ALLOWED_ORIGINS, OAUTH_STATE_SECRET, CRON_SECRET w production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.OAUTH_STATE_SECRET;
    delete process.env.CRON_SECRET;

    const { loadEnv, resetEnvCache } = await import('../server/config/env');
    resetEnvCache();
    expect(() => loadEnv()).toThrow(/ALLOWED_ORIGINS|OAUTH_STATE_SECRET|CRON_SECRET/);
  });

  it('przechodzi w production z wymaganymi sekretami', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_ORIGINS = 'https://app.example.com';
    process.env.OAUTH_STATE_SECRET = 'oauth-secret-min-16';
    process.env.CRON_SECRET = 'cron-secret';
    delete process.env.STRIPE_SECRET_KEY;

    const { loadEnv, resetEnvCache } = await import('../server/config/env');
    resetEnvCache();
    const env = loadEnv();
    expect(env.OAUTH_STATE_SECRET).toBe('oauth-secret-min-16');
    expect(env.CRON_SECRET).toBe('cron-secret');
  });

  it('odrzuca DISABLE_CREDIT_LIMITS w production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_ORIGINS = 'https://app.example.com';
    process.env.OAUTH_STATE_SECRET = 'oauth-secret';
    process.env.CRON_SECRET = 'cron';
    process.env.DISABLE_CREDIT_LIMITS = 'true';

    const { loadEnv, resetEnvCache } = await import('../server/config/env');
    resetEnvCache();
    expect(() => loadEnv()).toThrow(/DISABLE_CREDIT_LIMITS/);
  });
});
