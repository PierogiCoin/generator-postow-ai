import axios from 'axios';
import logger from '../logger.js';

export class ThreadsPublisher {
  private config: { appId: string; appSecret: string; redirectUri: string };

  constructor(config: { appId: string; appSecret: string; redirectUri: string }) {
    this.config = config;
  }

  static getAuthUrl(appId: string, redirectUri: string, state: string): string {
    const scope = ['threads_basic', 'threads_content_publish'].join(',');
    return (
      `https://threads.net/oauth/authorize` +
      `?client_id=${encodeURIComponent(appId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&response_type=code` +
      `&state=${encodeURIComponent(state)}`
    );
  }

  async exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    userId: string;
    expiresIn?: number;
  }> {
    const response = await axios.post(
      'https://graph.threads.net/oauth/access_token',
      new URLSearchParams({
        client_id: this.config.appId,
        client_secret: this.config.appSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
        code,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return {
      accessToken: response.data.access_token,
      userId: String(response.data.user_id),
      expiresIn: response.data.expires_in,
    };
  }

  async getProfile(accessToken: string): Promise<{ id: string; name: string }> {
    const response = await axios.get('https://graph.threads.net/v1.0/me', {
      params: { fields: 'id,username', access_token: accessToken },
    });
    return {
      id: response.data.id,
      name: response.data.username || 'Threads',
    };
  }

  async publishPost(
    accessToken: string,
    userId: string,
    text: string,
    imageUrl?: string
  ): Promise<{ id: string; url: string }> {
    const createBody: Record<string, string> = {
      media_type: imageUrl ? 'IMAGE' : 'TEXT',
      text,
      access_token: accessToken,
    };
    if (imageUrl) createBody.image_url = imageUrl;

    const creation = await axios.post(
      `https://graph.threads.net/v1.0/${userId}/threads`,
      createBody
    );
    const creationId = creation.data?.id;
    if (!creationId) throw new Error('Threads: brak creation id');

    const published = await axios.post(`https://graph.threads.net/v1.0/${userId}/threads_publish`, {
      creation_id: creationId,
      access_token: accessToken,
    });
    const id = published.data?.id || creationId;
    return { id, url: `https://www.threads.net/@_/post/${id}` };
  }
}
