import { v4 as uuidv4 } from 'uuid';
import type {
  CalendarSlotContext,
  FormData,
  GenerationResult,
  IntelligentCalendarPlanItem,
  ScheduledPost,
} from '../types';
import { GenerationType, Tone } from '../types';
import { slotFormat } from './calendarCadenceService';
import { normalizeFormData } from '../components/inputForm/defaultFormData';

const INTENT_TONE: Record<NonNullable<IntelligentCalendarPlanItem['contentIntent']>, Tone> = {
  educational: Tone.Professional,
  entertaining: Tone.Witty,
  inspirational: Tone.Inspirational,
  promotional: Tone.Persuasive,
  community: Tone.Casual,
  'behind-the-scenes': Tone.Casual,
};

function inferSlotType(item: IntelligentCalendarPlanItem): 'post' | 'reel' | 'story' {
  if (item.slotType) return item.slotType;
  if (item.format === GenerationType.Video) return 'reel';
  return 'post';
}

export function parseSlotScheduleTimestamp(date: string, time?: string): number {
  const [year, month, day] = date.split('-').map(Number);
  const scheduled = new Date(year, month - 1, day);
  if (time && /^\d{1,2}:\d{2}$/.test(time)) {
    const [hours, minutes] = time.split(':').map(Number);
    scheduled.setHours(hours, minutes, 0, 0);
  } else {
    scheduled.setHours(14, 0, 0, 0);
  }
  if (scheduled.getTime() < Date.now()) {
    scheduled.setDate(scheduled.getDate() + 7);
  }
  return scheduled.getTime();
}

export function buildCalendarSlotContext(item: IntelligentCalendarPlanItem): CalendarSlotContext {
  return {
    planItemId: item.id,
    date: item.date,
    time: item.time,
    platform: item.platform,
    slotType: inferSlotType(item),
    contentIntent: item.contentIntent,
    topic: item.topic,
  };
}

export function buildPrefillFromCalendarSlot(item: IntelligentCalendarPlanItem): Partial<FormData> {
  const slotType = inferSlotType(item);
  const generationType = item.format || slotFormat(slotType);
  const tone =
    item.suggestedTone ||
    (item.contentIntent ? INTENT_TONE[item.contentIntent] : undefined);

  const prefill: Partial<FormData> = {
    topic: item.topic,
    platform: item.platform,
    generationType,
    tone,
    learnedInsights: [
      {
        id: `calendar-slot-${item.id}`,
        type: 'suggestion',
        category: 'performance_tip',
        text: `SLOT KALENDARZA (${slotType}${item.contentIntent ? `, ${item.contentIntent}` : ''}): ${item.strategy}`,
      },
    ],
  };

  if (slotType === 'story') {
    prefill.aspectRatio = '9:16';
    prefill.generationType = GenerationType.PostWithImage;
  }
  if (slotType === 'reel') {
    prefill.aspectRatio = '9:16';
    prefill.generationType = GenerationType.Video;
  }

  return prefill;
}

export async function fulfillCalendarSlot(
  context: CalendarSlotContext,
  formData: FormData,
  result: GenerationResult,
  userId: string,
  deps: {
    addOrUpdateScheduledPost: (post: ScheduledPost) => Promise<void>;
    removeIntelligentCalendarPlanItem: (itemId: string) => Promise<void>;
  }
): Promise<void> {
  const normalized = normalizeFormData(formData);
  const scheduleTimestamp = parseSlotScheduleTimestamp(context.date, context.time);

  const scheduledPost: ScheduledPost = {
    id: uuidv4(),
    userId,
    teamId: null,
    formData: {
      ...normalized,
      platform: context.platform,
      generationType: normalized.generationType,
    },
    result: {
      ...result,
      platform: context.platform,
      type: normalized.generationType,
    },
    scheduleTimestamp,
    status: 'scheduled',
    approvalStatus: 'draft',
    comments: [],
    createdAt: Date.now(),
    scheduledPlatforms: [context.platform],
    scheduledFormats: [normalized.generationType],
  };

  await deps.addOrUpdateScheduledPost(scheduledPost);
  await deps.removeIntelligentCalendarPlanItem(context.planItemId);
}
