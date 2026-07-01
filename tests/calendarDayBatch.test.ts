import { describe, it, expect } from 'vitest';
import {
  hasScheduledCoverage,
  listSlotsNeedingGeneration,
} from '../services/calendarDayBatchService';
import type { IntelligentCalendarPlanItem, ScheduledPost } from '../types';
import { Platform, GenerationType, Tone, ContentType, VisualStyle, AIModel, ContentLanguage } from '../types';

const planItem: IntelligentCalendarPlanItem = {
  id: 'p1',
  date: '2026-07-15',
  time: '14:00',
  platform: Platform.Instagram,
  topic: 'Test',
  format: GenerationType.PostWithImage,
  strategy: 's',
};

const scheduledPost: ScheduledPost = {
  id: 's1',
  userId: 'u1',
  teamId: null,
  formData: {
    topic: 'Test',
    audience: '',
    tone: Tone.Casual,
    platform: Platform.Instagram,
    contentType: ContentType.Post,
    visualStyle: VisualStyle.PlatformSpecific,
    generationType: GenerationType.PostWithImage,
    model: AIModel.Flash,
    contentLanguage: ContentLanguage.Polish,
  },
  result: {
    id: 'r1',
    type: GenerationType.PostWithImage,
    platform: Platform.Instagram,
    postText: 'x',
    hashtags: [],
    adHeadline: null,
    callToAction: null,
    imageUrl: null,
    metadata: { tone: Tone.Casual, audience: '', prompt: 'x' },
    approvalStatus: 'draft',
    comments: [],
    authorId: 'u1',
  },
  scheduleTimestamp: new Date('2026-07-15T14:00:00').getTime(),
  status: 'scheduled',
  approvalStatus: 'draft',
  comments: [],
  createdAt: Date.now(),
};

describe('calendarDayBatchService', () => {
  it('detects scheduled coverage at same time', () => {
    expect(hasScheduledCoverage(planItem, [scheduledPost])).toBe(true);
  });

  it('lists plan items without scheduled posts', () => {
    const items = listSlotsNeedingGeneration(new Date('2026-07-15'), [planItem], []);
    expect(items).toHaveLength(1);
    expect(listSlotsNeedingGeneration(new Date('2026-07-15'), [planItem], [scheduledPost])).toHaveLength(0);
  });
});
