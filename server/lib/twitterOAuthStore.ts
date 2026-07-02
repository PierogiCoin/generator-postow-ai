const TWITTER_OAUTH_TTL_MS = 10 * 60 * 1000;

type TwitterOAuthEntry = {
  secret: string;
  userId: string;
  expiresAt: number;
};

const twitterOAuthSecrets = new Map<string, TwitterOAuthEntry>();

export function storeTwitterOAuthSecret(oauthToken: string, secret: string, userId: string): void {
  twitterOAuthSecrets.set(oauthToken, {
    secret,
    userId,
    expiresAt: Date.now() + TWITTER_OAUTH_TTL_MS,
  });
}

export function consumeTwitterOAuthSecret(oauthToken: string): string | null {
  const ctx = consumeTwitterOAuthContext(oauthToken);
  return ctx?.secret ?? null;
}

export function consumeTwitterOAuthContext(
  oauthToken: string
): { secret: string; userId: string } | null {
  const stored = twitterOAuthSecrets.get(oauthToken);
  if (!stored || Date.now() > stored.expiresAt) {
    twitterOAuthSecrets.delete(oauthToken);
    return null;
  }
  twitterOAuthSecrets.delete(oauthToken);
  return { secret: stored.secret, userId: stored.userId };
}

export function startTwitterOAuthCleanup(): void {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of twitterOAuthSecrets.entries()) {
      if (now > val.expiresAt) twitterOAuthSecrets.delete(key);
    }
  }, TWITTER_OAUTH_TTL_MS);
}
