import { describe, expect, it } from 'vitest';
import { signOAuthState, verifyOAuthState } from '../server/lib/oauthState';

describe('oauthState', () => {
  it('round-trips user id through signed state', () => {
    const userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const state = signOAuthState(userId);
    expect(verifyOAuthState(state)).toBe(userId);
  });

  it('rejects tampered state', () => {
    const state = signOAuthState('user-1');
    const tampered = state.slice(0, -4) + 'xxxx';
    expect(verifyOAuthState(tampered)).toBeNull();
  });

  it('rejects raw uuid without signature', () => {
    expect(verifyOAuthState('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBeNull();
  });
});
