import { TwitterApi } from 'twitter-api-v2';
import axios from 'axios';

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

  async getAuthUrl(): Promise<string> {
    const scope = 'w_member_social';
    const state = Math.random().toString(36).substring(7);
    
    return `https://www.linkedin.com/oauth/v2/authorization?` +
      `response_type=code&` +
      `client_id=${this.config.clientId}&` +
      `redirect_uri=${encodeURIComponent(this.config.redirectUri)}&` +
      `state=${state}&` +
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
}

// ============================================
// FACEBOOK API  
// ============================================

export class FacebookPublisher {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  static getAuthUrl(appId: string, redirectUri: string): string {
    const scope = 'pages_manage_posts,pages_read_engagement';
    return `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${appId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${scope}`;
  }

  static async exchangeCodeForToken(appId: string, appSecret: string, code: string, redirectUri: string): Promise<{ accessToken: string }> {
    const response = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code
      }
    });

    return {
      accessToken: response.data.access_token
    };
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
    const response = await axios.get('https://graph.facebook.com/me/accounts', {
      params: {
        access_token: this.accessToken
      }
    });

    return response.data.data.map((page: any) => ({
      id: page.id,
      name: page.name,
      accessToken: page.access_token
    }));
  }

  async publishPost(pageId: string, pageAccessToken: string, content: string, imageUrl?: string): Promise<{ id: string; url: string }> {
    const endpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`;
    
    const postData: any = {
      message: content,
      access_token: pageAccessToken
    };

    if (imageUrl) {
      postData.link = imageUrl;
    }

    const response = await axios.post(endpoint, postData);

    return {
      id: response.data.id,
      url: `https://facebook.com/${response.data.id}`
    };
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

  async publishPost(igAccountId: string, imageUrl: string, caption: string): Promise<{ id: string; url: string }> {
    // Step 1: Create media container
    const containerResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${igAccountId}/media`,
      {
        image_url: imageUrl,
        caption,
        access_token: this.accessToken
      }
    );

    const containerId = containerResponse.data.id;

    // Step 2: Publish the container
    const publishResponse = await axios.post(
      `https://graph.facebook.com/v18.0/${igAccountId}/media_publish`,
      {
        creation_id: containerId,
        access_token: this.accessToken
      }
    );

    const mediaId = publishResponse.data.id;

    return {
      id: mediaId,
      url: `https://instagram.com/p/${mediaId}`
    };
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
    instagram: 2200
  };

  const limit = limits[platform];
  
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
