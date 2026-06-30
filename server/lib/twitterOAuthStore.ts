const TWITTER_OAUTH_TTL_MS = 10 * 60 * 1000;

const twitterOAuthSecrets = new Map<string, { secret: string; expiresAt: number }>();

export function storeTwitterOAuthSecret(oauthToken: string, secret: string): void {
  twitterOAuthSecrets.set(oauthToken, {
    secret,
    expiresAt: Date.now() + TWITTER_OAUTH_TTL_MS,
  });
}

export function consumeTwitterOAuthSecret(oauthToken: string): string | null {
  const stored = twitterOAuthSecrets.get(oauthToken);
  if (!stored || Date.now() > stored.expiresAt) {
    twitterOAuthSecrets.delete(oauthToken);
    return null;
  }
  twitterOAuthSecrets.delete(oauthToken);
  return stored.secret;
}

export function startTwitterOAuthCleanup(): void {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of twitterOAuthSecrets.entries()) {
      if (now > val.expiresAt) twitterOAuthSecrets.delete(key);
    }
  }, TWITTER_OAUTH_TTL_MS);
}
