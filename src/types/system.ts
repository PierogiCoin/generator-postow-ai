export enum SortKey {
    Date = "date",
    Topic = "topic"
}

export enum SortDirection {
    Asc = "asc",
    Desc = "desc"
}

export enum UserPlan {
    Free = "free",
    Creator = "creator",
    Pro = "pro",
    Agency = "agency",
    Business = "business",
    Enterprise = "enterprise"
}

export enum NotificationType {
    Success = "success",
    Error = "error",
    Info = "info",
    Comment = "comment",
    Status = "status",
    Achievement = "achievement"
}

export interface Notification {
    id: string;
    type: NotificationType;
    message: string;
    timestamp: number;
    read: boolean;
    link?: string;
}

export enum AchievementId {
    FirstPost = "firstPost",
    CreativeStreak = "creativeStreak",
    CampaignMaster = "campaignMaster",
    PowerUser = "powerUser",
    Visionary = "visionary"
}

export interface Achievement {
    id: AchievementId;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}

export type AppView = "home" | "generator" | "calendar" | "analytics" | "account" | "trends";

export interface PaymentHistoryItem {
    id: string;
    date: string;
    amount: number;
    plan: string;
    status: "Zapłacono" | "Nie powiodło się" | "W toku";
}
