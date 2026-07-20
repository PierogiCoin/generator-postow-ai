import { Type, FunctionDeclaration } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import { generateContent, generateJson, callApi } from './apiClient';
import { getAppLocale } from '../utils/aiLanguage';
import {
    AudiencePersona,
    CalendarSuggestion,
    IntelligentCalendarPlanItem,
    StyleSuggestionResult,
    AIAssistantAction,
    Platform,
    GenerationType,
    Scene,
    FormData,
    FavoritePost
} from '../types';

/**
 * Assistant Service
 * Handles assistant-specific functions like topic suggestions, storyboards, and AI actions
 */

export const getTopicSuggestions = async (currentTopic: string, prompt: string, userId: string): Promise<string[]> => {
    try {
        return await generateJson<string[]>({
            model: "gemini-flash-latest",
            contents: `You are a creative content strategist. Based on the current topic: "${currentTopic}", suggest 5 more specific, trending, or alternative topic ideas that follow this user request: "${prompt}". Return only a JSON array of strings.`,
        }, userId);
    } catch (e) {
        return [];
    }
};

export const generateStoryboard = async (topic: string, userId: string): Promise<Scene[]> => {
    try {
        return await generateJson<Scene[]>({
            model: "gemini-pro-latest",
            contents: `Create a professional 5-scene storyboard for a high-impact social media video about: "${topic}". 
            For each scene provide: 
            - sceneNumber (int), 
            - visualDescription (detailed setting, lighting, action), 
            - narrationText (spoken script or catchy text overlay).
            Return as a JSON array of objects.`,
        }, userId);
    } catch (e) {
        return [];
    }
};

export const generateSpeech = async (text: string, userId: string): Promise<Blob | string | null> => {
    try {
        // Assuming backend has a tts endpoint that returns base64 or audio blob
        const response = await callApi("generate-speech", { text }, userId);
        return response; // This might be base64 string or handled by the caller
    } catch (e) {
        return null;
    }
};

export const performAIAction = async (
    action: AIAssistantAction,
    text: string,
    context: { fullText: string, formData: FormData | null, tone?: string, [key: string]: unknown },
    userId: string
): Promise<{ resultText: string }> => {
    let prompt = "";
    switch (action) {
        case 'rewrite': prompt = `Rewrite this following text to be more magnetic, engaging, and professional: "${text}"`; break;
        case 'shorten': prompt = `Condense this text into its most impactful form without losing key information: "${text}"`; break;
        case 'lengthen': prompt = `Expand this text with relevant details, context, and examples to make it more comprehensive: "${text}"`; break;
        case 'add-emoji': prompt = `Strategically add relevant emojis to this text to enhance visual appeal and tone: "${text}"`; break;
        case 'change_tone': prompt = `Transform the tone of this text to "${context.tone || 'professional'}": "${text}"`; break;
        case 'summarize': prompt = `Provide a concise summary of the following content: "${text}"`; break;
        case 'expand_keywords': prompt = `Identify the most important keywords and key phrases in this text, then naturally weave in additional relevant keywords to improve reach and SEO without making it sound forced. Return only the enhanced text: "${text}"`; break;
        case 'suggest_hashtags': prompt = `Analyze this social media post and generate 10-15 highly relevant, trending hashtags that will maximize reach and engagement. Return ONLY the hashtags as a space-separated list starting with #, nothing else: "${text}"`; break;
        case 'custom': prompt = `Perform the following action on this text: "${context.customPrompt}".\n\nTEXT: "${text}"`; break;
        default: prompt = `Process this text according to the action "${action}": "${text}"`;
    }

    const response = await generateContent({
        model: "gemini-flash-latest",
        contents: prompt
    }, userId);

    return { resultText: response.text ?? '' };
};

export const generateAudiencePersona = async (
    topic: string,
    platform: Platform | undefined,
    userId: string
): Promise<AudiencePersona> => {
    return await generateJson<AudiencePersona>({
        model: "gemini-flash-latest",
        contents: `Create a detailed target audience persona for: "${topic}" on ${platform || 'social media'}. 
        Include: 
        - name, 
        - age (range), 
        - jobTitle, 
        - demographics,
        - goals (array), 
        - painPoints (array),
        - communicationTips (how to talk to them).
        Return as a JSON object.`,
    }, userId);
};

export const generateCalendarSuggestions = async (date: Date | any[], niche?: string, history?: string, userId?: string): Promise<CalendarSuggestion[]> => {
    try {
        let prompt = "";
        if (Array.isArray(date)) {
            prompt = `Analyze this social media content calendar: ${JSON.stringify(date)}. 
            Identify gaps and suggest 3 new strategic dates with high-engagement topics. 
            Return a JSON array of objects. Each object must have: date (YYYY-MM-DD), topic (string), format (string, one of: ${Object.values(GenerationType).join(', ')}), platform (string, one of: ${Object.values(Platform).join(', ')}), strategy (string explaining the reason).`;
        } else {
            const locale = getAppLocale();
            prompt = `Generate 3 creative social media post ideas for ${date.toLocaleDateString(locale)}.
            NICHE: ${niche || 'General'}
            PREVIOUS CONTENT CONTEXT: ${history || 'None'}
            Return a JSON array of objects with exactly these keys:
            - topic: specific, creative post topic (string)
            - format: one of: ${Object.values(GenerationType).join(', ')}
            - platform: one of: ${Object.values(Platform).join(', ')}
            - strategy: brief rationale for virality or hook (string).

            Return ONLY valid JSON. No markdown or conversational text.`;
        }

        return await generateJson<CalendarSuggestion[]>({
            model: "gemini-pro-latest",
            contents: prompt,
        }, userId);
    } catch (e) {
        return [];
    }
};

