/**
 * Social Media API Integration Service
 * Connects with Facebook, Instagram, TikTok, and LinkedIn APIs
 * For posting, analytics, and content management
 */

import { Platform } from '../types';

// Cross-environment env var helper (Vite uses import.meta.env, Node uses process.env)
const getEnvVar = (name: string): string | undefined => {
  try {
    return (import.meta as unknown as Record<string, Record<string, string | undefined>>).env?.[`VITE_${name}`] || (import.meta as unknown as Record<string, Record<string, string | undefined>>).env?.[name];
  } catch {
    return undefined;
  }
};

// API Configuration Types
export interface ApiCredentials {
  platform: Platform;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  pageId?: string; // For Facebook/Instagram pages
  accountId?: string; // For TikTok/LinkedIn
}

export interface SocialAccount {
  id: string;
  platform: Platform;
  name: string;
  handle: string;
  profileUrl: string;
  profilePicture?: string;
  followerCount: number;
  isConnected: boolean;
  lastSynced?: string;
  credentials?: ApiCredentials;
  permissions: string[];
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

export interface PostRequest {
  content: string;
  mediaUrls?: string[]; // URLs to images/videos
  mediaFiles?: File[]; // Direct file uploads
  scheduledTime?: Date;
  hashtags?: string[];
  mentions?: string[];
  location?: {
    name: string;
    lat: number;
    lng: number;
  };
  link?: string;
  callToAction?: string;
}

export interface PostResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  platform: Platform;
  publishedAt?: string;
  error?: string;
  errorCode?: string;
  rateLimited?: boolean;
  retryAfter?: number;
}

export interface AnalyticsMetrics {
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  profileVisits: number;
  followerChange: number;
  videoViews?: number;
  watchTime?: number; // in seconds
  audienceDemographics?: {
    age: Record<string, number>;
    gender: Record<string, number>;
    location: Record<string, number>;
  };
  bestPerformingHours?: number[];
}

export interface PostAnalytics {
  postId: string;
  platform: Platform;
  content: string;
  publishedAt: string;
  metrics: AnalyticsMetrics;
  engagementRate: number;
  isViral: boolean;
  viralThreshold: number;
}

export interface AccountAnalytics {
  accountId: string;
  platform: Platform;
  period: {
    start: string;
    end: string;
  };
  followerGrowth: number;
  totalPosts: number;
  avgEngagementRate: number;
  topPosts: PostAnalytics[];
  bestTimeToPost: string[];
  contentPerformance: {
    type: string;
    avgEngagement: number;
  }[];
}

// OAuth Configuration
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

const OAUTH_CONFIGS: Record<Platform, OAuthConfig> = {
  [Platform.Facebook]: {
    clientId: getEnvVar('FACEBOOK_APP_ID') || '',
    clientSecret: getEnvVar('FACEBOOK_APP_SECRET') || '',
    redirectUri: `${getEnvVar('NEXT_PUBLIC_APP_URL') || window.location.origin}/auth/facebook/callback`,
    scopes: ['pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish'],
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
  },
  [Platform.Instagram]: {
    clientId: getEnvVar('FACEBOOK_APP_ID') || '', // Instagram uses Facebook app
    clientSecret: getEnvVar('FACEBOOK_APP_SECRET') || '',
    redirectUri: `${getEnvVar('NEXT_PUBLIC_APP_URL') || window.location.origin}/auth/instagram/callback`,
    scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights'],
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
  },
  [Platform.TikTok]: {
    clientId: getEnvVar('TIKTOK_CLIENT_KEY') || '',
    clientSecret: getEnvVar('TIKTOK_CLIENT_SECRET') || '',
    redirectUri: `${getEnvVar('NEXT_PUBLIC_APP_URL') || window.location.origin}/auth/tiktok/callback`,
    scopes: ['user.info.basic', 'video.list', 'video.upload'],
    authUrl: 'https://www.tiktok.com/v2/auth/authorize',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token',
  },
  [Platform.LinkedIn]: {
    clientId: getEnvVar('LINKEDIN_CLIENT_ID') || '',
    clientSecret: getEnvVar('LINKEDIN_CLIENT_SECRET') || '',
    redirectUri: `${getEnvVar('NEXT_PUBLIC_APP_URL') || window.location.origin}/auth/linkedin/callback`,
    scopes: ['r_liteprofile', 'r_basicprofile', 'w_member_social', 'r_organization_social', 'w_organization_social'],
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
  },
  [Platform.X]: {
    clientId: getEnvVar('X_CLIENT_ID') || '',
    clientSecret: getEnvVar('X_CLIENT_SECRET') || '',
    redirectUri: `${getEnvVar('NEXT_PUBLIC_APP_URL') || window.location.origin}/auth/x/callback`,
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
  },
  [Platform.YouTube]: {
    clientId: getEnvVar('YOUTUBE_CLIENT_ID') || '',
    clientSecret: getEnvVar('YOUTUBE_CLIENT_SECRET') || '',
    redirectUri: `${getEnvVar('NEXT_PUBLIC_APP_URL') || window.location.origin}/auth/youtube/callback`,
    scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
  },
};

