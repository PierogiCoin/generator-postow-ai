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
    Platform,
    GenerationType,
    ContentInventoryReview,
} from '../types';
import { gatherStrategicIntelligenceContext } from './strategicIntelligenceContext';
import {
    frequencyToPlanSlots,
    isValidStrategicAuditReport,
    normalizeActionablePlan,
} from '../utils/strategyHelpers';
import {
    buildInventoryPromptForAudit,
    dedupePlanAgainstInventory,
} from './contentInventoryService';

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
    } catch {
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
    } catch {
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
    } catch {
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
            contents: `Generate 5 strategic, high-growth content ideas for "${niche}" on ${platform || 'cross-platform'}.
            Each idea MUST match this JSON schema:
            - title: catchy hook (string)
            - type: exactly one of "Trending" | "Content Gap" | "Evergreen"
            - strategy: 1-2 sentences why this works and how to execute
            - sources: array of { "uri": "https://...", "title": "source name" } (can be empty array)
            Return as JSON array of 5 objects.`,
        }, userId);
    } catch {
        return [];
    }
};

export const discoverTrends = async (niche: string, userId?: string): Promise<any[]> => {
    try {
        return await generateJson<any[]>({
            model: "gemini-flash-latest",
            contents: `Based on your knowledge of social media patterns, suggest trending topics, hashtags, and content formats relevant to the ${niche} niche. Note: these are AI-generated suggestions based on training data, not live trends.
            Return a list of objects with: name, trendCategory, popularity (1-100), and reason for entry.`,
        }, userId);
    } catch {
        return [];
    }
};

