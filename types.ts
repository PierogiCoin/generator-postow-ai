import type React from "react";

export enum Platform {
  Facebook = "Facebook",
  Instagram = "Instagram",
  TikTok = "TikTok",
  X = "X",
  LinkedIn = "LinkedIn",
  YouTube = "YouTube",
}

export enum Tone {
  Professional = "Professional",
  Casual = "Casual",
  Witty = "Witty",
  Inspirational = "Inspirational",
  Persuasive = "Persuasive",
}

/** Język wygenerowanej treści posta (niezależny od języka UI). */
export enum ContentLanguage {
  Polish = "pl",
  English = "en",
  German = "de",
  Czech = "cs",
}

export enum ToneArchetype {
  Expert = "Expert",
  Friend = "Friend",
  Innovator = "Innovator",
  Rebel = "Rebel",
  Sage = "Sage",
  Entertainer = "Entertainer",
}

export enum ContentType {
  Post = "Post",
  Advertisement = "Advertisement",
}

export enum VisualStyle {
  PlatformSpecific = "PlatformSpecific",
  Photorealistic = "Photorealistic",
  Cartoonish = "Cartoonish",
  Minimalist = "Minimalist",
  Vintage = "Vintage",
}

export enum GenerationType {
  PostWithImage = "PostWithImage",
  Video = "Video",
  Idea = "Idea",
  Campaign = "Campaign",
  ABTest = "ABTest",
  SeriesFollowUp = "SeriesFollowUp",
  Omnichannel = "Omnichannel",
}

export enum GenerationMode {
  Single = "Single",
  MultiVariant = "MultiVariant", // A/B/C with different hooks
  SplitTest = "SplitTest",       // For formal A/B testing
}

export enum CopywritingFramework {
  Auto = "Auto",
  PAS = "PAS",
  AIDA = "AIDA",
  Storytelling = "Storytelling",
  HookStoryOffer = "HookStoryOffer",
  ProblemAgitateSolve = "ProblemAgitateSolve",
  BeforeAfterBridge = "BeforeAfterBridge",
  FeatureBenefit = "FeatureBenefit",
}

export enum SortKey {
  Date = "date",
  Topic = "topic",
}

export enum SortDirection {
  Asc = "asc",
  Desc = "desc",
}

export enum AIModel {
  Flash = "Flash",
  Pro = "Pro",
}

export enum UserPlan {
  Free = "free",
  Creator = "creator",
  Pro = "pro",
  Agency = "agency",
  Business = "business",
  Enterprise = "enterprise",
}

export type TeamMemberRole = "manager" | "member";

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

export interface User {
  id: string;
  name: string;
  email: string;
  plan: UserPlan;
  /** Saldo kredytów z profiles.credits */
  credits?: number;
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
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  imageForVideo?: { base64: string, mimeType: string };
  repurposeFrom?: string;
  repurposeImageFrom?: string;

  // Campaign specific fields
  campaignGoal?: string;
  campaignDuration?: number; // in days
  campaignPlatforms?: Platform[];

  // Branding assets
  useMascot?: boolean | "auto";
  includeLogo?: boolean;
  learnedInsights?: AIInsight[];
  selectedPlatforms?: Platform[];

  // Copywriting framework
  copywritingFramework?: CopywritingFramework;

  // Generation mode (single vs multi-variant)
  generationMode?: GenerationMode;

  /** Język wygenerowanego opisu posta */
  contentLanguage: ContentLanguage;

  /** Po wygenerowaniu — automatyczna publikacja na połączonych kontach */
  autoPublishToConnected?: boolean;
  /** Przed publikacją dostosuj treść per platforma (multi-platform optimizer) */
  autoOptimizePerPlatform?: boolean;

  // Internal: visual vibe analysis result passed between generation steps
  _visualVibe?: string;
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

export interface GenerationResult {
  id: string;
  type: GenerationType;
  platform: Platform;
  postText: string;
  hashtags: string[];
  adHeadline: string | null;
  callToAction: string | null;
  imageUrl: string | null;
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
  };
  approvalStatus: PostApprovalStatus;
  comments: Comment[];
  authorId: string;
  // New fields for A/B Testing
  variants?: GenerationResult[];
  winnerVariantId?: string | null;
  performance?: PostPerformanceData;
}