/**
 * Generate OAuth authorization URL for platform connection
 */
export function getOAuthUrl(platform: Platform, state?: string): string {
  const config = OAUTH_CONFIGS[platform];
  if (!config.clientId) return '';

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(','),
    response_type: 'code',
    state: state || generateState(),
  });

  // Platform-specific params
  if (platform === Platform.LinkedIn) {
    params.set('response_type', 'code');
  }

  return `${config.authUrl}?${params.toString()}`;
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeCodeForToken(
  platform: Platform,
  code: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number } | null> {
  const config = OAUTH_CONFIGS[platform];
  if (!config.clientId || !config.clientSecret) return null;

  try {
    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    };

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch {
    return null;
  }
}

/**
 * Facebook Graph API Client
 */
class FacebookApiClient {
  private accessToken: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getPages(): Promise<{ id: string; name: string; access_token: string }[]> {
    const response = await fetch(
      `${this.baseUrl}/me/accounts?access_token=${this.accessToken}`
    );
    const data = await response.json();
    return data.data || [];
  }

  async postToPage(pageId: string, pageToken: string, content: string, mediaUrls?: string[]): Promise<PostResult> {
    try {
      let endpoint = `${this.baseUrl}/${pageId}/feed`;
      let body: Record<string, string> = {
        message: content,
        access_token: pageToken,
      };

      // If media provided, use photos endpoint
      if (mediaUrls && mediaUrls.length > 0) {
        if (mediaUrls.length === 1) {
          endpoint = `${this.baseUrl}/${pageId}/photos`;
          body.url = mediaUrls[0];
        } else {
          // Multiple photos - use batch
          body.attached_media = JSON.stringify(mediaUrls.map(url => ({ url })));
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body),
      });

      const data = await response.json();

      if (data.error) {
        return {
          success: false,
          platform: Platform.Facebook,
          error: data.error.message,
          errorCode: data.error.code,
        };
      }

      return {
        success: true,
        platform: Platform.Facebook,
        postId: data.id,
        postUrl: `https://facebook.com/${data.id}`,
        publishedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        platform: Platform.Facebook,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getPageAnalytics(pageId: string, pageToken: string, since: string, until: string): Promise<AnalyticsMetrics | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${pageId}/insights?` +
        `metric=page_impressions,page_engaged_users,page_fan_adds,page_post_engagements&` +
        `since=${since}&until=${until}&` +
        `access_token=${pageToken}`
      );
      const data = await response.json();

      if (data.error) {
        return null;
      }

      // Parse metrics from response
      const metrics: AnalyticsMetrics = {
        impressions: this.extractMetricValue(data.data, 'page_impressions'),
        reach: this.extractMetricValue(data.data, 'page_impressions_unique'),
        engagement: this.extractMetricValue(data.data, 'page_engaged_users'),
        likes: this.extractMetricValue(data.data, 'page_fan_adds'),
        comments: 0, // Requires separate call
        shares: 0, // Requires separate call
        saves: 0, // N/A on Facebook
        clicks: 0,
        profileVisits: 0,
        followerChange: this.extractMetricValue(data.data, 'page_fan_adds'),
      };

      return metrics;
    } catch (error) {
      return null;
    }
  }

  private extractMetricValue(data: Array<{ name: string; values?: Array<{ value?: number }> }>, metricName: string): number {
    const metric = data.find(m => m.name === metricName);
    if (!metric || !metric.values || metric.values.length === 0) return 0;
    return metric.values[metric.values.length - 1].value || 0;
  }
}

/**
 * Instagram Graph API Client (via Facebook)
 */
class InstagramApiClient {
  private accessToken: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getAccounts(): Promise<{ id: string; username: string }[]> {
    // Get Facebook pages with Instagram accounts
    const fbClient = new FacebookApiClient(this.accessToken);
    const pages = await fbClient.getPages();

    const accounts: { id: string; username: string }[] = [];
    for (const page of pages) {
      try {
        const response = await fetch(
          `${this.baseUrl}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        );
        const data = await response.json();
        if (data.instagram_business_account) {
          const igResponse = await fetch(
            `${this.baseUrl}/${data.instagram_business_account.id}?fields=username&access_token=${page.access_token}`
          );
          const igData = await igResponse.json();
          accounts.push({
            id: data.instagram_business_account.id,
            username: igData.username,
          });
        }
      } catch (error) {
      }
    }

    return accounts;
  }

  async postToFeed(accountId: string, pageToken: string, content: string, imageUrl: string): Promise<PostResult> {
    try {
      // Step 1: Create media container
      const containerResponse = await fetch(
        `${this.baseUrl}/${accountId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            image_url: imageUrl,
            caption: content,
            access_token: pageToken,
          }),
        }
      );

      const containerData = await containerResponse.json();
      if (containerData.error) {
        return {
          success: false,
          platform: Platform.Instagram,
          error: containerData.error.message,
        };
      }

      // Step 2: Publish container
      const publishResponse = await fetch(
        `${this.baseUrl}/${accountId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            creation_id: containerData.id,
            access_token: pageToken,
          }),
        }
      );

      const publishData = await publishResponse.json();

      if (publishData.error) {
        return {
          success: false,
          platform: Platform.Instagram,
          error: publishData.error.message,
        };
      }

      return {
        success: true,
        platform: Platform.Instagram,
        postId: publishData.id,
        postUrl: `https://instagram.com/p/${publishData.id}`,
        publishedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        platform: Platform.Instagram,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async postStory(accountId: string, pageToken: string, imageUrl: string): Promise<PostResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${accountId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            image_url: imageUrl,
            media_type: 'STORIES',
            access_token: pageToken,
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        return {
          success: false,
          platform: Platform.Instagram,
          error: data.error.message,
        };
      }

      // Publish story
      await fetch(
        `${this.baseUrl}/${accountId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            creation_id: data.id,
            access_token: pageToken,
          }),
        }
      );

      return {
        success: true,
        platform: Platform.Instagram,
        postId: data.id,
        publishedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        platform: Platform.Instagram,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * LinkedIn API Client
 */
class LinkedInApiClient {
  private accessToken: string;
  private baseUrl = 'https://api.linkedin.com/v2';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getProfile(): Promise<{ id: string; name: string } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });

      if (!response.ok) return null;

      const data = await response.json();
      return {
        id: data.id,
        name: `${data.localizedFirstName} ${data.localizedLastName}`,
      };
    } catch (error) {
      return null;
    }
  }

  async postToProfile(content: string, mediaUrls?: string[]): Promise<PostResult> {
    try {
      const profile = await this.getProfile();
      if (!profile) {
        return {
          success: false,
          platform: Platform.LinkedIn,
          error: 'Could not fetch profile',
        };
      }

      const authorUrn = `urn:li:person:${profile.id}`;

      // Build post body
      const postBody: Record<string, any> = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content,
            },
            shareMediaCategory: mediaUrls && mediaUrls.length > 0 ? 'IMAGE' : 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      // Add media if provided
      if (mediaUrls && mediaUrls.length > 0) {
        postBody.specificContent['com.linkedin.ugc.ShareContent'].media = mediaUrls.map(url => ({
          status: 'READY',
          originalUrl: url,
          title: { text: 'Image' },
        }));
      }

      const response = await fetch(`${this.baseUrl}/ugcPosts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(postBody),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          platform: Platform.LinkedIn,
          error: error,
        };
      }

      const data = await response.json();

      return {
        success: true,
        platform: Platform.LinkedIn,
        postId: data.id,
        postUrl: `https://linkedin.com/feed/update/${data.id}`,
        publishedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        platform: Platform.LinkedIn,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getAnalytics(since: string, until: string): Promise<AnalyticsMetrics | null> {
    // LinkedIn analytics requires organization access or specific partnerships
    return null;
  }
}

