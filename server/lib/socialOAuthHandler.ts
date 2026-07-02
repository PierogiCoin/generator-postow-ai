import logger from '../logger.js';
import { supabase } from '../lib/clients.js';
import {
  LinkedInPublisher,
  TwitterPublisher,
  FacebookPublisher,
  InstagramPublisher,
  TikTokPublisher,
} from '../socialPublishing.js';
import {
  linkedInConfig,
  twitterConfig,
  facebookConfig,
  tiktokConfig,
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

export async function processSocialOAuthCallback(
  platform: string,
  userId: string,
  params: OAuthCallbackParams,
  twitterSecret?: string
): Promise<void> {
  let connectionData: Record<string, unknown> = {};

  switch (platform) {
    case 'linkedin': {
      if (!params.code) throw new Error('Nieotrzymano kodu autoryzacji (LinkedIn)');
      const liTokens = await new LinkedInPublisher(linkedInConfig).exchangeCodeForToken(params.code);
      const liProfile = await new LinkedInPublisher(linkedInConfig).getUserProfile(liTokens.accessToken);
      connectionData = {
        access_token: liTokens.accessToken,
        account_id: liProfile.id,
        account_name: liProfile.name,
        account_handle: liProfile.name,
        avatar_url: liProfile.profilePicture,
        expires_in: liTokens.expiresIn,
      };
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

      const firstPage = fbPages[0];
      connectionData = {
        access_token: firstPage.accessToken,
        account_id: firstPage.id,
        account_name: firstPage.name,
        account_handle: firstPage.name,
        avatar_url: `https://graph.facebook.com/${firstPage.id}/picture`,
      };
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
      const igAccount = await igPublisher.findFirstInstagramAccount();

      if (!igAccount) {
        throw new Error('Nie znaleziono konta Instagram Business powiązanego z Twoimi stronami Facebook.');
      }

      connectionData = {
        access_token: igAccount.pageAccessToken,
        account_id: igAccount.id,
        account_name: igAccount.username,
        account_handle: igAccount.username,
        avatar_url: `https://graph.facebook.com/${igAccount.id}/picture`,
      };
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
      connectionData = {
        access_token: twTokens.accessToken,
        refresh_token: twTokens.accessSecret,
        account_id: twTokens.userId,
        account_name: twTokens.screenName,
        account_handle: twTokens.screenName,
      };
      break;
    }

    case 'tiktok': {
      if (!params.code) throw new Error('Nieotrzymano kodu autoryzacji (TikTok)');
      const ttTokens = await new TikTokPublisher(tiktokConfig).exchangeCodeForToken(params.code);
      const ttProfile = await new TikTokPublisher(tiktokConfig).getUserProfile(ttTokens.accessToken);
      connectionData = {
        access_token: ttTokens.accessToken,
        refresh_token: ttTokens.refreshToken,
        account_id: ttProfile.id,
        account_name: ttProfile.name,
        avatar_url: ttProfile.avatar,
        expires_at: ttTokens.expiresIn
          ? new Date(Date.now() + ttTokens.expiresIn * 1000).toISOString()
          : null,
      };
      break;
    }

    default:
      throw new Error('Nieznana platforma społecznościowa: ' + platform);
  }

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
    [key: string]: unknown;
  };

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
    .upsert(row, { onConflict: 'user_id,platform' });

  if (error) throw error;
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
