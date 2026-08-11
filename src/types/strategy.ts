import { Tone } from "./brand";
import { IntelligentCalendarPlanItem } from "./calendar";
import { GenerationType } from "./generation";
import { Platform } from "./social";

export type StrategicIdeaType = "Trending" | "Content Gap" | "Evergreen";

export interface GroundingSource {
    uri: string;
    title: string;
}

export interface StrategicIdea {
    title: string;
    type: StrategicIdeaType;
    strategy: string;
    sources: GroundingSource[];
}

export interface StrategistContentItem {
    id: string;
    source: 'history' | 'favorite' | 'scheduled' | 'calendar' | 'published';
    topic: string;
    platform?: Platform;
    format?: GenerationType;
    tone?: string;
    status: 'published' | 'scheduled' | 'planned' | 'generated' | 'saved';
    date?: string;
    engagementScore?: number;
    snippet?: string;
}

export interface ContentInventoryReview {
    items: StrategistContentItem[];
    existingTopics: string[];
    topPerformers: string[];
    coverageGaps: string[];
    repetitiveThemes: string[];
    upcomingScheduled: number;
    byPlatform: Record<string, number>;
    byFormat: Record<string, number>;
    byStatus: Record<string, number>;
    totalCount: number;
}

export interface ContentAdaptationSummary {
    reviewedCount: number;
    buildsOn: string[];
    gapsFilled: string[];
    avoidedRepetition: string[];
    complementsScheduled: string[];
    notes: string;
}

export interface ContentPillar {
    pillar: string;
    description: string;
    postIdeas: string[];
}

export interface SWOTAnalysis {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
}

export interface CompetitiveSnapshot {
    competitor: string;
    analysis: string;
}

export interface StrategicAuditReport {
    summary: string;
    contentPillars: ContentPillar[];
    refinedPersona: AudiencePersona;
    swot: SWOTAnalysis;
    competitiveSnapshot: CompetitiveSnapshot[];
    actionablePlan: IntelligentCalendarPlanItem[];
    /** Przegląd istniejących treści użyty przy audycie */
    contentInventory?: ContentInventoryReview;
    /** Jak strategia dopasowano do historii postów */
    contentAdaptation?: ContentAdaptationSummary;
    /** Dane z modułu intelligence (trendy, luki, godziny) */
    intelligenceInsights?: {
        trendingTopics: string[];
        contentGaps: string[];
        optimalPostingSlots: string[];
        competitorRecommendation?: string;
        industryPulse?: string;
        newsAngles: string[];
        avoidTopics?: string[];
        competitorHandles: string[];
        primaryPlatform: Platform;
        };
}

export interface AudiencePersona {
    name: string;
    age: number;
    location: string;
    jobTitle: string;
    demographics: string;
    goals: string[];
    painPoints: string[];
    communicationTips: string;
}

export type AlternativeIdea = {
      title: string;
      description: string;
      platform?: Platform;
      tone?: Tone;
    };

export interface Trend {
    id: string;
    topic: string;
    summary: string;
    hashtags: string[];
    questions: string[];
    quotes: string[];
}

export interface Scene {
    sceneNumber: number;
    visualDescription: string;
    narrationText: string;
}
