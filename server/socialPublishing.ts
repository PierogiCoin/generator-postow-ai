import { TwitterApi } from 'twitter-api-v2';
import axios from 'axios';
import logger from './logger.js';

// ============================================
// LINKEDIN API
// ============================================

interface LinkedInConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
}

export class LinkedInPublisher {
  private config: LinkedInConfig;

  constructor(config: LinkedInConfig) {
    this.config = config;
  }

  async getAuthUrl(oauthState: string): Promise<string> {
    const scope = 'w_member_social';

    return `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code&` +
      `client_id=${this.config.clientId}&` +
      `redirect_uri=${encodeURIComponent(this.config.redirectUri)}&` +
      `state=${encodeURIComponent(oauthState)}&` +
      `scope=${scope}`;
  }

  async exchangeCodeForToken(code: string): Promise<{ accessToken: string; expiresIn: number }> {
    const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      }
    });

    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in
    };
  }

  async getUserProfile(accessToken: string): Promise<{ id: string; name: string; profilePicture?: string }> {
    const response = await axios.get('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    return {
      id: response.data.id,
      name: `${response.data.localizedFirstName} ${response.data.localizedLastName}`,
      profilePicture: response.data.profilePicture?.displayImage
    };
  }

  async publishPost(accessToken: string, userId: string, content: string, imageUrl?: string): Promise<{ id: string; url: string }> {
    const postData: any = {
      author: `urn:li:person:${userId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content
          },
          shareMediaCategory: imageUrl ? 'IMAGE' : 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    if (imageUrl) {
      postData.specificContent['com.linkedin.ugc.ShareContent'].media = [{
        status: 'READY',
        description: {
          text: 'Shared from Social Media Manager'
        },
        media: imageUrl,
        title: {
          text: 'Post Image'
        }
      }];
    }

    const response = await axios.post('https://api.linkedin.com/v2/ugcPosts', postData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    const postId = response.data.id;
    return {
      id: postId,
      url: `https://www.linkedin.com/feed/update/${postId}`
    };
  }

  async getPosts(accessToken: string, userId: string): Promise<Array<{
    id: string; content: string; url: string; publishedAt: Date;
    likes?: number; comments?: number;
  }>> {
    try {
      // Próbujemy nowszy endpoint /posts
      const response = await axios.get(`https://api.linkedin.com/v2/posts?author=urn:li:person:${userId}&q=author&count=20`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      return (response.data.elements || []).map((post: any) => ({
        id: post.id,
        content: post.commentary || '',
        url: `https://www.linkedin.com/feed/update/${post.id}`,
        publishedAt: new Date(post.createdAt || Date.now())
      }));
    } catch (error: any) {
      logger.error('LinkedIn getPosts error (trying fallback):', { data: error.response?.data, message: error.message });

      // Fallback do ugcPosts jeśli /posts nie działa (starsze uprawnienia)
      try {
        const response = await axios.get(`https://api.linkedin.com/v2/ugcPosts?q=author&author=urn:li:person:${userId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        });
        return (response.data.elements || []).map((post: any) => ({
          id: post.id,
          content: post.specificContent['com.linkedin.ugc.ShareContent']?.shareCommentary?.text || '',
          url: `https://www.linkedin.com/feed/update/${post.id}`,
          publishedAt: new Date(post.firstPublishedAt || Date.now())
        }));
      } catch (e) {
        return [];
      }
    }
  }
}

// ============================================
// TWITTER/X API
// ============================================

export class TwitterPublisher {
  private client: TwitterApi;

  constructor(appKey: string, appSecret: string, accessToken: string, accessSecret: string) {
    this.client = new TwitterApi({
      appKey,
      appSecret,
      accessToken,
      accessSecret
    });
  }

  static async getAuthUrl(appKey: string, appSecret: string, callbackUrl: string): Promise<{ url: string; oauthToken: string; oauthTokenSecret: string }> {
    const client = new TwitterApi({ appKey, appSecret });
    const authLink = await client.generateAuthLink(callbackUrl);

    return {
      url: authLink.url,
      oauthToken: authLink.oauth_token,
      oauthTokenSecret: authLink.oauth_token_secret
    };
  }

  static async exchangeForAccessToken(
    appKey: string,
    appSecret: string,
    oauthToken: string,
    oauthTokenSecret: string,
    oauthVerifier: string
  ): Promise<{ accessToken: string; accessSecret: string; userId: string; screenName: string }> {
    const client = new TwitterApi({
      appKey,
      appSecret,
      accessToken: oauthToken,
      accessSecret: oauthTokenSecret
    });

    const { client: loggedClient, accessToken, accessSecret, userId, screenName } =
      await client.login(oauthVerifier);

    return { accessToken, accessSecret, userId, screenName };
  }

  async getUserProfile(): Promise<{ id: string; name: string; username: string; profileImageUrl?: string }> {
    const me = await this.client.v2.me({
      'user.fields': ['profile_image_url', 'name', 'username']
    });

    return {
      id: me.data.id,
      name: me.data.name,
      username: me.data.username,
      profileImageUrl: me.data.profile_image_url
    };
  }

