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
