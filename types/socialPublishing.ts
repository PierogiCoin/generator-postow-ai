export enum SocialPlatform {
  LinkedIn = 'linkedin',
  Twitter = 'twitter',
  Instagram = 'instagram',
  Facebook = 'facebook'
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