/**
 * TikTok API Client
 */
class TikTokApiClient {
  private accessToken: string;
  private baseUrl = 'https://open.tiktokapis.com/v2';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getUserInfo(): Promise<{ id: string; displayName: string } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/user/info/`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) return null;

      const data = await response.json();
      return {
        id: data.data.user.open_id,
        displayName: data.data.user.display_name,
      };
    } catch (error) {
      return null;
    }
  }

  async postVideo(videoFile: File, title: string, description: string): Promise<PostResult> {
    try {
      // TikTok requires direct video upload flow
      // This is a simplified version
      const user = await this.getUserInfo();
      if (!user) {
        return {
          success: false,
          platform: Platform.TikTok,
          error: 'Could not fetch user info',
        };
      }

      // Step 1: Initialize upload (in real implementation, use their video upload API)
      const response = await fetch(`${this.baseUrl}/video/upload/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: videoFile.size,
            chunk_size: videoFile.size,
            total_chunk_count: 1,
          },
          title,
          description,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          platform: Platform.TikTok,
          error: error,
        };
      }

      const data = await response.json();

      return {
        success: true,
        platform: Platform.TikTok,
        postId: data.data.publish_id,
        publishedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        platform: Platform.TikTok,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Main Social Media API Service
 */
export class SocialMediaApiService {
  private accounts: Map<Platform, SocialAccount> = new Map();

  /**
   * Connect a social media account
   */
  async connectAccount(platform: Platform, credentials: ApiCredentials): Promise<SocialAccount | null> {
    try {
      let account: SocialAccount | null = null;

      switch (platform) {
        case Platform.Facebook: {
          const fbClient = new FacebookApiClient(credentials.accessToken);
          const pages = await fbClient.getPages();
          if (pages.length > 0) {
            const page = pages[0];
            account = {
              id: page.id,
              platform: Platform.Facebook,
              name: page.name,
              handle: page.name.toLowerCase().replace(/\s+/g, '_'),
              profileUrl: `https://facebook.com/${page.id}`,
              followerCount: 0, // Would need separate API call
              isConnected: true,
              lastSynced: new Date().toISOString(),
              credentials: { ...credentials, pageId: page.id },
              permissions: ['pages_manage_posts', 'pages_read_engagement'],
            };
          }
          break;
        }

        case Platform.Instagram: {
          const igClient = new InstagramApiClient(credentials.accessToken);
          const accounts = await igClient.getAccounts();
          if (accounts.length > 0) {
            const igAccount = accounts[0];
            account = {
              id: igAccount.id,
              platform: Platform.Instagram,
              name: igAccount.username,
              handle: igAccount.username,
              profileUrl: `https://instagram.com/${igAccount.username}`,
              followerCount: 0,
              isConnected: true,
              lastSynced: new Date().toISOString(),
              credentials,
              permissions: ['instagram_basic', 'instagram_content_publish'],
            };
          }
          break;
        }

        case Platform.LinkedIn: {
          const liClient = new LinkedInApiClient(credentials.accessToken);
          const profile = await liClient.getProfile();
          if (profile) {
            account = {
              id: profile.id,
              platform: Platform.LinkedIn,
              name: profile.name,
              handle: profile.name.toLowerCase().replace(/\s+/g, '-'),
              profileUrl: `https://linkedin.com/in/${profile.id}`,
              followerCount: 0,
              isConnected: true,
              lastSynced: new Date().toISOString(),
              credentials,
              permissions: ['w_member_social', 'r_basicprofile'],
            };
          }
          break;
        }

        case Platform.TikTok: {
          const ttClient = new TikTokApiClient(credentials.accessToken);
          const user = await ttClient.getUserInfo();
          if (user) {
            account = {
              id: user.id,
              platform: Platform.TikTok,
              name: user.displayName,
              handle: user.displayName.toLowerCase().replace(/\s+/g, ''),
              profileUrl: `https://tiktok.com/@${user.displayName}`,
              followerCount: 0,
              isConnected: true,
              lastSynced: new Date().toISOString(),
              credentials,
              permissions: ['video.upload', 'user.info.basic'],
            };
          }
          break;
        }

        default:
          return null;
      }

      if (account) {
        this.accounts.set(platform, account);
        this.saveToStorage();
      }

      return account;
    } catch (error) {
      return null;
    }
  }

  /**
   * Disconnect an account
   */
  disconnectAccount(platform: Platform): void {
    this.accounts.delete(platform);
    this.saveToStorage();
  }

  /**
   * Get all connected accounts
   */
  getConnectedAccounts(): SocialAccount[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Get connected account for specific platform
   */
  getAccount(platform: Platform): SocialAccount | undefined {
    return this.accounts.get(platform);
  }

  /**
   * Post content to a platform
   */
  async post(platform: Platform, request: PostRequest): Promise<PostResult> {
    const account = this.accounts.get(platform);
    if (!account || !account.credentials) {
      return {
        success: false,
        platform,
        error: 'Account not connected',
      };
    }

    const { credentials } = account;

    switch (platform) {
      case Platform.Facebook: {
        if (!credentials.pageId) {
          return { success: false, platform, error: 'No page ID' };
        }
        const fbClient = new FacebookApiClient(credentials.accessToken);
        return fbClient.postToPage(
          credentials.pageId,
          credentials.accessToken,
          request.content,
          request.mediaUrls
        );
      }

      case Platform.Instagram: {
        if (!request.mediaUrls || request.mediaUrls.length === 0) {
          return { success: false, platform, error: 'Instagram requires an image' };
        }
        const igClient = new InstagramApiClient(credentials.accessToken);
        return igClient.postToFeed(
          credentials.accountId || account.id,
          credentials.accessToken,
          request.content,
          request.mediaUrls[0]
        );
      }

      case Platform.LinkedIn: {
        const liClient = new LinkedInApiClient(credentials.accessToken);
        return liClient.postToProfile(request.content, request.mediaUrls);
      }

      case Platform.TikTok: {
        if (!request.mediaFiles || request.mediaFiles.length === 0) {
          return { success: false, platform, error: 'TikTok requires a video file' };
        }
        const ttClient = new TikTokApiClient(credentials.accessToken);
        return ttClient.postVideo(
          request.mediaFiles[0],
          request.content.slice(0, 100),
          request.content
        );
      }

      default:
        return {
          success: false,
          platform,
          error: 'Platform not supported',
        };
    }
  }

  /**
   * Post to multiple platforms simultaneously
   */
  async postToMultiple(
    platforms: Platform[],
    request: PostRequest
  ): Promise<PostResult[]> {
    const results = await Promise.all(
      platforms.map(platform => this.post(platform, request))
    );
    return results;
  }

  /**
   * Get analytics for a platform
   */
  async getAnalytics(
    platform: Platform,
    since: Date,
    until: Date
  ): Promise<AnalyticsMetrics | null> {
    const account = this.accounts.get(platform);
    if (!account || !account.credentials) {
      return null;
    }

    const { credentials } = account;
    const sinceStr = since.toISOString().split('T')[0];
    const untilStr = until.toISOString().split('T')[0];

    switch (platform) {
      case Platform.Facebook: {
        if (!credentials.pageId) return null;
        const fbClient = new FacebookApiClient(credentials.accessToken);
        return fbClient.getPageAnalytics(
          credentials.pageId,
          credentials.accessToken,
          sinceStr,
          untilStr
        );
      }

      default:
        return null;
    }
  }

  /**
   * Save accounts to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    const data = Array.from(this.accounts.entries());
    localStorage.setItem('social_media_accounts', JSON.stringify(data));
  }

  /**
   * Load accounts from localStorage
   */
  loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('social_media_accounts');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.accounts = new Map(data);
      } catch (error) {
      }
    }
  }

  /**
   * Check if account is connected and token is valid
   */
  isTokenValid(platform: Platform): boolean {
    const account = this.accounts.get(platform);
    if (!account || !account.credentials) return false;

    // Check if token is expired
    if (account.credentials.expiresAt) {
      return Date.now() < account.credentials.expiresAt;
    }

    return true;
  }
}

// Helper function
function generateState(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Export singleton instance
export const socialMediaApi = new SocialMediaApiService();

// Export individual clients for advanced usage
export { FacebookApiClient, InstagramApiClient, LinkedInApiClient, TikTokApiClient };

export default socialMediaApi;
