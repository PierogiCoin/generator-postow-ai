import { TwitterApi } from 'twitter-api-v2';
import axios from 'axios';
import logger from '../logger.js';

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
    const tweetData: Record<string, unknown> = { text: content };

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

      return (response.data.data || []).map((tweet) => ({
        id: tweet.id,
        content: tweet.text,
        url: `https://twitter.com/i/web/status/${tweet.id}`,
        publishedAt: new Date(tweet.created_at || Date.now()),
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
