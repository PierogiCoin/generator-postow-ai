import { AIInsight } from ".";

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

export interface PerformancePrediction {
    reach: { score: number; label: string };
    engagement: { score: number; label: string };
    virality: { score: number; label: string };
    tips: PredictionTip[];
    insights: AIInsight[];
}

export interface PredictionTip {
    text: string;
    isMet: boolean;
    impact?: 'High' | 'Medium' | 'Low';
}
