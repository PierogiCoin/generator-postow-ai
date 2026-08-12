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

export class FacebookPublisher {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  static getAuthUrl(appId: string, redirectUri: string, state: string, isInstagram: boolean = false): string {
    const fbScopes = 'pages_manage_posts,pages_read_engagement,pages_show_list,business_management';
    const igScopes = 'instagram_basic,instagram_content_publish,instagram_manage_insights,pages_read_engagement,pages_show_list';
    const scope = isInstagram ? igScopes : fbScopes;

    return `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${appId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}&` +
      `scope=${scope}`;
  }


  static async exchangeCodeForToken(appId: string, appSecret: string, code: string, redirectUri: string): Promise<{ accessToken: string }> {
    try {
      const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code
        }
      });

      if (response.data?.error) {
        throw new Error(`Facebook OAuth error: ${response.data.error.message}`);
      }

      return {
        accessToken: response.data.access_token
      };
    } catch (error: unknown) {
      throw new Error(`Failed to exchange Facebook code for token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getUserProfile(): Promise<{ id: string; name: string; picture?: string }> {
    const response = await axios.get('https://graph.facebook.com/me', {
      params: {
        fields: 'id,name,picture',
        access_token: this.accessToken
      }
    });

    return {
      id: response.data.id,
      name: response.data.name,
      picture: response.data.picture?.data?.url
    };
  }

  async getPages(): Promise<Array<{ id: string; name: string; accessToken: string }>> {
    try {
      const response = await axios.get('https://graph.facebook.com/me/accounts', {
        params: {
          access_token: this.accessToken
        }
      });

      if (response.data?.error) {
        throw new Error(`Facebook API error: ${response.data.error.message}`);
      }

      return (response.data.data || []).map((page: FacebookPage) => ({
        id: page.id,
        name: page.name,
        accessToken: page.access_token
      }));
    } catch (error: unknown) {
      throw new Error(`Failed to fetch Facebook pages: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async publishPost(
    pageId: string,
    pageAccessToken: string,
    content: string,
    imageUrl?: string,
    linkUrl?: string
  ): Promise<{ id: string; url: string }> {
    const normalizedLink = linkUrl?.trim();

    if (!imageUrl && normalizedLink) {
      const response = await axios.post(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
        access_token: pageAccessToken,
        message: content,
        link: normalizedLink,
      });
      const postId = response.data.id || response.data.post_id;
      return {
        id: postId,
        url: `https://facebook.com/${postId}`,
      };
    }

    const endpoint = imageUrl
      ? `https://graph.facebook.com/v18.0/${pageId}/photos`
      : `https://graph.facebook.com/v18.0/${pageId}/feed`;

    const postData: Record<string, string> = {
      access_token: pageAccessToken,
    };

    if (imageUrl) {
      postData.url = imageUrl;
      postData.caption = content;
    } else {
      postData.message = content;
    }

    const response = await axios.post(endpoint, postData);

    return {
      id: response.data.id || response.data.post_id,
      url: `https://facebook.com/${response.data.id || response.data.post_id}`,
    };
  }

  async publishVideo(
    pageId: string,
    pageAccessToken: string,
    content: string,
    videoUrl: string
  ): Promise<{ id: string; url: string }> {
    if (!videoUrl) throw new Error('Facebook video wymaga videoUrl');
    const response = await axios.post(`https://graph.facebook.com/v18.0/${pageId}/videos`, {
      access_token: pageAccessToken,
      file_url: videoUrl,
      description: content,
    });
    const id = response.data.id || response.data.post_id;
    return { id, url: `https://facebook.com/${id}` };
  }

  async getPosts(pageId: string, pageAccessToken: string): Promise<Array<{
    id: string; content: string; url: string; publishedAt: Date; mediaUrl?: string;
    likes?: number; comments?: number; shares?: number; reach?: number; impressions?: number;
  }>> {
    try {
      const response = await axios.get(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
        params: {
          access_token: pageAccessToken,
          fields: 'id,message,created_time,full_picture,likes.summary(true),comments.summary(true),shares,story',
          limit: 50
        }
      });

      // Pobierz insights dla każdego postu
      const posts = response.data.data || [];
      const enrichedPosts = await Promise.allSettled(
        posts.map(async (post: FacebookPost) => {
          let reach = 0;
          let impressions = 0;
          try {
            const insightRes = await axios.get(
              `https://graph.facebook.com/v18.0/${post.id}/insights`,
              {
                params: {
                  access_token: pageAccessToken,
                  metric: 'post_impressions,post_reach'
                }
              }
            );
            const insightData = insightRes.data?.data || [];
            reach = insightData.find((m: InsightMetric) => m.name === 'post_reach')?.values?.[0]?.value || 0;
            impressions = insightData.find((m: InsightMetric) => m.name === 'post_impressions')?.values?.[0]?.value || 0;
          } catch (_) {
            // Brak uprawnień do insights – pomijamy
          }
          return {
            id: post.id,
            content: post.message || '',
            url: `https://facebook.com/${post.id}`,
            publishedAt: new Date(post.created_time),
            mediaUrl: post.full_picture,
            likes: post.likes?.summary?.total_count || 0,
            comments: post.comments?.summary?.total_count || 0,
            shares: post.shares?.count || 0,
            reach,
            impressions
          };
        })
      );

      return enrichedPosts
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<EnrichedPost>).value);
    } catch (error) {
      logger.error('Facebook getPosts error:', error);
      return [];
    }
  }

  async getComments(
    postId: string,
    pageAccessToken: string
  ): Promise<Array<{ id: string; message: string; authorName: string; createdAt: string }>> {
    try {
      const response = await axios.get(`https://graph.facebook.com/v18.0/${postId}/comments`, {
        params: {
          access_token: pageAccessToken,
          fields: 'id,message,from,created_time',
          filter: 'toplevel',
          order: 'reverse_chronological',
          limit: 25,
        },
      });
      return (response.data?.data || []).map(
        (c: { id: string; message?: string; from?: { name?: string }; created_time?: string }) => ({
          id: c.id,
          message: c.message || '',
          authorName: c.from?.name || 'Użytkownik',
          createdAt: c.created_time || new Date().toISOString(),
        })
      );
    } catch (error) {
      logger.error('Facebook getComments error:', error);
      return [];
    }
  }
}

// ============================================
// INSTAGRAM API (via Facebook Graph API)
// ============================================

