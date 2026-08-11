export enum Platform {
    Facebook = "Facebook",
    Instagram = "Instagram",
    TikTok = "TikTok",
    X = "X",
    LinkedIn = "LinkedIn",
    YouTube = "YouTube"
}

export type PostStatus = "draft" | "scheduled" | "published";

export interface OmnichannelPost {
    platform: Platform;
    postText: string;
    hashtags: string[];
}

export type RepurposedContent = Partial<Record<Platform, string | RepurposedContentItem[]>>;
export type RepurposedContentItem = { title: string; text: string; visualIdea?: string };
