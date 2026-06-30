/**
 * Publiczny URL backendu — używany do OAuth redirect URI i CORS.
 * Kolejność: jawne env → Railway/Render auto-detect.
 */
export function resolvePublicBackendUrl(): string | null {
  const candidates = [
    process.env.PUBLIC_BACKEND_URL,
    process.env.BACKEND_URL,
    process.env.RAILWAY_STATIC_URL,
    process.env.RENDER_EXTERNAL_URL,
  ];

  for (const raw of candidates) {
    const url = raw?.trim().replace(/\/$/, '');
    if (url && /^https?:\/\//.test(url)) return url;
  }

  return null;
}

export function resolveOAuthCallbackUrl(platform: string): string {
  const explicit = {
    linkedin: process.env.LINKEDIN_REDIRECT_URI,
    twitter: process.env.TWITTER_CALLBACK_URL,
    facebook: process.env.FACEBOOK_REDIRECT_URI,
    tiktok: process.env.TIKTOK_REDIRECT_URI,
  }[platform as keyof typeof explicit];

  if (explicit?.trim()) return explicit.trim();

  const base = resolvePublicBackendUrl();
  if (base) return `${base}/api/social/callback/${platform}`;

  return `http://localhost:3001/api/social/callback/${platform}`;
}

export function resolveFrontendUrl(): string {
  const url = process.env.FRONTEND_URL?.trim().replace(/\/$/, '');
  if (url) return url;
  return 'http://localhost:5173';
}