export const generateIntelligentCalendarPlan = async (goal: string, duration: number, startDate: Date, userId: string): Promise<IntelligentCalendarPlanItem[]> => {
    try {
        return await generateJson<IntelligentCalendarPlanItem[]>({
            model: "gemini-pro-latest",
            contents: `Create an intelligent social media content plan for ${duration} days, starting from ${startDate.toISOString().split('T')[0]}. 
            The goal is: "${goal}". 
            Mix different platforms and formats (post, reel, story). 
            For each item return: id (unique), date, platform, topic, format (one of ${Object.values(GenerationType).join(', ')}), strategy.`,
        }, userId);
    } catch (e) {
        return [{ id: uuidv4(), date: startDate.toISOString().split('T')[0], platform: Platform.Facebook, topic: goal, format: GenerationType.PostWithImage, strategy: "Basic fallback plan" }];
    }
};

export const suggestToneAndStyle = async (topic: string, userId?: string): Promise<StyleSuggestionResult | null> => {
    try {
        return await generateJson<StyleSuggestionResult>({
            model: "gemini-flash-latest",
            contents: `Based on the topic: "${topic}", suggest 4 professional tones and 4 visual style descriptions (lighting, mood, composition) that would work best. 
            Return as { suggestedTones: string[], suggestedVisualStyles: string[] }.`,
        }, userId);
    } catch (e) {
        return { suggestedTones: [], suggestedVisualStyles: [] };
    }
};

export const learnStyleFromFavorites = async (favorites: FavoritePost[], userId: string): Promise<Record<string, unknown>> => {
    try {
        return await generateJson<Record<string, unknown>>({
            model: "gemini-pro-latest",
            contents: `Analyze these high-performing favorite social media posts: ${JSON.stringify(favorites)}. 
            As an expert brand strategist, extract the DNA of this successful content.
            
            Return a JSON object with:
            - brandName (best guess)
            - description (summary of messaging)
            - keywords (list)
            - avoid (what NOT to do)
            - visualStyle (description of imagery/formatting)
            - successPatterns (array of specific techniques found, e.g., "Always starts with a polarising question", "Uses specific emoji at end of lines", "Frequent use of bullet points", "Direct address to 'You'")
            - examplesToFollow (array of 3 short snippets)
            - examplesToAvoid (array of 3 hypothetical traits that would ruin this style)`,
        }, userId);
    } catch (e) {
        return {};
    }
};

export const learnBrandVoiceFromPosts = async (posts: { content?: string; postText?: string; caption?: string }[], userId: string): Promise<Record<string, unknown> | null> => {
    try {
        return await generateJson<Record<string, unknown>>({
            model: "gemini-pro-latest",
            contents: `As an expert brand strategist, analyze the following social media posts:
            
            ${JSON.stringify(posts.slice(0, 20))}
            
            Based on these posts, extract the brand identity. 
            Return a JSON object with:
            - brandName (name of the company/brand)
            - description (2-3 sentences about what the company does and its mission)
            - keywords (comma-separated list of 10 key words/tags)
            - tone (the dominant personality, e.g., Professional, Witty, Casual)
            - examplesToFollow (array of 3 best post snippets from the history)
            - examplesToAvoid (array of 3 hypothetical traits or topics that DON'T fit this brand profile)
            - avoid (comma-separated list of words/topics to avoid)
            - profilesName (a suggested name for this profile, e.g., "Główny profil firmy")`,
        }, userId);
    } catch (e) {
        return null;
    }
};

export const suggestAudioDescriptions = async (topic: string, audience: string, userId?: string): Promise<string[]> => {
    try {
        return await generateJson<string[]>({
            model: "gemini-flash-latest",
            contents: `Suggest 5 background music styles or audio mood descriptions for a video about "${topic}" targeting "${audience}". Return as JSON string array.`,
        }, userId);
    } catch (e) {
        return [];
    }
};

export const executeCommand = async (command: string, userId: string): Promise<{ success: boolean; message: string }> => {
    // This usually involves a function calling loop (Agent)
    return { success: true, message: "Command processed" };
};

export const getCommandFunctionDeclarations = (): FunctionDeclaration[] => [
    { name: 'navigateTo', parameters: { type: Type.OBJECT, properties: { view: { type: Type.STRING, enum: ['generator', 'trends', 'calendar', 'analytics', 'account', 'analyzer', 'storyboard'] } }, required: ['view'] } },
    { name: 'startNewPost', parameters: { type: Type.OBJECT, properties: { topic: { type: Type.STRING }, platform: { type: Type.STRING, enum: Object.values(Platform) } }, required: ['topic', 'platform'] } },
    { name: 'findTrend', parameters: { type: Type.OBJECT, properties: { niche: { type: Type.STRING } }, required: ['niche'] } },
];
