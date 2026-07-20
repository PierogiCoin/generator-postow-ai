import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../server/config/env.js', () => ({
  loadEnv: () => ({
    ALLOWED_ORIGINS: 'https://app.example.com',
    GOOGLE_API_KEY: 'x',
    SUPABASE_SERVICE_KEY: 'x',
    SUPABASE_URL: 'https://x.supabase.co',
    PORT: 3001,
  }),
}));

import { getCorsOptions } from '../server/config/cors';

function checkOrigin(
  origin: string | undefined,
  nodeEnv: string
): Promise<{ err: Error | null; allowed: boolean | undefined }> {
  process.env.NODE_ENV = nodeEnv;
  const options = getCorsOptions();
  const originFn = options.origin;
  if (typeof originFn !== 'function') {
    throw new Error('expected function origin');
  }
  return new Promise((resolve) => {
    originFn(origin ?? '', (err, allowed) => {
      resolve({ err: err as Error | null, allowed: allowed as boolean | undefined });
    });
  });
}

describe('getCorsOptions', () => {
  const prev = process.env.NODE_ENV;

  afterEach(() => {
    if (prev === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prev;
  });

  it('pozwala na allowlistę w production', async () => {
    const r = await checkOrigin('https://app.example.com', 'production');
    expect(r.err).toBeNull();
    expect(r.allowed).toBe(true);
  });

  it('odrzuca obce origin w production', async () => {
    const r = await checkOrigin('https://evil.example.com', 'production');
    expect(r.err).toBeTruthy();
    expect(r.allowed).toBe(false);
  });

  it('odrzuca LAN w production', async () => {
    const r = await checkOrigin('http://192.168.1.10:3000', 'production');
    expect(r.err).toBeTruthy();
    expect(r.allowed).toBe(false);
  });

  it('pozwala na LAN w development', async () => {
    const r = await checkOrigin('http://192.168.1.10:3000', 'development');
    expect(r.err).toBeNull();
    expect(r.allowed).toBe(true);
  });

  it('pozwala na request bez Origin', async () => {
    const r = await checkOrigin(undefined, 'production');
    expect(r.err).toBeNull();
    expect(r.allowed).toBe(true);
  });
});
