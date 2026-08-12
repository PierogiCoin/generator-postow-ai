import { TwitterApi } from 'twitter-api-v2';
import axios from 'axios';
import logger from '../logger';

// Type definitions for API responses
interface LinkedInPost {
  id: string;
  commentary?: string;
  createdAt?: number;
  firstPublishedAt?: number;
  specificContent?: {
    'com.linkedin.ugc.ShareContent'?: {
      shareCommentary?: { text?: string };
    };
  };
}

interface TwitterPost {
  id: string;
  text: string;
  created_at: string;
  public_metrics?: {
    like_count?: number;
    reply_count?: number;
    retweet_count?: number;
    impression_count?: number;
  };
}

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
}

interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  full_picture?: string;
  story?: string;
  likes?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
  shares?: { count?: number };
}

interface InstagramPost {
  id: string;
  caption?: string;
  timestamp: string;
  media_url?: string;
  permalink?: string;
  like_count?: number;
  comments_count?: number;
}

interface TikTokVideo {
  id: string;
  title?: string;
  share_url: string;
  create_time: number;
}

interface InsightMetric {
  name: string;
  values?: Array<{ value?: number }>;
}

interface EnrichedPost {
  id: string;
  content: string;
  url: string;
  publishedAt: Date;
  mediaUrl?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  reach?: number;
  impressions?: number;
}

export class TikTokPublisher {
  private config: { clientKey: string; clientSecret: string; redirectUri: string };

  constructor(config: { clientKey: string; clientSecret: string; redirectUri: string }) {
    this.config = config;
  }

  static getAuthUrl(clientKey: string, redirectUri: string, state: string): string {
    const scope = 'user.info.basic,video.list,video.upload';
    return `https://www.tiktok.com/v2/auth/authorize/` +
      `?client_key=${clientKey}` +
      `&scope=${scope}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}`;
  }

  async exchangeCodeForToken(code: string): Promise<{ accessToken: string; refreshToken: string; openId: string; expiresIn: number }> {
    const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/',
      new URLSearchParams({
        client_key: this.config.clientKey,
        client_secret: this.config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      openId: response.data.open_id,
      expiresIn: response.data.expires_in
    };
  }

  async getUserProfile(accessToken: string): Promise<{ id: string; name: string; avatar?: string }> {
    const response = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: { fields: 'open_id,display_name,avatar_url' }
    });

    return {
      id: response.data.data.user.open_id,
      name: response.data.data.user.display_name,
      avatar: response.data.data.user.avatar_url
    };
  }

  async getPosts(accessToken: string): Promise<Array<{ id: string; title: string; url: string; publishedAt: Date }>> {
    const response = await axios.post('https://open.tiktokapis.com/v2/video/list/',
      { max_count: 20 },
      { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );

    return (response.data.data.videos || []).map((video: TikTokVideo) => ({
      id: video.id,
      title: video.title || '',
      url: video.share_url,
      publishedAt: new Date(video.create_time * 1000)
    }));
  }

  /**
   * Publikacja wideo (Content Posting API — PULL_FROM_URL).
   * Wymaga publicznego videoUrl oraz uprawnień TikTok app (direct post / inbox).
   */
  async publishVideo(
    accessToken: string,
    videoUrl: string,
    title: string
  ): Promise<{ id: string; url: string }> {
    try {
      const init = await axios.post(
        'https://open.tiktokapis.com/v2/post/publish/video/init/',
        {
          post_info: {
            title: title.slice(0, 2200),
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: videoUrl,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const publishId = init.data?.data?.publish_id;
      if (!publishId) {
        // Fallback: inbox upload (creator finalizuje w aplikacji TikTok)
        const inbox = await axios.post(
          'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/',
          {
            source_info: {
              source: 'PULL_FROM_URL',
              video_url: videoUrl,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const inboxId = inbox.data?.data?.publish_id || 'inbox';
        return {
          id: String(inboxId),
          url: 'https://www.tiktok.com/',
        };
      }

      return {
        id: String(publishId),
        url: `https://www.tiktok.com/`,
      };
    } catch (error: unknown) {
      const ax = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg =
        ax.response?.data?.error?.message ||
        (error instanceof Error ? error.message : String(error));
      throw new Error(`Failed to publish TikTok video: ${msg}`);
    }
  }
}

// ============================================
// YOUTUBE DATA API (Shorts)
// ============================================

