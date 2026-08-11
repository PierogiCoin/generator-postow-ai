/**
 * Social Media API Integration Service
 * Connects with Facebook, Instagram, TikTok, and LinkedIn APIs
 * For posting, analytics, and content management
 */

import { Platform } from '../../types';

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
export class TikTokApiClient {
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
