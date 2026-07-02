import crypto from 'crypto';

const TTL_MS = 15 * 60 * 1000;

function stateSecret(): string {
  return (
    process.env.OAUTH_STATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.STRIPE_SECRET_KEY ||
    'dev-oauth-state-insecure'
  );
}

/** Podpisany state OAuth (userId + timestamp) — bezpieczniejszy niż surowy UUID w URL. */
export function signOAuthState(userId: string): string {
  const ts = String(Date.now());
  const payload = `${userId}.${ts}`;
  const sig = crypto.createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export function verifyOAuthState(state: string): string | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const parts = decoded.split('.');
    if (parts.length !== 3) return null;
    const [userId, ts, sig] = parts;
    if (!userId || !ts || !sig) return null;

    const payload = `${userId}.${ts}`;
    const expected = crypto.createHmac('sha256', stateSecret()).update(payload).digest('base64url');
    if (sig !== expected) return null;

    const age = Date.now() - Number(ts);
    if (!Number.isFinite(age) || age < 0 || age > TTL_MS) return null;

    return userId;
  } catch {
    return null;
  }
}
