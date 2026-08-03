import { describe, expect, it } from 'vitest';
import {
  LinkedInPublisher,
  TwitterPublisher,
  FacebookPublisher,
  InstagramPublisher,
  TikTokPublisher,
  YouTubePublisher,
  ThreadsPublisher,
  validatePostContent,
  formatHashtags,
} from '../server/social/index';

describe('server/social barrel', () => {
  it('eksportuje wszystkie publishery', () => {
    expect(LinkedInPublisher).toBeTypeOf('function');
    expect(TwitterPublisher).toBeTypeOf('function');
    expect(FacebookPublisher).toBeTypeOf('function');
    expect(InstagramPublisher).toBeTypeOf('function');
    expect(TikTokPublisher).toBeTypeOf('function');
    expect(YouTubePublisher).toBeTypeOf('function');
    expect(ThreadsPublisher).toBeTypeOf('function');
  });

  it('validatePostContent respektuje limity', () => {
    expect(validatePostContent('hi', 'twitter').valid).toBe(true);
    expect(validatePostContent('x'.repeat(300), 'twitter').valid).toBe(false);
    expect(validatePostContent('ok', 'unknown').valid).toBe(false);
  });

  it('formatHashtags dodaje #', () => {
    expect(formatHashtags(['foo', '#bar'])).toBe('#foo #bar');
  });
});
