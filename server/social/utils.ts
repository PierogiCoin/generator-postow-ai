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

export const validatePostContent = (content: string, platform: string): { valid: boolean; error?: string } => {
  const limits: Record<string, number> = {
    twitter: 280,
    linkedin: 3000,
    facebook: 63206,
    instagram: 2200,
    tiktok: 2200,
    youtube: 5000,
    threads: 500,
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
