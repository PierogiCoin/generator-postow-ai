import axios from 'axios';
import logger from '../logger.js';
import type { LinkedInConfig, LinkedInPost } from './types.js';

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
    const postData: Record<string, unknown> = {
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
      const shareContent = (
        postData.specificContent as {
          'com.linkedin.ugc.ShareContent': Record<string, unknown>;
        }
      )['com.linkedin.ugc.ShareContent'];
      shareContent.media = [{
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

      return (response.data.elements || []).map((post: LinkedInPost) => ({
        id: post.id,
        content: post.commentary || '',
        url: `https://www.linkedin.com/feed/update/${post.id}`,
        publishedAt: new Date(post.createdAt || Date.now())
      }));
    } catch (error: unknown) {
      logger.error('LinkedIn getPosts error (trying fallback):', { data: (error as { response?: { data?: unknown } }).response?.data, message: (error instanceof Error ? error.message : String(error)) });

      // Fallback do ugcPosts jeśli /posts nie działa (starsze uprawnienia)
      try {
        const response = await axios.get(`https://api.linkedin.com/v2/ugcPosts?q=author&author=urn:li:person:${userId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        });
        return (response.data.elements || []).map((post: LinkedInPost) => ({
          id: post.id,
          content: post.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text || '',
          url: `https://www.linkedin.com/feed/update/${post.id}`,
          publishedAt: new Date(post.firstPublishedAt || Date.now())
        }));
      } catch (e) {
        return [];
      }
    }
  }
}
