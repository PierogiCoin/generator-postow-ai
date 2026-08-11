import { TwitterApi } from 'twitter-api-v2';
import axios from 'axios';
import logger from './logger.js';

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

export class InstagramPublisher {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getInstagramAccount(facebookPageId: string): Promise<{ id: string; username: string }> {
    const response = await axios.get(`https://graph.facebook.com/v18.0/${facebookPageId}`, {
      params: {
        fields: 'instagram_business_account',
        access_token: this.accessToken
      }
    });

    const igAccountId = response.data.instagram_business_account?.id;

    if (!igAccountId) {
      throw new Error('No Instagram Business Account linked to this Facebook Page');
    }

    const igResponse = await axios.get(`https://graph.facebook.com/v18.0/${igAccountId}`, {
      params: {
        fields: 'username',
        access_token: this.accessToken
      }
    });

    return {
      id: igAccountId,
      username: igResponse.data.username
    };
  }

  async findFirstInstagramAccount(): Promise<{ id: string; username: string; pageAccessToken: string } | null> {
    try {
      const response = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
        params: { access_token: this.accessToken }
      });

      const pages = response.data.data || [];
      for (const page of pages) {
        try {
          const ig = await this.getInstagramAccount(page.id);
          if (ig) {
            return { ...ig, pageAccessToken: page.access_token };
          }
        } catch (e) {
          // Pomijamy strony bez konta IG
        }
      }
      return null;
    } catch (e) {
      logger.error('findFirstInstagramAccount error:', e);
      return null;
    }
  }

  private async publishContainer(igAccountId: string, creationId: string): Promise<{ id: string; url: string }> {
    const publishResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${igAccountId}/media_publish`,
      { creation_id: creationId, access_token: this.accessToken }
    );
    if (publishResponse.data?.error) {
      throw new Error(`Instagram publish error: ${publishResponse.data.error.message}`);
    }
    const mediaId = publishResponse.data.id;
    return { id: mediaId, url: `https://instagram.com/p/${mediaId}` };
  }

  async publishPost(igAccountId: string, imageUrl: string, caption: string): Promise<{ id: string; url: string }> {
    try {
      const containerResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${igAccountId}/media`,
        { image_url: imageUrl, caption, access_token: this.accessToken }
      );
      if (containerResponse.data?.error) {
        throw new Error(`Instagram media container error: ${containerResponse.data.error.message}`);
      }
      const containerId = containerResponse.data.id;
      if (!containerId) throw new Error('Instagram: no container ID returned');
      return this.publishContainer(igAccountId, containerId);
    } catch (error: unknown) {
      throw new Error(`Failed to publish Instagram post: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Karuzela IG — min. 2 publiczne image URLs. */
  async publishCarousel(
    igAccountId: string,
    imageUrls: string[],
    caption: string
  ): Promise<{ id: string; url: string }> {
    if (imageUrls.length < 2) throw new Error('Karuzela wymaga co najmniej 2 obrazów');
    try {
      const childIds: string[] = [];
      for (const imageUrl of imageUrls.slice(0, 10)) {
        const child = await axios.post(`https://graph.facebook.com/v18.0/${igAccountId}/media`, {
          image_url: imageUrl,
          is_carousel_item: true,
          access_token: this.accessToken,
        });
        if (!child.data?.id) throw new Error('Instagram carousel: brak child container id');
        childIds.push(child.data.id);
      }

      const parent = await axios.post(`https://graph.facebook.com/v18.0/${igAccountId}/media`, {
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        caption,
        access_token: this.accessToken,
      });
      if (!parent.data?.id) throw new Error('Instagram carousel: brak parent container id');
      return this.publishContainer(igAccountId, parent.data.id);
    } catch (error: unknown) {
      throw new Error(`Failed to publish Instagram carousel: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async publishStory(
    igAccountId: string,
    media: { imageUrl?: string; videoUrl?: string }
  ): Promise<{ id: string; url: string }> {
    try {
      const body: Record<string, string> = {
        media_type: 'STORIES',
        access_token: this.accessToken,
      };
      if (media.videoUrl) body.video_url = media.videoUrl;
      else if (media.imageUrl) body.image_url = media.imageUrl;
      else throw new Error('Story wymaga imageUrl lub videoUrl');

      const container = await axios.post(
        `https://graph.facebook.com/v18.0/${igAccountId}/media`,
        body
      );
      if (!container.data?.id) throw new Error('Instagram story: brak container id');
      const result = await this.publishContainer(igAccountId, container.data.id);
      return { ...result, url: `https://instagram.com/stories/${result.id}` };
    } catch (error: unknown) {
      throw new Error(`Failed to publish Instagram story: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async publishReel(
    igAccountId: string,
    videoUrl: string,
    caption: string
  ): Promise<{ id: string; url: string }> {
    try {
      const container = await axios.post(`https://graph.facebook.com/v18.0/${igAccountId}/media`, {
        media_type: 'REELS',
        video_url: videoUrl,
        caption,
        access_token: this.accessToken,
      });
      if (!container.data?.id) throw new Error('Instagram reel: brak container id');
      // Reels often need processing — poll briefly
      for (let i = 0; i < 8; i++) {
        const status = await axios.get(`https://graph.facebook.com/v18.0/${container.data.id}`, {
          params: { fields: 'status_code', access_token: this.accessToken },
        });
        const code = status.data?.status_code;
        if (code === 'FINISHED' || code === 'PUBLISHED') break;
        if (code === 'ERROR') throw new Error('Instagram reel processing error');
        await new Promise((r) => setTimeout(r, 2000));
      }
      const result = await this.publishContainer(igAccountId, container.data.id);
      return { ...result, url: `https://instagram.com/reel/${result.id}` };
    } catch (error: unknown) {
      throw new Error(`Failed to publish Instagram reel: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Wszystkie konta IG Business powiązane ze stronami FB użytkownika. */
  async findAllInstagramAccounts(): Promise<Array<{ id: string; username: string; pageAccessToken: string }>> {
    const found: Array<{ id: string; username: string; pageAccessToken: string }> = [];
    try {
      const response = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
        params: { access_token: this.accessToken, limit: 50 },
      });
      for (const page of response.data.data || []) {
        try {
          const ig = await this.getInstagramAccount(page.id);
          if (ig) found.push({ ...ig, pageAccessToken: page.access_token });
        } catch {
          // skip pages without IG
        }
      }
    } catch (e) {
      logger.error('findAllInstagramAccounts error:', e);
    }
    return found;
  }

  async getPosts(igAccountId: string): Promise<Array<{
    id: string; content: string; url: string; publishedAt: Date; mediaUrl?: string;
    likes?: number; comments?: number; views?: number; reach?: number;
  }>> {
    try {
      const response = await axios.get(`https://graph.facebook.com/v18.0/${igAccountId}/media`, {
        params: {
          access_token: this.accessToken,
          fields: 'id,caption,timestamp,media_url,permalink,like_count,comments_count,media_type,ig_media_type',
          limit: 50
        }
      });

      const posts = response.data.data || [];
      const enrichedPosts = await Promise.allSettled(
        posts.map(async (post: InstagramPost) => {
          let reach = 0;
          let views = 0;
          try {
            const insightRes = await axios.get(
              `https://graph.facebook.com/v18.0/${post.id}/insights`,
              {
                params: {
                  access_token: this.accessToken,
                  metric: 'reach,impressions,video_views'
                }
              }
            );
            const insightData = insightRes.data?.data || [];
            reach = insightData.find((m: InsightMetric) => m.name === 'reach')?.values?.[0]?.value || 0;
            views = insightData.find((m: InsightMetric) => m.name === 'video_views')?.values?.[0]?.value || 0;
          } catch (_) {
            // Brak uprawnień – pomijamy
          }
          return {
            id: post.id,
            content: post.caption || '',
            url: post.permalink,
            publishedAt: new Date(post.timestamp),
            mediaUrl: post.media_url,
            likes: post.like_count || 0,
            comments: post.comments_count || 0,
            views,
            reach
          };
        })
      );

      return enrichedPosts
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<EnrichedPost>).value);
    } catch (error) {
      logger.error('Instagram getPosts error:', error);
      return [];
    }
  }

  async getComments(
    mediaId: string
  ): Promise<Array<{ id: string; message: string; authorName: string; createdAt: string }>> {
    try {
      const response = await axios.get(`https://graph.facebook.com/v18.0/${mediaId}/comments`, {
        params: {
          access_token: this.accessToken,
          fields: 'id,text,username,timestamp',
          limit: 25,
        },
      });
      return (response.data?.data || []).map(
        (c: { id: string; text?: string; username?: string; timestamp?: string }) => ({
          id: c.id,
          message: c.text || '',
          authorName: c.username || 'Użytkownik',
          createdAt: c.timestamp || new Date().toISOString(),
        })
      );
    } catch (error) {
      logger.error('Instagram getComments error:', error);
      return [];
    }
  }
}

// ============================================
// TIKTOK API
// ============================================

