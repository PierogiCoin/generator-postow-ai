import { generateContent, generateJson } from './apiClient';
import {
    SentimentAnalysisResult,
    SEOAnalysisResult,
    PerformancePrediction,
    StrategicAuditReport,
    StrategicIdea,
    GenerationResult,
    FormData,
    User,
    Platform
} from '../types';

/**
 * Analysis Service
 * Handles content analysis, SEO, performance prediction, and strategic ideas
 */

export const analyzeSentiment = async (text: string, userId: string): Promise<SentimentAnalysisResult | null> => {
    try {
        return await generateJson<SentimentAnalysisResult>({
            model: "gemini-flash-latest",
            contents: `Analyze the sentiment of this text: "${text}". 
            Explain: 
            - score (float -1 to 1), 
            - label (one of: Positive, Negative, Neutral, Mixed), 
            - confidence (0 to 1), 
            - keywords identified.
            Return exactly as JSON.`,
        }, userId);
    } catch (e) {
        console.error("Sentiment analysis failed:", e);
        return null;
    }
};

export const analyzeSEO = async (text: string, userId: string): Promise<SEOAnalysisResult | null> => {
    try {
        return await generateJson<SEOAnalysisResult>({
            model: "gemini-flash-latest",
            contents: `Perform a professional SEO audit on this text: "${text}". 
            Include: 
            - optimizedKeywords (array), 
            - missingKeywords (array), 
            - readabilityScore (0-100), 
            - readabilityLevel (e.g., Expert, Easy),
            - metaTitleSuggestion, 
            - metaDescriptionSuggestion.
            Return exactly as JSON.`,
        }, userId);
    } catch (e) {
        console.error("SEO analysis failed:", e);
        return null;
    }
};

export const predictPerformance = async (result: GenerationResult, formData: FormData, userId: string): Promise<PerformancePrediction | null> => {
    try {
        const prediction = await generateJson<PerformancePrediction>({
            model: "gemini-flash-latest",
            contents: `You are a social media data analyst. Analyze this draft post for ${formData.platform}:
            "${result.postText}"
            
            Predict performance metrics (0-100) based on typical benchmark for ${formData.platform} and target audience: ${formData.audience}.
            
            Return exactly as JSON:
            {
              "reach": { "score": 0-100, "label": "Low|Medium|High" },
              "engagement": { "score": 0-100, "label": "Low|Medium|High" },
              "virality": { "score": 0-100, "label": "Low|Medium|High" },
              "tips": [{ "text": "Detailed tip...", "impact": "High|Medium|Low" }],
              "insights": [{ "id": "uuid", "text": "Strategic insight...", "type": "positive|suggestion|observation" }]
            }`,
        }, userId);
        return prediction;
    } catch (e) {
        console.error("Performance prediction failed:", e);
        return null;
    }
};

export const getStrategicContentIdeas = async (
    niche: string,
    platform?: Platform,
    userId?: string
): Promise<StrategicIdea[]> => {
    try {
        return await generateJson<StrategicIdea[]>({
            model: "gemini-flash-latest",
            contents: `Generate 5 strategic, high-growth content ideas for ${niche} specifically tailored for ${platform || 'cross-platform deployment'}. 
            Each idea must have: 
            - id (uuid), 
            - title (hook focus), 
            - description (content core), 
            - reason (why this works/strategy).
            Return as a JSON array of objects.`,
        }, userId);
    } catch (e) {
        console.error("Strategic ideas generation failed:", e);
        return [];
    }
};

export const discoverTrends = async (niche: string, userId?: string): Promise<any[]> => {
    try {
        return await generateJson<any[]>({
            model: "gemini-flash-latest",
            contents: `Search for real-time trending topics, hashtags, and viral challenges currently relevant to the ${niche} niche. 
            Return a list of objects with: name, trendCategory, popularity (1-100), and reason for entry.`,
        }, userId);
    } catch (e) {
        console.error("Trend discovery failed:", e);
        return [];
    }
};

export const generateStrategicAudit = async (
    goal: string,
    audience: string,
    competitors: string[],
    historySummary: string,
    user: User,
    brandProfile?: any,
    preferences?: { frequency: string; formats: string[] }
): Promise<StrategicAuditReport> => {
    try {
        return await generateJson<StrategicAuditReport>({
            model: "gemini-pro-latest",
            contents: `You are a top-tier digital strategy consultant and content architect. 
            Perform a deep STRATEGIC AUDIT and create a CONTENT PLAN for:
            
            - BRAND CONTEXT: ${brandProfile ? JSON.stringify(brandProfile) : "Not specified"}
            - BRAND GOAL: "${goal}"
            - TARGET AUDIENCE: "${audience}"
            - KEY COMPETITORS: [${competitors.join(', ')}]
            - BRAND HISTORY: "${historySummary}"
            - PREFERENCES: Frequency: ${preferences?.frequency || 'Standard'}, Formats: ${preferences?.formats?.join(', ') || 'Mixed'}
            
            Produce a comprehensive report in JSON format:
            {
                "summary": "Detailed high-level vision and strategic direction",
                "contentPillars": [
                    { "pillar": "Name", "description": "Why this pillar?", "postIdeas": ["Idea 1", "Idea 2"] }
                ],
                "refinedPersona": {
                    "name": "Persona Name", "age": 35, "location": "City", "jobTitle": "Role", 
                    "demographics": "Details", "goals": [], "painPoints": [], "communicationTips": "Tips"
                },
                "swot": { "strengths": [], "weaknesses": [], "opportunities": [], "threats": [] },
                "competitiveSnapshot": [ { "competitor": "Name", "analysis": "Detailed comparison" } ],
                "actionablePlan": [
                    { 
                        "id": "uuid", 
                        "date": "YYYY-MM-DD", 
                        "time": "HH:mm (based on audience activity)",
                        "platform": "Facebook|Instagram|TikTok|X|LinkedIn", 
                        "topic": "Catchy Topic/Hook", 
                        "format": "PostWithImage|Video|Idea", 
                        "strategy": "Why this at this time?",
                        "suggestedTone": "Professional|Casual|Witty|Inspirational|Persuasive"
                    }
                ]
            }
            
            Return exactly as JSON. Ensure the plan reflects the requested frequency and mix of video/graphics. 
            The plan should cover the next 7-14 days. Tones must be one of the listed enums.`,
        }, user.id);
    } catch (e) {
        console.error("Strategic audit failed:", e);
        return {
            summary: "Audit failed to generate correctly. Please try more specific input.",
            contentPillars: [],
            refinedPersona: { name: audience, age: 30, location: "", jobTitle: "", demographics: "", goals: [], painPoints: [], communicationTips: "" },
            swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
            competitiveSnapshot: [],
            actionablePlan: [],
        };
    }
};