export const generateStrategicAudit = async (
    goal: string,
    audience: string,
    competitors: string[],
    contentInventory: ContentInventoryReview,
    user: User,
    brandProfile?: Record<string, unknown>,
    preferences?: { frequency: string; formats: string[] },
    platforms?: Platform[]
): Promise<StrategicAuditReport> => {
    const targetPlatforms = platforms?.length ? platforms : [Platform.Facebook];
    const niche = goal.trim() || audience.trim() || 'marketing';
    const planSlots = frequencyToPlanSlots(preferences?.frequency || '3_times_week');
    const allowedFormats = (preferences?.formats?.length ? preferences.formats : ['PostWithImage']) as string[];
    const inventoryPrompt = buildInventoryPromptForAudit(contentInventory);

    let intelligenceBlock = '';
    let intelligenceInsights: StrategicAuditReport['intelligenceInsights'];

    try {
        const ctx = await gatherStrategicIntelligenceContext({
            userId: user.id,
            niche,
            goal,
            audience,
            competitors,
            platforms: targetPlatforms,
        });
        intelligenceBlock = ctx.promptBlock;
        intelligenceInsights = ctx.insights;
    } catch {
        // intelligence opcjonalne
    }

    const today = new Date();
    const startDate = today.toISOString().slice(0, 10);
    const endDate = new Date(today.getTime() + 13 * 86400000).toISOString().slice(0, 10);

    const report = await generateJson<StrategicAuditReport>({
        model: "gemini-pro-latest",
        contents: `You are a top-tier digital strategy consultant and content architect.
            Perform a deep STRATEGIC AUDIT and create an ACTIONABLE CONTENT PLAN.

            INPUTS:
            - BRAND CONTEXT: ${JSON.stringify(brandProfile || {})}
            - BRAND GOAL: "${goal}"
            - TARGET AUDIENCE: "${audience}"
            - KEY COMPETITORS: [${competitors.join(', ')}]
            - TARGET PLATFORMS: [${targetPlatforms.join(', ')}]
            - EXISTING CONTENT INVENTORY (MUST adapt strategy to this — do not repeat topics):
            ${inventoryPrompt}
            - PUBLISHING FREQUENCY: ${preferences?.frequency || '3_times_week'}
            - ALLOWED FORMATS: ${allowedFormats.join(', ')}

            ADAPTATION RULES (MANDATORY):
            - actionablePlan topics MUST be distinct from existingTopics in inventory
            - Fill coverageGaps from inventory (missing platforms/formats)
            - Build on topPerformers with NEW angles — sequels, not copies
            - Complement scheduled/planned items — do not duplicate calendar queue
            - Address repetitiveThemes by varying format or hook
            - In contentAdaptation explain what you reviewed and how plan differs

            PLAN CONSTRAINTS (MANDATORY):
            - Generate EXACTLY ${planSlots} items in actionablePlan
            - Date range: ${startDate} to ${endDate} (spread evenly, skip days if frequency is low)
            - Rotate platforms from TARGET PLATFORMS — do not use only one platform
            - Each item MUST include: id (uuid), date (YYYY-MM-DD), time (HH:mm from intelligence), platform, topic, format, strategy, suggestedTone
            - Each item MUST include slotType: "post" | "reel" | "story" and contentIntent: educational|entertaining|inspirational|promotional|community|behind-the-scenes
            - format must be one of ALLOWED FORMATS only
            - Use optimalPostingSlots from intelligence for "time" field

            LIVE INTELLIGENCE (prioritize over generic advice):
            ${intelligenceBlock || 'Brak danych intelligence — oprzyj się na wiedzy branżowej.'}

            Weave contentGaps and trendingTopics into contentPillars and SWOT opportunities.
            competitiveSnapshot must analyze each listed competitor with concrete differentiation.

            Return JSON:
            {
                "summary": "Strategic vision (3-5 sentences, concrete KPIs)",
                "contentPillars": [{ "pillar": "Name", "description": "Why", "postIdeas": ["..."] }],
                "refinedPersona": {
                    "name": "", "age": 35, "location": "", "jobTitle": "",
                    "demographics": "", "goals": [], "painPoints": [], "communicationTips": ""
                },
                "swot": { "strengths": [], "weaknesses": [], "opportunities": [], "threats": [] },
                "competitiveSnapshot": [{ "competitor": "Name", "analysis": "..." }],
                "contentAdaptation": {
                    "reviewedCount": ${contentInventory.totalCount},
                    "buildsOn": ["topics/styles to continue"],
                    "gapsFilled": ["what the plan adds vs inventory"],
                    "avoidedRepetition": ["topics deliberately skipped"],
                    "complementsScheduled": ["how plan fits queue"],
                    "notes": "2-3 sentences summary"
                },
                "actionablePlan": [...]
            }

            Language: Polish for all user-facing text. Return exactly as JSON.`,
    }, user.id);

    const { plan: dedupedPlan, skippedTopics } = dedupePlanAgainstInventory(
        report.actionablePlan || [],
        contentInventory
    );

    const adaptation = report.contentAdaptation || {
        reviewedCount: contentInventory.totalCount,
        buildsOn: contentInventory.topPerformers.slice(0, 3),
        gapsFilled: contentInventory.coverageGaps,
        avoidedRepetition: skippedTopics,
        complementsScheduled: contentInventory.upcomingScheduled > 0
            ? [`Uwzględniono ${contentInventory.upcomingScheduled} zaplanowanych slotów`]
            : [],
        notes: 'Strategia dopasowana do istniejących treści.',
    };

    if (skippedTopics.length) {
        adaptation.avoidedRepetition = [...new Set([...adaptation.avoidedRepetition, ...skippedTopics])];
    }

    const normalized: StrategicAuditReport = {
        ...report,
        actionablePlan: normalizeActionablePlan(dedupedPlan, allowedFormats as GenerationType[]),
        contentInventory,
        contentAdaptation: adaptation,
        intelligenceInsights,
    };

    if (!isValidStrategicAuditReport(normalized)) {
        throw new Error('Model zwrócił niekompletny raport strategiczny. Spróbuj ponownie z bardziej szczegółowymi danymi.');
    }

    return normalized;
};