export interface PostPerformanceData {
  reach: number;
  likes: number;
  comments: number;
  shares: number;
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

export interface OmnichannelPost {
  platform: Platform;
  postText: string;
  hashtags: string[];
}

export type PostApprovalStatus = "draft" | "pending_approval" | "approved" | "rejected";

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
  scheduledPlatforms?: Platform[]; // NEW
  scheduledFormats?: GenerationType[]; // NEW
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
  // FIX: Update byGenerationType to match the structure from the backend ({ text: number, image: number, ... })
  byGenerationType: {
    text?: number;
    image?: number;
    video?: number;
    campaign?: number;
    learnStyle?: number;
  };
  totalGenerations: number;
}

export interface SentimentAnalysisResult {
  sentiment: "Pozytywny" | "Neutralny" | "Negatywny";
  score: number;
}

export interface SEOAnalysisResult {
  mainKeyword: string;
  secondaryKeywords: string[];
  suggestions: string[];
  score: number;
}

export interface PredictionTip {
  text: string;
  isMet: boolean;
  impact?: 'High' | 'Medium' | 'Low';
}

export interface PerformancePrediction {
  reach: { score: number; label: string };
  engagement: { score: number; label: string };
  virality: { score: number; label: string };
  tips: PredictionTip[];
  insights: AIInsight[];
}

export interface BrandVoiceSettings {
  brandName: string;
  description: string;
  keywords: string;
  avoid: string;
  archetype?: ToneArchetype;
  examplesToFollow?: string[];
  examplesToAvoid?: string[];
  visualStyle?: string;
  successPatterns?: string[];

  // Branding Assets
  logoUrl?: string;
  mascotUrl?: string;
  mascotName?: string;
  mascotDescription?: string;
  includeMascotInGeneration?: boolean;

  // URL-based extraction
  websiteUrl?: string;
  brandColors?: string[];
  extractedFromUrl?: boolean;
}

export type BrandVoiceData = BrandVoiceSettings;

export interface BrandVoiceProfile {
  id: string;
  userId: string;
  name: string;
  settings: BrandVoiceSettings;
  teamId: string | null;
}

// Types for AI Campaign Planner
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

export interface PaymentHistoryItem {
  id: string;
  date: string;
  amount: number;
  plan: string;
  status: "Zapłacono" | "Nie powiodło się" | "W toku";
}

export interface StyleSuggestionResult {
  suggestedTones: Tone[];
  suggestedVisualStyles: VisualStyle[];
}

export type PostStatus = "draft" | "scheduled" | "published";

export type AIAssistantAction = "rewrite" | "shorten" | "lengthen" | "add-emoji" | "change_tone" | "summarize" | "expand_keywords" | "suggest_hashtags" | "custom";

export type RepurposedContentItem = { title: string; text: string; visualIdea?: string };
export type RepurposedContent = Partial<Record<Platform, string | RepurposedContentItem[]>>;


// Types for AI Trends Center
export interface Trend {
  id: string;
  topic: string;
  summary: string;
  hashtags: string[];
  questions: string[];
  quotes: string[];
}

export type AppView = "home" | "generator" | "calendar" | "analytics" | "account" | "trends";

export enum NotificationType {
  Success = "success",
  Error = "error",
  Info = "info",
  Comment = "comment",
  Status = "status",
  Achievement = "achievement",
}

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: number;
  read: boolean;
  link?: string;
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

// Type for Video Storyboard
export interface Scene {
  sceneNumber: number;
  visualDescription: string;
  narrationText: string;
}

export type AlternativeIdea = {
  title: string;
  description: string;
  platform?: Platform;
  tone?: Tone;
};

// Type for Intelligent Calendar
export interface CalendarSuggestion {
  topic: string;
  format: GenerationType;
  platform: Platform;
  strategy: string;
}

export interface IntelligentCalendarPlanItem {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  platform: Platform;
  topic: string;
  format: GenerationType;
  strategy: string;
  suggestedTone?: Tone;
  /** post | reel | story — slot w szablonie cadence */
  slotType?: 'post' | 'reel' | 'story';
  contentIntent?: 'educational' | 'entertaining' | 'inspirational' | 'promotional' | 'community' | 'behind-the-scenes';
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

// Types for Gamification
export enum AchievementId {
  FirstPost = "firstPost",
  CreativeStreak = "creativeStreak",
  CampaignMaster = "campaignMaster",
  PowerUser = "powerUser",
  Visionary = "visionary",
}

export interface Achievement {
  id: AchievementId;
  name: string;
  description: string;
  icon: React.FC<any>;
}

// Types for Strategic Assistant
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


// Types for AI Strategist / Auditor
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
}
