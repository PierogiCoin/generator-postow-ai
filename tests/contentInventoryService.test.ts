import { describe, expect, it } from 'vitest';
import {
  analyzeContentInventory,
  buildContentInventory,
  dedupePlanAgainstInventory,
} from '../services/contentInventoryService';
import { GenerationType, Platform } from '../types';

describe('contentInventoryService', () => {
  it('aggregates history and scheduled posts', () => {
    const items = buildContentInventory({
      history: [
        {
          id: 'h1',
          formData: { topic: 'Porady SEO', platform: Platform.Instagram, generationType: GenerationType.PostWithImage } as never,
          result: { postText: 'Post o SEO' } as never,
          timestamp: Date.now(),
          teamId: null,
          authorId: 'u1',
          authorName: 'Test',
          status: 'approved',
          comments: [],
        },
      ],
      favorites: [],
      scheduledPosts: [],
      calendarPlan: null,
    });
    expect(items.length).toBe(1);
    expect(items[0].status).toBe('generated');
  });

  it('detects platform coverage gaps', () => {
    const review = analyzeContentInventory(
      buildContentInventory({
        history: [
          {
            id: 'h1',
            formData: { topic: 'FB post', platform: Platform.Facebook, generationType: GenerationType.PostWithImage } as never,
            result: { postText: 'x' } as never,
            timestamp: Date.now(),
            teamId: null,
            authorId: 'u1',
            authorName: 'Test',
            status: 'approved',
            comments: [],
          },
        ],
        favorites: [],
        scheduledPosts: [],
        calendarPlan: null,
      }),
      [Platform.Facebook, Platform.LinkedIn]
    );
    expect(review.coverageGaps.some((g) => g.includes('LinkedIn'))).toBe(true);
  });

  it('flags similar plan topics', () => {
    const review = analyzeContentInventory(
      buildContentInventory({
        history: [
          {
            id: 'h1',
            formData: { topic: 'Jak robić content marketing w B2B', platform: Platform.LinkedIn } as never,
            result: {} as never,
            timestamp: Date.now(),
            teamId: null,
            authorId: 'u1',
            authorName: 'Test',
            status: 'approved',
            comments: [],
          },
        ],
        favorites: [],
        scheduledPosts: [],
        calendarPlan: null,
      })
    );
    const { skippedTopics } = dedupePlanAgainstInventory(
      [
        {
          id: 'p1',
          date: '2026-07-10',
          platform: Platform.LinkedIn,
          topic: 'Content marketing B2B — poradnik',
          format: GenerationType.PostWithImage,
          strategy: 'test',
        },
      ],
      review,
      0.35
    );
    expect(skippedTopics.length).toBeGreaterThan(0);
  });
});
