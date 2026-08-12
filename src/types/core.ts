import { SentimentAnalysisResult, SEOAnalysisResult } from "./analytics";
import { Tone } from "./brand";
import { AIModel, ContentType, GenerationResult, GenerationType, FormData } from "./generation";
import { Platform, PostStatus } from "./social";
import { UserPlan } from "./system";

export type TeamMemberRole = "manager" | "member";
export type PostApprovalStatus = "draft" | "pending_approval" | "approved" | "rejected";

export interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: TeamMemberRole;
}

export interface Team {
    id: string;
    name: string;
    members: TeamMember[];
}

export type DealSource = 'appsumo' | 'own';

export interface User {
    id: string;
    name: string;
    email: string;
    plan: UserPlan;
    /** Saldo kredytów z profiles.credits */
    credits?: number;
    /** Źródło Lifetime Deal */
    dealSource?: DealSource | null;
    /** Tier AppSumo / stack (1–3) */
    dealTier?: 1 | 2 | 3 | null;
    teams?: Team[];
    currentTeamId?: string | null;
    teamId?: string | null;
}

export interface AppError {
    message: string;
    type?: "api" | "limit" | "unknown";
    status?: number;
    details?: string;
}

export interface MultiVariantPost {
    variant: 'A' | 'B' | 'C';
    hookType: 'emotional' | 'educational' | 'storytelling' | 'controversial' | 'curiosity';
    postText: string;
    hashtags: string[];
    predictedEngagement: 'high' | 'medium' | 'low';
    whyItWorks: string;
}

export interface IdeaResult {
    postIdeas: { title: string; description: string }[];
    viralHooks: string[];
    ctaIdeas: string[];
}

export interface VideoScript {
    sceneDescription: string;
    suggestedTransitions: string[];
    musicSuggestion: string;
}

export interface PostPerformanceData {
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    /** Live = z API kont; estimated = brak live / zera (nie traktować jako fakt). */
    metricsSource?: 'live' | 'estimated';
}

export interface AIInsight {
    id: string;
    text: string;
    type: "positive" | "suggestion" | "observation";
    category?: "context" | "vibe" | "style" | "performance_tip";
}

export interface OptimalTime {
    platform: Platform;
    day: string;
    time: string;
}

export interface Comment {
    id: string;
    authorId: string;
    authorName: string;
    text: string;
    timestamp: number;
}

export interface CampaignHistoryItem {
    id: string;
    formData: FormData;
    result: GenerationResult;
    timestamp: number;
    teamId: string | null;
    authorId: string;
    authorName: string;
    status: PostApprovalStatus;
    comments: Comment[];
    performance?: PostPerformanceData;
    sentimentAnalysis?: SentimentAnalysisResult | null;
    seoAnalysis?: SEOAnalysisResult | null;
    dueDate?: number | null;
}

export interface FavoritePost {
    id: string;
    userId: string;
    formData: FormData;
    result: GenerationResult;
    timestamp: number;
    teamId: string | null;
}

export interface Draft {
    id: string;
    formData: FormData;
    timestamp: number;
    userId: string;
    teamId: string | null;
}

export interface NewCampaignPayload {
    formData: FormData;
    result: GenerationResult;
    sentimentAnalysis?: SentimentAnalysisResult | null;
    seoAnalysis?: SEOAnalysisResult | null;
}

export interface ScheduledPost {
    id: string;
    formData: FormData;
    result: GenerationResult;
    scheduleTimestamp: number;
    createdAt: number;
    userId: string;
    teamId: string | null;
    status: PostStatus;
    approvalStatus: PostApprovalStatus;
    comments: Comment[];
    dueDate?: number | null;
    scheduledPlatforms?: Platform[];
    scheduledFormats?: GenerationType[];
}

export interface CustomTemplate {
    id: string;
    name: string;
    formData: FormData;
    teamId: string | null;
}

export interface UsageStats {
    byPlatform: Partial<Record<Platform, number>>;
    byTone: Partial<Record<Tone, number>>;
    byContentType: Partial<Record<ContentType, number>>;
    byModel: Partial<Record<AIModel, number>>;
    byGenerationType: {
        text?: number;
        image?: number;
        video?: number;
        campaign?: number;
        learnStyle?: number;
        };
    totalGenerations: number;
}
