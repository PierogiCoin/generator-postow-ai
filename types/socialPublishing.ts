export enum SocialPlatform {
  LinkedIn = 'linkedin',
  Twitter = 'twitter',
  Instagram = 'instagram',
  Facebook = 'facebook',
  TikTok = 'tiktok',
  YouTube = 'youtube',
  Threads = 'threads',
}

export type PublishFormat = 'feed' | 'carousel' | 'story' | 'reel';

export interface SocialConnection {
  id: string;
  userId: string;
  platform: SocialPlatform;
  accountId: string;
  accountName: string;
  accountHandle?: string;
  profileImageUrl?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  isActive: boolean;
  connectedAt: Date;
  lastSyncAt?: Date;
}

export interface SocialPost {
  id: string;
  platformPostId: string;
  content: string;
  mediaUrls?: string[];
  publishedAt: Date | string;
  url?: string;
  platform?: string;
  connectionId?: string;
  mediaUrl?: string;
  metrics?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
    reach?: number;
    impressions?: number;
  };
}

export interface PublishRequest {
  postId: string;
  connectionId: string;
  platform: SocialPlatform;
  content: string;
  mediaUrls?: string[];
  scheduledAt?: Date;
  hashtags?: string[];
}

export interface PublishResponse {
  id: string;
  platform: SocialPlatform;
  platformPostId: string;
  publishedAt: Date;
  url: string;
  status: 'published' | 'failed';
}
