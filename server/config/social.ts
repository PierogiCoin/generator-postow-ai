import { resolveOAuthCallbackUrl } from '../lib/publicUrl.js';

export const linkedInConfig = {
  clientId: process.env.LINKEDIN_CLIENT_ID || '',
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
  redirectUri: resolveOAuthCallbackUrl('linkedin'),
};

export const twitterConfig = {
  appKey: process.env.TWITTER_APP_KEY || '',
  appSecret: process.env.TWITTER_APP_SECRET || '',
  callbackUrl: resolveOAuthCallbackUrl('twitter'),
};

export const facebookConfig = {
  appId: process.env.FACEBOOK_APP_ID || '',
  appSecret: process.env.FACEBOOK_APP_SECRET || '',
  redirectUri: resolveOAuthCallbackUrl('facebook'),
};

export const tiktokConfig = {
  clientKey: process.env.TIKTOK_CLIENT_KEY || '',
  clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
  redirectUri: resolveOAuthCallbackUrl('tiktok'),
};

/** Google OAuth for YouTube upload (osobne od GEMINI GOOGLE_API_KEY). */
export const youtubeConfig = {
  clientId: process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || '',
  clientSecret: process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
  redirectUri: resolveOAuthCallbackUrl('youtube'),
};

/** Threads API — zwykle ten sam Meta app co Facebook/Instagram. */
export const threadsConfig = {
  appId: process.env.THREADS_APP_ID || process.env.FACEBOOK_APP_ID || '',
  appSecret: process.env.THREADS_APP_SECRET || process.env.FACEBOOK_APP_SECRET || '',
  redirectUri: resolveOAuthCallbackUrl('threads'),
};
