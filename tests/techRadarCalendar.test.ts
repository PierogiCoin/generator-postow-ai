import { describe, expect, it } from 'vitest';
import { buildTechNewsCalendarItems, nextWeekdayDates } from '../services/techRadarCalendar';
import { Platform } from '../types';

describe('techRadarCalendar', () => {
  it('returns next weekdays skipping weekends', () => {
    // 2026-06-30 is Tuesday
    const dates = nextWeekdayDates(2, new Date('2026-06-30T12:00:00Z'));
    expect(dates).toHaveLength(2);
    expect(dates[0]).toBe('2026-07-01');
    expect(dates[1]).toBe('2026-07-02');
  });

  it('builds calendar slots from top news', () => {
    const items = buildTechNewsCalendarItems(
      [
        {
          id: '1',
          title: 'AI boom',
          summary: 's',
          angle: 'angle',
          sourceTitle: 'Tech',
          sourceUrl: 'https://x.com',
          relevance: 9,
        },
        {
          id: '2',
          title: 'SaaS trend',
          summary: 's',
          angle: 'angle2',
          sourceTitle: 'News',
          sourceUrl: '',
          relevance: 7,
        },
      ],
      Platform.LinkedIn,
      2
    );
    expect(items).toHaveLength(2);
    expect(items[0].platform).toBe(Platform.LinkedIn);
    expect(items[0].topic).toContain('AI boom');
    expect(items[0].time).toMatch(/^\d{2}:\d{2}$/);
  });
});