  async publishTweet(content: string, mediaIds?: string[]): Promise<{ id: string; url: string }> {
    const tweetData: any = { text: content };

    if (mediaIds && mediaIds.length > 0) {
      tweetData.media = { media_ids: mediaIds };
    }

    const tweet = await this.client.v2.tweet(tweetData);

    return {
      id: tweet.data.id,
      url: `https://twitter.com/i/web/status/${tweet.data.id}`
    };
  }

  async uploadMedia(imageUrl: string): Promise<string> {
    // Download image
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    // Upload to Twitter
    const mediaId = await this.client.v1.uploadMedia(buffer, { mimeType: 'image/jpeg' });
    return mediaId;
  }

  async getPosts(userId: string): Promise<Array<{
    id: string; content: string; url: string; publishedAt: Date;
    likes?: number; comments?: number; shares?: number; views?: number;
  }>> {
    try {
      const response = await this.client.v2.userTimeline(userId, {
        max_results: 20,
        'tweet.fields': ['created_at', 'text', 'public_metrics']
      });

      return (response.data.data || []).map((tweet: any) => ({
        id: tweet.id,
        content: tweet.text,
        url: `https://twitter.com/i/web/status/${tweet.id}`,
        publishedAt: new Date(tweet.created_at),
        likes: tweet.public_metrics?.like_count,
        comments: tweet.public_metrics?.reply_count,
        shares: tweet.public_metrics?.retweet_count,
        views: tweet.public_metrics?.impression_count,
      }));
    } catch (error) {
      logger.error('Twitter getPosts error:', error);
      return [];
    }
  }
}

// ============================================
// FACEBOOK API  
// ============================================

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
    } catch (error: any) {
      throw new Error(`Failed to exchange Facebook code for token: ${error.message}`);
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

      return (response.data.data || []).map((page: any) => ({
        id: page.id,
        name: page.name,
        accessToken: page.access_token
      }));
    } catch (error: any) {
      throw new Error(`Failed to fetch Facebook pages: ${error.message}`);
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
        posts.map(async (post: any) => {
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
            reach = insightData.find((m: any) => m.name === 'post_reach')?.values?.[0]?.value || 0;
            impressions = insightData.find((m: any) => m.name === 'post_impressions')?.values?.[0]?.value || 0;
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
        .map(r => (r as PromiseFulfilledResult<any>).value);
    } catch (error) {
      logger.error('Facebook getPosts error:', error);
      return [];
    }
  }
}

// ============================================
// INSTAGRAM API (via Facebook Graph API)
// ============================================

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

  async publishPost(igAccountId: string, imageUrl: string, caption: string): Promise<{ id: string; url: string }> {
    try {
      // Step 1: Create media container
      const containerResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${igAccountId}/media`,
        {
          image_url: imageUrl,
          caption,
          access_token: this.accessToken
        }
      );

      if (containerResponse.data?.error) {
        throw new Error(`Instagram media container error: ${containerResponse.data.error.message}`);
      }

      const containerId = containerResponse.data.id;
      if (!containerId) throw new Error('Instagram: no container ID returned');

      // Step 2: Publish the container
      const publishResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${igAccountId}/media_publish`,
        {
          creation_id: containerId,
          access_token: this.accessToken
        }
      );

      if (publishResponse.data?.error) {
        throw new Error(`Instagram publish error: ${publishResponse.data.error.message}`);
      }

      const mediaId = publishResponse.data.id;

      return {
        id: mediaId,
        url: `https://instagram.com/p/${mediaId}`
      };
    } catch (error: any) {
      throw new Error(`Failed to publish Instagram post: ${error.message}`);
    }
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
        posts.map(async (post: any) => {
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
            reach = insightData.find((m: any) => m.name === 'reach')?.values?.[0]?.value || 0;
            views = insightData.find((m: any) => m.name === 'video_views')?.values?.[0]?.value || 0;
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
        .map(r => (r as PromiseFulfilledResult<any>).value);
    } catch (error) {
      logger.error('Instagram getPosts error:', error);
      return [];
    }
  }
}

// ============================================
// TIKTOK API
// ============================================

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

    return (response.data.data.videos || []).map((video: any) => ({
      id: video.id,
      title: video.title || '',
      url: video.share_url,
      publishedAt: new Date(video.create_time * 1000)
    }));
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const validatePostContent = (content: string, platform: string): { valid: boolean; error?: string } => {
  const limits: Record<string, number> = {
    twitter: 280,
    linkedin: 3000,
    facebook: 63206,
    instagram: 2200,
    tiktok: 2200
  };

  const limit = limits[platform.toLowerCase()];

  if (!limit) {
    return { valid: false, error: 'Unsupported platform' };
  }

  if (content.length > limit) {
    return { valid: false, error: `Content exceeds ${platform} character limit of ${limit}` };
  }

  return { valid: true };
};

export const formatHashtags = (hashtags: string[]): string => {
  return hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
};
