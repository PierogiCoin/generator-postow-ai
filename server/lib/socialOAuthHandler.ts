import logger from '../logger.js';
import { supabase } from '../lib/clients.js';
import {
  LinkedInPublisher,
  TwitterPublisher,
  FacebookPublisher,
  InstagramPublisher,
  TikTokPublisher,
  YouTubePublisher,
  ThreadsPublisher,
} from '../socialPublishing.js';
import {
  linkedInConfig,
  twitterConfig,
  facebookConfig,
  tiktokConfig,
  youtubeConfig,
  threadsConfig,
} from '../config/social.js';
import { consumeTwitterOAuthContext } from '../lib/twitterOAuthStore.js';
import { verifyOAuthState } from '../lib/oauthState.js';
import { resolveFrontendUrl, resolveOAuthCallbackUrl } from '../lib/publicUrl.js';

export type OAuthCallbackParams = {
  code?: string;
  state?: string;
  oauth_token?: string;
  oauth_verifier?: string;
};

export function resolveOAuthUserId(
  platform: string,
  params: OAuthCallbackParams,
  twitterCtx?: { userId: string; secret: string } | null
): string | null {
  if (params.state) {
    const verified = verifyOAuthState(params.state);
    if (verified) return verified;
  }

  if (platform === 'twitter' && twitterCtx) {
    return twitterCtx.userId;
  }

  return null;
}

