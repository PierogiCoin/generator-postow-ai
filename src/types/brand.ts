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
    /** Branża / nisza — napędza packi, chipy i NISZA w promptcie */
    niche?: string;
    logoUrl?: string;
    logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    logoSizePercent?: number;
    mascotUrl?: string;
    mascotName?: string;
    mascotDescription?: string;
    includeMascotInGeneration?: boolean;
    /** Photos of products to use as visual references */
    productImages?: string[];
    /** Style / mood / aesthetic reference images */
    styleImages?: string[];
    /** Location / interior / environment reference images */
    locationImages?: string[];
    websiteUrl?: string;
    brandColors?: string[];
    extractedFromUrl?: boolean;
    /** Wnioski z modułu śledzenia konkurencji */
    competitorIntel?: CompetitorBrandIntel;
}

export interface CompetitorBrandIntel {
    summary: string;
    differentiationAngles: string[];
    avoidCompetitorPatterns: string[];
    exploitGaps: string[];
    hashtagHints: string[];
    timingHints: string[];
    trackedHandles: string[];
    lastSyncedAt: string;
}

export type BrandVoiceData = BrandVoiceSettings;

export interface BrandVoiceProfile {
    id: string;
    userId: string;
    name: string;
    settings: BrandVoiceSettings;
    teamId: string | null;
}

export enum Tone {
    Professional = "Professional",
    Casual = "Casual",
    Witty = "Witty",
    Inspirational = "Inspirational",
    Persuasive = "Persuasive"
}

export enum ToneArchetype {
    Expert = "Expert",
    Friend = "Friend",
    Innovator = "Innovator",
    Rebel = "Rebel",
    Sage = "Sage",
    Entertainer = "Entertainer"
}

export enum VisualStyle {
    PlatformSpecific = "PlatformSpecific",
    Photorealistic = "Photorealistic",
    Cartoonish = "Cartoonish",
    Minimalist = "Minimalist",
    Vintage = "Vintage"
}

export interface StyleSuggestionResult {
    suggestedTones: Tone[];
    suggestedVisualStyles: VisualStyle[];
}
