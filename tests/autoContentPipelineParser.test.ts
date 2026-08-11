import { describe, it, expect } from 'vitest';
import { Platform } from '@/types';
import {
  parseWeekContentPlan,
  parseFullContent,
  generateDefaultWeekPlan,
  type DailyPost,
} from '@/services/autoContentPipeline';

const basePost: DailyPost = {
  day: 'Monday',
  dayOfWeek: 1,
  contentType: 'educational',
  topic: 'Test topic',
  angle: 'Test angle',
  hook: 'Test hook',
  format: 'single-image',
  optimalTime: '14:00',
  hashtags: ['#test'],
  cta: 'Test CTA',
  estimatedEngagement: 6,
  confidence: 'medium',
};

describe('parseWeekContentPlan', () => {
  it('parses a clean JSON plan with days', () => {
    const json = JSON.stringify({
      days: [
        {
          day: 'Monday',
          topic: 'Wprowadzenie do tematu',
          contentType: 'educational',
          format: 'carousel',
          hook: 'Zacznij od podstaw',
          hashtags: ['#wstep', '#podstawy'],
          cta: 'Zapisz post',
          estimatedEngagement: 8,
          confidence: 'high',
        },
        {
          day: 'Tuesday',
          topic: 'Case study',
          contentType: 'entertaining',
          format: 'video',
          hook: 'Zobacz, jak to działa w praktyce',
          hashtags: '#case,#study',
          cta: 'Komentarz',
          estimatedEngagement: 7,
          confidence: 'medium',
        },
      ],
    });

    const plan = parseWeekContentPlan(json, 'Test theme', Platform.Instagram);

    expect(plan.posts).toHaveLength(2);
    expect(plan.posts[0].day).toBe('Monday');
    expect(plan.posts[0].topic).toBe('Wprowadzenie do tematu');
    expect(plan.posts[0].contentType).toBe('educational');
    expect(plan.posts[0].format).toBe('carousel');
    expect(plan.posts[0].hashtags).toEqual(['wstep', 'podstawy']);
    expect(plan.posts[1].day).toBe('Tuesday');
    expect(plan.posts[1].contentType).toBe('entertaining');
    expect(plan.posts[1].format).toBe('video');
  });

  it('parses a Markdown plan with mixed day headers', () => {
    const markdown = `
# Plan tygodniowy

Dzień 1
TOPIC: Wprowadzenie
CONTENT TYPE: educational
FORMAT: carousel
HOOK: Zacznij od podstaw
HASHTAGS: #wstep #podstawy
CTA: Zapisz post
ESTIMATED ENGAGEMENT: 8
CONFIDENCE: high

Poniedziałek:
TOPIC: Case study
CONTENT TYPE: entertaining
FORMAT: video
HOOK: Zobacz, jak to działa
HASHTAGS: #case
CTA: Komentarz
ESTIMATED ENGAGEMENT: 7
CONFIDENCE: medium

Day 2
TOPIC: Porady zaawansowane
CONTENT TYPE: inspirational
FORMAT: reel
HOOK: Poznaj triki
HASHTAGS: #tips
CTA: Udostępnij
ESTIMATED ENGAGEMENT: 9
CONFIDENCE: high
`;

    const plan = parseWeekContentPlan(markdown, 'Test theme', Platform.Instagram);

    expect(plan.posts.length).toBeGreaterThanOrEqual(3);
    const topics = plan.posts.map((p) => p.topic);
    expect(topics).toContain('Wprowadzenie');
    expect(topics).toContain('Case study');
    expect(topics).toContain('Porady zaawansowane');
  });

  it('falls back to default plan when input is unreadable', () => {
    const broken = 'To nie jest poprawny plan tygodniowy. Brak dni, brak pól.';
    const plan = parseWeekContentPlan(broken, 'Fallback theme', Platform.LinkedIn);
    const defaultPlan = generateDefaultWeekPlan('Fallback theme');

    expect(plan.posts).toHaveLength(defaultPlan.length);
    expect(plan.posts[0].topic).toContain('Fallback theme');
    expect(plan.theme).toBe('Fallback theme');
  });
});

describe('parseFullContent', () => {
  it('parses JSON content', () => {
    const json = JSON.stringify({
      postText: 'Pełna treść posta z hookiem.',
      imagePrompt: 'Photorealistic image of a coffee cup',
      hashtags: ['#coffee', '#morning'],
    });

    const result = parseFullContent(json, basePost);

    expect(result.generatedContent?.postText).toBe('Pełna treść posta z hookiem.');
    expect(result.generatedContent?.imagePrompt).toContain('coffee cup');
    expect(result.generatedContent?.hashtags).toEqual(['coffee', 'morning']);
  });

  it('parses Markdown content sections', () => {
    const markdown = `
COMPLETE POST TEXT
Pełna treść posta z hookiem.
Druga linia treści.

IMAGE PROMPT
Photorealistic image of a coffee cup

FINAL HASHTAGS
#coffee #morning #vibes
`;

    const result = parseFullContent(markdown, basePost);

    expect(result.generatedContent?.postText).toContain('Pełna treść posta z hookiem.');
    expect(result.generatedContent?.imagePrompt).toContain('coffee cup');
    expect(result.generatedContent?.hashtags).toEqual(expect.arrayContaining(['coffee', 'morning', 'vibes']));
  });

  it('falls back to base post when nothing is parseable', () => {
    const result = parseFullContent('!!! ???', basePost);

    expect(result.generatedContent?.postText).toBe(basePost.hook);
    expect(result.generatedContent?.hashtags).toEqual(basePost.hashtags);
  });
});
