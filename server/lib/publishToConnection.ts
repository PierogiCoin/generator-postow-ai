/**
 * Shared publish dispatcher — used by /api/social/publish and scheduler.
 */

import {
  LinkedInPublisher,
  TwitterPublisher,
  FacebookPublisher,
  InstagramPublisher,
  TikTokPublisher,
  YouTubePublisher,
  ThreadsPublisher,
} from '../socialPublishing.js';
import {
  linkedInConfig,
  twitterConfig,
  tiktokConfig,
  youtubeConfig,
  threadsConfig,
} from '../config/social.js';
import { assertPlatformPublishRules, type PublishFormat } from './socialPublishGuards.js';

export type ConnectionRow = {
  id: string;
  platform: string;
  access_token: string;
  refresh_token?: string | null;
  account_id: string;
  account_name?: string;
};

export type PublishPayload = {
  caption: string;
  imageUrl?: string;
  mediaUrls?: string[];
  videoUrl?: string;
  linkUrl?: string | null;
  publishFormat?: PublishFormat;
};

export async function publishToConnection(
  connection: ConnectionRow,
  payload: PublishPayload
): Promise<{ id: string; url: string }> {
  const {
    caption,
    imageUrl,
    mediaUrls = [],
    videoUrl,
    linkUrl,
    publishFormat = 'feed',
  } = payload;

  const images = mediaUrls.length > 0 ? mediaUrls : imageUrl ? [imageUrl] : [];
  const primaryImage = images[0];

  switch (connection.platform) {
    case 'facebook': {
      const fb = new FacebookPublisher(connection.access_token);
      if (publishFormat === 'reel' || (videoUrl && publishFormat !== 'feed')) {
        return fb.publishVideo(connection.account_id, connection.access_token, caption, videoUrl!);
      }
      return fb.publishPost(
        connection.account_id,
        connection.access_token,
        caption,
        primaryImage,
        linkUrl ?? undefined
      );
    }

    case 'instagram': {
      const ig = new InstagramPublisher(connection.access_token);
      assertPlatformPublishRules('instagram', primaryImage, videoUrl, publishFormat, images);

      if (publishFormat === 'story') {
        return ig.publishStory(connection.account_id, {
          imageUrl: primaryImage,
          videoUrl,
        });
      }
      if (publishFormat === 'reel' || (videoUrl && publishFormat === 'feed' && !primaryImage)) {
        if (!videoUrl) throw new Error('Reels wymagają videoUrl');
        return ig.publishReel(connection.account_id, videoUrl, caption);
      }
      if (publishFormat === 'carousel' || images.length > 1) {
        if (images.length < 2) throw new Error('Karuzela wymaga co najmniej 2 obrazów');
        return ig.publishCarousel(connection.account_id, images, caption);
      }
      if (!primaryImage) throw new Error('Instagram wymaga obrazka do publikacji posta.');
      return ig.publishPost(connection.account_id, primaryImage, caption);
    }

    case 'twitter': {
      const tw = new TwitterPublisher(
        twitterConfig.appKey,
        twitterConfig.appSecret,
        connection.access_token,
        connection.refresh_token || ''
      );
      const mediaIds: string[] = [];
      for (const url of images.slice(0, 4)) {
        mediaIds.push(await tw.uploadMedia(url));
      }
      return tw.publishTweet(caption, mediaIds);
    }

    case 'linkedin': {
      const li = new LinkedInPublisher(linkedInConfig);
      return li.publishPost(connection.access_token, connection.account_id, caption, primaryImage);
    }

    case 'tiktok': {
      if (!videoUrl) throw new Error('TikTok wymaga videoUrl do publikacji');
      const tt = new TikTokPublisher(tiktokConfig);
      return tt.publishVideo(connection.access_token, videoUrl, caption);
    }

    case 'youtube': {
      if (!videoUrl) throw new Error('YouTube Shorts wymaga videoUrl');
      const yt = new YouTubePublisher(youtubeConfig);
      return yt.publishShort(connection.access_token, videoUrl, caption);
    }

    case 'threads': {
      const th = new ThreadsPublisher(threadsConfig);
      return th.publishPost(connection.access_token, connection.account_id, caption, primaryImage);
    }

    default:
      throw new Error(`Platforma ${connection.platform} nie jest jeszcze wspierana w publikacji.`);
  }
}
