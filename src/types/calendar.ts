import { Tone } from "./brand";
import { GenerationType } from "./generation";
import { Platform } from "./social";

export interface CalendarSuggestion {
    topic: string;
    format: GenerationType;
    platform: Platform;
    strategy: string;
}

export interface IntelligentCalendarPlanItem {
    id: string;
    date: string;
    time?: string;
    platform: Platform;
    topic: string;
    format: GenerationType;
    strategy: string;
    suggestedTone?: Tone;
    /** post | reel | story — slot w szablonie cadence */
    slotType?: 'post' | 'reel' | 'story';
    contentIntent?: 'educational' | 'entertaining' | 'inspirational' | 'promotional' | 'community' | 'behind-the-scenes';
    suggestedDayOfWeek?: string;
    suggestedTimeSlot?: string;
}

/** Kontekst slotu kalendarza przekazywany do generatora (planowanie po wygenerowaniu). */
export interface CalendarSlotContext {
    planItemId: string;
    date: string;
    time?: string;
    platform: Platform;
    slotType?: 'post' | 'reel' | 'story';
    contentIntent?: IntelligentCalendarPlanItem['contentIntent'];
    topic: string;
}

export interface CampaignPost {
    id: string;
    day: number;
    platform: Platform;
    strategicGoal: string;
    postSuggestion: {
        topic: string;
        visualIdea: string;
        cta: string;
        };
}

export type CampaignPlan = CampaignPost[];
