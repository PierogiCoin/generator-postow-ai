export enum SocialPlatform {
  LinkedIn = 'linkedin',
  Twitter = 'twitter',
  Instagram = 'instagram',
  Facebook = 'facebook',
  TikTok = 'tiktok'
}

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
  publishedAt: Date;
  url: string;
  metrics?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
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
