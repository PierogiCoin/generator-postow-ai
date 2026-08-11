import { AIInsight, IdeaResult, MultiVariantPost, PostApprovalStatus, PostPerformanceData, VideoScript } from ".";
import { Tone, VisualStyle } from "./brand";
import { CampaignPlan } from "./calendar";
import { OmnichannelPost, Platform } from "./social";

export enum GenerationType {
    PostWithImage = "PostWithImage",
    Video = "Video",
    Idea = "Idea",
    Campaign = "Campaign",
    ABTest = "ABTest",
    SeriesFollowUp = "SeriesFollowUp",
    Omnichannel = "Omnichannel"
}

export enum GenerationMode {
    Single = "Single",
    MultiVariant = "MultiVariant",
    SplitTest = "SplitTest"
}

export enum CopywritingFramework {
    Auto = "Auto",
    PAS = "PAS",
    AIDA = "AIDA",
    Storytelling = "Storytelling",
    HookStoryOffer = "HookStoryOffer",
    ProblemAgitateSolve = "ProblemAgitateSolve",
    BeforeAfterBridge = "BeforeAfterBridge",
    FeatureBenefit = "FeatureBenefit"
}

export enum AIModel {
    Flash = "Flash",
    Pro = "Pro"
}

export interface FormData {
    topic: string;
    audience: string;
    tone: Tone;
    platform: Platform;
    contentType: ContentType;
    visualStyle: VisualStyle;
    generationType: GenerationType;
    model: AIModel;
    audioDescription?: string;
    videoTranscript?: string;
    keywords?: string;
    aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "4:5" | "3:5";
    /** FLUX.2-pro (standard) vs FLUX.2-flex (typography / LinkedIn) */
    imageQuality?: "standard" | "typography";
    imageForVideo?: { base64: string, mimeType: string };
    repurposeFrom?: string;
    repurposeImageFrom?: string;
    campaignGoal?: string;
    campaignDuration?: number;
    campaignPlatforms?: Platform[];
    useMascot?: boolean | "auto";
    includeLogo?: boolean;
    learnedInsights?: AIInsight[];
    selectedPlatforms?: Platform[];
    copywritingFramework?: CopywritingFramework;
    generationMode?: GenerationMode;
    /** Język wygenerowanego opisu posta */
    contentLanguage: ContentLanguage;
    /** Po wygenerowaniu — automatyczna publikacja na połączonych kontach */
    autoPublishToConnected?: boolean;
    /** Przed publikacją dostosuj treść per platforma (multi-platform optimizer) */
    autoOptimizePerPlatform?: boolean;
    /** Włącz automatyczną ocenę jakości i retry dla wygenerowanego posta */
    enableQualityGate?: boolean;
    _visualVibe?: string;
}

export interface GenerationResult {
    id: string;
    type: GenerationType;
    platform: Platform;
    postText: string;
    hashtags: string[];
    adHeadline: string | null;
    callToAction: string | null;
    /** Link docelowy CTA (np. strona marki) — używany przy publikacji */
    ctaUrl?: string | null;
    imageUrl: string | null;
    /** Previous image URLs from regenerations (newest first). */
    imageHistory?: string[];
    /** Visual QA score from Gemini Vision (thumb-stop, brand fit, content match, etc.) */
    visualScore?: {
        overall: number;
        thumbStop: number;
        brandFit: number;
        textLegibility: number;
        platformFit: number;
        contentMatch: number;
        subjectAccuracy: number;
        offerMatch: number;
        audienceMatch: number;
        feedback: string[];
        improvedPromptHint?: string;
        badge: 'red' | 'yellow' | 'green';
        } | null;
    /** Set when PostWithImage/ABTest ran but image gen failed (text still returned). */
    imageGenerationFailed?: boolean;
    imageGenerationError?: string;
    videoUrl?: string | null;
    videoTitle?: string | null;
    videoDescription?: string | null;
    suggestedPostingTime?: string | null;
    visualStrategyTips?: string | null;
    ideas?: IdeaResult | null;
    videoScript?: VideoScript | null;
    audioDescription?: string | null;
    campaignPlan?: CampaignPlan | null;
    omnichannelPosts?: OmnichannelPost[] | null;
    multiVariantPosts?: MultiVariantPost[] | null;
    metadata: {
        tone: Tone;
        audience: string;
        keywords?: string;
        prompt: string;
        generationMode?: GenerationMode;
        hookType?: string;
        selectedVariant?: string;
        [key: string]: unknown;
        };
    approvalStatus: PostApprovalStatus;
    comments: Comment[];
    authorId: string;
    variants?: GenerationResult[];
    winnerVariantId?: string | null;
    performance?: PostPerformanceData;
}

export type AIAssistantAction = "rewrite" | "shorten" | "lengthen" | "add-emoji" | "change_tone" | "summarize" | "expand_keywords" | "suggest_hashtags" | "custom";

export enum ContentType {
    Post = "Post",
    Advertisement = "Advertisement"
}

/** Język wygenerowanej treści posta (niezależny od języka UI). */
export enum ContentLanguage {
    Polish = "pl",
    English = "en",
    German = "de",
    Czech = "cs"
}