async function upsertConnection(
  userId: string,
  platform: string,
  connectionData: Record<string, unknown>
): Promise<void> {
  const {
    avatar_url,
    expires_in,
    expires_at: connectionExpiresAt,
    ...rest
  } = connectionData as {
    avatar_url?: string;
    expires_in?: number;
    expires_at?: string | null;
    profile_image_url?: string;
    account_id?: string;
    [key: string]: unknown;
  };

  if (!rest.account_id) {
    throw new Error(`Brak account_id dla platformy ${platform}`);
  }

  const row = {
    user_id: userId,
    platform,
    ...rest,
    profile_image_url: avatar_url ?? connectionData.profile_image_url ?? null,
    expires_at:
      connectionExpiresAt ??
      (expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null),
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('social_connections')
    .upsert(row, { onConflict: 'user_id,platform,account_id' });

  if (error) {
    // Fallback when unique constraint not yet migrated
    const legacy = await supabase
      .from('social_connections')
      .upsert(row, { onConflict: 'user_id,platform' });
    if (legacy.error) throw error;
  }
}

export async function processSocialOAuthCallback(
  platform: string,
  userId: string,
  params: OAuthCallbackParams,
  twitterSecret?: string
): Promise<void> {
  switch (platform) {
    case 'linkedin': {
      if (!params.code) throw new Error('Nieotrzymano kodu autoryzacji (LinkedIn)');
      const liTokens = await new LinkedInPublisher(linkedInConfig).exchangeCodeForToken(params.code);
      const liProfile = await new LinkedInPublisher(linkedInConfig).getUserProfile(liTokens.accessToken);
      await upsertConnection(userId, platform, {
        access_token: liTokens.accessToken,
        account_id: liProfile.id,
        account_name: liProfile.name,
        account_handle: liProfile.name,
        avatar_url: liProfile.profilePicture,
        expires_in: liTokens.expiresIn,
      });
      break;
    }

    case 'facebook': {
      if (!params.code) throw new Error('Nieotrzymano kodu autoryzacji (Facebook)');
      const fbTokens = await FacebookPublisher.exchangeCodeForToken(
        facebookConfig.appId,
        facebookConfig.appSecret,
        params.code,
        facebookConfig.redirectUri
      );
      const fbPublisher = new FacebookPublisher(fbTokens.accessToken);
      const fbPages = await fbPublisher.getPages();

      if (fbPages.length === 0) {
        throw new Error('Nie znaleziono żadnej strony Facebook, którą zarządzasz. Strona jest wymagana do publikacji.');
      }

      // Multi-account: zapisz wszystkie zarządzane strony
      for (const page of fbPages) {
        await upsertConnection(userId, platform, {
          access_token: page.accessToken,
          account_id: page.id,
          account_name: page.name,
          account_handle: page.name,
          avatar_url: `https://graph.facebook.com/${page.id}/picture`,
        });
      }
      break;
    }

    case 'instagram': {
      if (!params.code) throw new Error('Nieotrzymano kodu autoryzacji (Instagram)');
      const igTokens = await FacebookPublisher.exchangeCodeForToken(
        facebookConfig.appId,
        facebookConfig.appSecret,
        params.code,
        resolveOAuthCallbackUrl('instagram')
      );
      const igPublisher = new InstagramPublisher(igTokens.accessToken);
      const igAccounts = await igPublisher.findAllInstagramAccounts();

      if (igAccounts.length === 0) {
        const fallback = await igPublisher.findFirstInstagramAccount();
        if (!fallback) {
          throw new Error('Nie znaleziono konta Instagram Business powiązanego z Twoimi stronami Facebook.');
        }
        igAccounts.push(fallback);
      }

      for (const igAccount of igAccounts) {
        await upsertConnection(userId, platform, {
          access_token: igAccount.pageAccessToken,
          account_id: igAccount.id,
          account_name: igAccount.username,
          account_handle: igAccount.username,
          avatar_url: `https://graph.facebook.com/${igAccount.id}/picture`,
        });
      }
      break;
    }

    case 'twitter': {
      if (!params.oauth_token || !params.oauth_verifier) {
        throw new Error('Nieotrzymano poprawnych danych (Twitter)');
      }
      if (!twitterSecret) {
        throw new Error('Token OAuth wygasł lub nie istnieje. Zacznij autoryzację od nowa.');
      }
      const twTokens = await TwitterPublisher.exchangeForAccessToken(
        twitterConfig.appKey,
        twitterConfig.appSecret,
        params.oauth_token,
        twitterSecret,
        params.oauth_verifier
      );
      await upsertConnection(userId, platform, {
        access_token: twTokens.accessToken,
        refresh_token: twTokens.accessSecret,
        account_id: twTokens.userId,
        account_name: twTokens.screenName,
        account_handle: twTokens.screenName,
      });
      break;
    }

    case 'tiktok': {
      if (!params.code) throw new Error('Nieotrzymano kodu autoryzacji (TikTok)');
      const ttTokens = await new TikTokPublisher(tiktokConfig).exchangeCodeForToken(params.code);
      const ttProfile = await new TikTokPublisher(tiktokConfig).getUserProfile(ttTokens.accessToken);
      await upsertConnection(userId, platform, {
        access_token: ttTokens.accessToken,
        refresh_token: ttTokens.refreshToken,
        account_id: ttProfile.id,
        account_name: ttProfile.name,
        avatar_url: ttProfile.avatar,
        expires_at: ttTokens.expiresIn
          ? new Date(Date.now() + ttTokens.expiresIn * 1000).toISOString()
          : null,
      });
      break;
    }

    case 'youtube': {
      if (!params.code) throw new Error('Nieotrzymano kodu autoryzacji (YouTube)');
      if (!youtubeConfig.clientId || !youtubeConfig.clientSecret) {
        throw new Error('Brak YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET w env.');
      }
      const yt = new YouTubePublisher(youtubeConfig);
      const ytTokens = await yt.exchangeCodeForToken(params.code);
      const channel = await yt.getChannel(ytTokens.accessToken);
      await upsertConnection(userId, platform, {
        access_token: ytTokens.accessToken,
        refresh_token: ytTokens.refreshToken,
        account_id: channel.id,
        account_name: channel.name,
        account_handle: channel.name,
        avatar_url: channel.avatar,
        expires_in: ytTokens.expiresIn,
      });
      break;
    }

    case 'threads': {
      if (!params.code) throw new Error('Nieotrzymano kodu autoryzacji (Threads)');
      if (!threadsConfig.appId || !threadsConfig.appSecret) {
        throw new Error('Brak THREADS_APP_ID / FACEBOOK_APP_ID w env.');
      }
      const th = new ThreadsPublisher(threadsConfig);
      const thTokens = await th.exchangeCodeForToken(params.code);
      const profile = await th.getProfile(thTokens.accessToken);
      await upsertConnection(userId, platform, {
        access_token: thTokens.accessToken,
        account_id: profile.id || thTokens.userId,
        account_name: profile.name,
        account_handle: profile.name,
        expires_in: thTokens.expiresIn,
      });
      break;
    }

    default:
      throw new Error('Nieznana platforma społecznościowa: ' + platform);
  }
}

export function consumeTwitterOAuthForCallback(oauthToken: string) {
  return consumeTwitterOAuthContext(oauthToken);
}

export function redirectAfterOAuthSuccess(res: import('express').Response, platform: string) {
  const frontendUrl = resolveFrontendUrl();
  res.redirect(`${frontendUrl}/dashboard?socialSuccess=true&platform=${platform}`);
}

export function redirectAfterOAuthError(res: import('express').Response, platform: string, message: string) {
  logger.error(`Social callback error (${platform}):`, message);
  const frontendUrl = resolveFrontendUrl();
  res.redirect(`${frontendUrl}/dashboard?socialError=${encodeURIComponent(message)}`);
}
