import { describe, expect, it } from 'vitest';
import type { FormData, GenerationResult, ScheduledPost } from '../types';
import {
  Platform,
  GenerationType,
  Tone,
  ContentType,
  VisualStyle,
  AIModel,
  ContentLanguage,
  GenerationMode,
} from '../types';
import {
  listPublishableScheduledPosts,
  postsInDateRange,
} from '../services/bulkQueuePublisherService';
import { buildInboxFromSocialPosts } from '../services/engagementInboxService';
import type { SocialPost } from '../types/socialPublishing';

const baseForm: FormData = {
  topic: 'Test topic',
  audience: 'all',
  tone: Tone.Professional,
  platform: Platform.Facebook,
  contentType: ContentType.Post,
  visualStyle: VisualStyle.Minimalist,
  generationType: GenerationType.PostWithImage,
  model: AIModel.Flash,
  contentLanguage: ContentLanguage.Polish,
  generationMode: GenerationMode.Single,
};

function makeResult(id: string, postText = 'Hello world post content here'): GenerationResult {
  return {
    id,
    type: GenerationType.PostWithImage,
    platform: Platform.Facebook,
    postText,
    hashtags: [],
    adHeadline: null,
    callToAction: null,
    imageUrl: null,
    metadata: {
      tone: Tone.Professional,
      audience: 'all',
      prompt: 'p',
    },
    approvalStatus: 'draft',
    comments: [],
    authorId: 'u1',
  };
}

function makePost(overrides: Partial<ScheduledPost> & { id: string }): ScheduledPost {
  const { id, ...rest } = overrides;
  return {
    id,
    formData: baseForm,
    result: makeResult(id),
    scheduleTimestamp: Date.now(),
    createdAt: Date.now(),
    userId: 'u1',
    teamId: null,
    status: 'scheduled',
    approvalStatus: 'draft',
    comments: [],
    ...rest,
  };
}

describe('bulkQueuePublisherService', () => {
  it('filters pending approval and published', () => {
    const posts = [
      makePost({ id: '1' }),
      makePost({ id: '2', approvalStatus: 'pending_approval' }),
      makePost({ id: '3', status: 'published' }),
      makePost({ id: '4', result: makeResult('4', '') }),
    ];
    const ready = listPublishableScheduledPosts(posts);
    expect(ready.map((p) => p.id)).toEqual(['1']);
  });

  it('postsInDateRange respects bounds', () => {
    const start = new Date('2026-07-20T00:00:00');
    const end = new Date('2026-07-20T23:59:59');
    const posts = [
      makePost({ id: 'in', scheduleTimestamp: new Date('2026-07-20T12:00:00').getTime() }),
      makePost({ id: 'out', scheduleTimestamp: new Date('2026-07-21T12:00:00').getTime() }),
    ];
    expect(postsInDateRange(posts, start, end).map((p) => p.id)).toEqual(['in']);
  });
});

describe('engagementInboxService', () => {
  it('builds inbox only for posts with comments', () => {
    const posts: SocialPost[] = [
      {
        id: 'a',
        platformPostId: 'a',
        content: 'Post A',
        publishedAt: new Date().toISOString(),
        platform: 'facebook',
        metrics: { comments: 5, likes: 10 },
      },
      {
        id: 'b',
        platformPostId: 'b',
        content: 'Post B',
        publishedAt: new Date().toISOString(),
        platform: 'instagram',
        metrics: { comments: 0, likes: 100 },
      },
    ];
    const inbox = buildInboxFromSocialPosts(posts);
    expect(inbox).toHaveLength(1);
    expect(inbox[0].id).toBe('inbox-a');
    expect(inbox[0].priority).toBe('medium');
  });
});
