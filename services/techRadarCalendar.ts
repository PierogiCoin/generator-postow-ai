import { v4 as uuidv4 } from 'uuid';
import { GenerationType, Platform, type IntelligentCalendarPlanItem } from '../types';
import type { TechNewsItem } from './techRadarService';

const DEFAULT_TIMES = ['10:00', '15:00'];

/** Następne dni robocze (bez weekendu) jako YYYY-MM-DD */
export function nextWeekdayDates(count: number, from = new Date()): string[] {
  const dates: string[] = [];
  const cursor = new Date(from);
  cursor.setHours(12, 0, 0, 0);

  while (dates.length < count) {
    cursor.setDate(cursor.getDate() + 1);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
  }

  return dates;
}

/** Top newsy → sloty kalendarza (domyślnie 2 w tym tygodniu) */
export function buildTechNewsCalendarItems(
  items: TechNewsItem[],
  platform: Platform,
  count = 2
): IntelligentCalendarPlanItem[] {
  const top = [...items].sort((a, b) => b.relevance - a.relevance).slice(0, count);
  const dates = nextWeekdayDates(top.length);

  return top.map((item, index) => ({
    id: uuidv4(),
    date: dates[index] ?? dates[dates.length - 1],
    time: DEFAULT_TIMES[index] ?? DEFAULT_TIMES[0],
    platform,
    topic: `${item.title}\n\n${item.angle}`,
    format: GenerationType.PostWithImage,
    strategy: `Tech Radar: news z ${item.sourceTitle || 'branży'} — szybka reakcja na trend`,
    suggestedTone: undefined,
    slotType: 'post',
    contentIntent: 'educational',
  }));
}
