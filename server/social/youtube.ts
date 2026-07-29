import axios from 'axios';
import logger from '../logger.js';

export class YouTubePublisher {
  private config: { clientId: string; clientSecret: string; redirectUri: string };

  constructor(config: { clientId: string; clientSecret: string; redirectUri: string }) {
    this.config = config;
  }

  static getAuthUrl(clientId: string, redirectUri: string, state: string): string {
    const scope = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
    ].join(' ');
    return (
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${encodeURIComponent(state)}`
    );
  }

  async exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  }> {
    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
    };
  }

  async getChannel(accessToken: string): Promise<{ id: string; name: string; avatar?: string }> {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { part: 'snippet', mine: true },
    });
    const ch = response.data?.items?.[0];
    if (!ch) throw new Error('Nie znaleziono kanału YouTube');
    return {
      id: ch.id,
      name: ch.snippet?.title || 'YouTube',
      avatar: ch.snippet?.thumbnails?.default?.url,
    };
  }

  /**
   * Upload Short — pobiera videoUrl i wrzuca przez resumable upload.
   * Tytuł z #Shorts pomaga w klasyfikacji jako Short.
   */
  async publishShort(
    accessToken: string,
    videoUrl: string,
    title: string
  ): Promise<{ id: string; url: string }> {
    const videoRes = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 120000 });
    const buffer = Buffer.from(videoRes.data);
    const contentType = videoRes.headers['content-type'] || 'video/mp4';

    const shortTitle = title.includes('#Shorts') ? title.slice(0, 100) : `${title.slice(0, 90)} #Shorts`;

    const init = await axios.post(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        snippet: {
          title: shortTitle,
          description: title.slice(0, 5000),
          categoryId: '22',
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Length': String(buffer.length),
          'X-Upload-Content-Type': contentType,
        },
      }
    );

    const uploadUrl = init.headers.location;
    if (!uploadUrl) throw new Error('YouTube: brak resumable upload URL');

    const uploaded = await axios.put(uploadUrl, buffer, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': contentType,
        'Content-Length': String(buffer.length),
      },
      maxBodyLength: Infinity,
    });

    const videoId = uploaded.data?.id;
    if (!videoId) throw new Error('YouTube: brak video id po uploadzie');
    return { id: videoId, url: `https://www.youtube.com/shorts/${videoId}` };
  }
}
