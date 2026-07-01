import { v4 as uuidv4 } from 'uuid';
import type {
  CalendarSlotContext,
  CalendarSuggestion,
  FormData,
  GenerationResult,
  IntelligentCalendarPlanItem,
  ScheduledPost,
} from '../types';
import { GenerationType, Tone, VisualStyle } from '../types';
import { slotFormat } from './calendarCadenceService';
import { normalizeFormData } from '../components/inputForm/defaultFormData';
import { getPlatformVisualSpec } from '../utils/platformVisualSpec';
import { useGenerationStore } from '../stores/generationStore';

function formatDateYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DEFAULT_SLOT_TIMES = ['09:00', '12:00', '15:00', '18:00'] as const;

/** Domyślna godzina slotu — unika kolizji z istniejącymi slotami tego dnia */
export function defaultSlotTimeForDay(
  date: Date,
  existingPlanItems: IntelligentCalendarPlanItem[] = []
): string {
  const dateStr = formatDateYMD(date);
  const taken = new Set(
    existingPlanItems.filter((p) => p.date === dateStr && p.time).map((p) => p.time!)
  );
  for (const t of DEFAULT_SLOT_TIMES) {
    if (!taken.has(t)) return t;
  }
  return '14:00';
}

export function buildPlanItemFromSuggestion(
  suggestion: CalendarSuggestion,
  date: Date,
  existingPlanItems: IntelligentCalendarPlanItem[] = []
): IntelligentCalendarPlanItem {
  const slotType =
    suggestion.format === GenerationType.Video
      ? 'reel'
      : suggestion.format === GenerationType.PostWithImage
        ? 'post'
        : 'post';

  return {
    id: uuidv4(),
    date: formatDateYMD(date),
    time: defaultSlotTimeForDay(date, existingPlanItems),
    platform: suggestion.platform,
    topic: suggestion.topic,
    format: suggestion.format,
    strategy: suggestion.strategy,
    slotType,
  };
}

export function navigateToCalendarSlot(
  item: IntelligentCalendarPlanItem,
  navigate: (path: string, options?: { state?: unknown }) => void,
  autoGenerate = true
): void {
  const calendarSlot = buildCalendarSlotContext(item);
  useGenerationStore.getState().setPendingCalendarSlot(calendarSlot);
  navigate('/generator', {
    state: {
      prefillData: buildPrefillFromCalendarSlot(item),
      calendarSlot,
      autoGenerateSlot: autoGenerate,
    },
  });
}

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

  if (slotType === 'story' || slotType === 'reel') {
    const spec = getPlatformVisualSpec(item.platform);
    prefill.aspectRatio =
      slotType === 'reel' ? '9:16' : spec.allowedAspectRatios.includes('9:16') ? '9:16' : spec.defaultAspectRatio;
    prefill.generationType = slotType === 'reel' ? GenerationType.Video : GenerationType.PostWithImage;
    prefill.visualStyle = VisualStyle.PlatformSpecific;
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
