import { afterEach, describe, expect, it } from 'vitest';
import { signOAuthState, verifyOAuthState } from '../server/lib/oauthState';

describe('oauthState', () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevSecret = process.env.OAUTH_STATE_SECRET;

  afterEach(() => {
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    if (prevSecret === undefined) delete process.env.OAUTH_STATE_SECRET;
    else process.env.OAUTH_STATE_SECRET = prevSecret;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('round-trips user id through signed state', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.OAUTH_STATE_SECRET;
    const userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const state = signOAuthState(userId);
    expect(verifyOAuthState(state)).toBe(userId);
  });

  it('rejects tampered state', () => {
    process.env.NODE_ENV = 'development';
    const state = signOAuthState('user-1');
    const tampered = state.slice(0, -4) + 'xxxx';
    expect(verifyOAuthState(tampered)).toBeNull();
  });

  it('rejects raw uuid without signature', () => {
    expect(verifyOAuthState('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBeNull();
  });

  it('throws in production without a real secret', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.OAUTH_STATE_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    expect(() => signOAuthState('user-1')).toThrow(/OAUTH_STATE_SECRET/);
  });
});
