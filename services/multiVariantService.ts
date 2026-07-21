import { generateContent, generateJson } from './apiClient';
import {
    FormData,
    BrandVoiceData,
    AIInsight,
    GenerationType,
    MultiVariantPost,
    CopywritingFramework
} from '../types';
import { buildAntiSlopBlock } from '../prompts/plAntiSlop';
/**
 * Multi-Variant Generation Service
 * Generates 3 variants (A/B/C) of a post with different hooks and approaches
 */

const HOOK_TYPES = [
    { type: 'emotional', name: 'Emocjonalny', description: 'Wywołuje silne emocje, FOMO, aspiracje' },
    { type: 'educational', name: 'Edukacyjny', description: 'Jak-to-zrobić, wskazówki, wartość' },
    { type: 'storytelling', name: 'Storytelling', description: 'Historia, relacja, doświadczenie' },
    { type: 'controversial', name: 'Kontrowersyjny', description: 'Niepopularna opinia, kontrarian' },
    { type: 'curiosity', name: 'Ciekawość', description: 'Gap, cliffhanger, zagadka' },
] as const;

interface GenerateVariantParams {
    formData: FormData;
    brandVoice: BrandVoiceData | null;
    userId: string;
    variant: 'A' | 'B' | 'C';
    hookType: typeof HOOK_TYPES[number]['type'];
    insights?: AIInsight[] | null;
}

async function generateSingleVariant({
    formData,
    brandVoice,
    userId,
    variant,
    hookType,
    insights
}: GenerateVariantParams): Promise<MultiVariantPost> {
    const model = formData.model === "Pro" ? "gemini-pro-latest" : "gemini-2.5-flash";

    const hookDescriptions: Record<typeof hookType, string> = {
        emotional: 'Focus on triggering emotions: FOMO, fear of missing out, aspirations, dreams, frustrations. Use powerful emotional words. Make reader FEEL something immediately.',
        educational: 'Focus on teaching: how-to steps, valuable tips, actionable advice, "secrets", shortcuts. Give immediate value. Position as helpful expert.',
        storytelling: 'Focus on narrative: personal experience, relatable characters, journey from struggle to success. Build connection through authenticity.',
        controversial: 'Focus on contrarian view: challenge common beliefs, share unpopular opinion, create debate. Be bold but respectful.',
        curiosity: 'Focus on curiosity gap: open loop, cliffhanger, mystery, "what happens next", unexpected twist. Make reader need to know more.'
    };

    const contents = `Generate variant ${variant} of a ${formData.platform} post.
TOPIC: ${formData.topic || 'General engaging content'}
TONE: ${formData.tone}
AUDIENCE: ${formData.audience || 'General public'}

HOOK TYPE FOR THIS VARIANT: ${hookType.toUpperCase()}
${hookDescriptions[hookType]}

CRITICAL: Start with a completely different hook than other variants. Make it unique and tailored to the hook type above.`;

    let systemInstruction = `You are an elite social media copywriter specializing in ${hookType} hooks. 

YOUR TASK: Create ONE complete social media post for variant "${variant}".

RULES:
1. Start with a powerful ${hookType} hook in the first 1-2 lines
2. The hook must be completely different from what other variants might use
3. Use the ${hookType} approach throughout the post
4. Keep it authentic and human-sounding
5. Include 3-5 relevant hashtags at the end
6. Add a subtle call-to-action

NEVER ask for more information. Generate the best possible content for this specific hook type.

${buildAntiSlopBlock()}`;

    // Add copywriting framework if selected
    const framework = formData.copywritingFramework;
    if (framework && framework !== CopywritingFramework.Auto) {
        systemInstruction += `\n\nAlso apply this framework: ${framework}`;
    }

    if (brandVoice) {
        systemInstruction += `\n\nFollow this brand voice: ${JSON.stringify(brandVoice)}.`;
    }

    if (insights && insights.length > 0) {
        systemInstruction += `\n\nUse these insights: ${JSON.stringify(insights)}`;
    }

    const data = await generateContent(
        {
            model,
            contents,
            config: { systemInstruction },
            contentLanguage: formData.contentLanguage,
        },
        userId
    );
    const postText = data.text || '';

    // Extract hashtags from the post or generate new ones
    const hashtags = extractHashtags(postText) || generateHashtags(formData.topic, formData.platform);

    // Clean post text (remove hashtags from main text if they're at the end)
    const cleanPostText = cleanPostFromHashtags(postText);

    return {
        variant,
        hookType,
        postText: cleanPostText,
        hashtags,
        predictedEngagement: predictEngagement(hookType, cleanPostText),
        whyItWorks: generateWhyItWorks(hookType, cleanPostText)
    };
}

export async function generateMultiVariants(
    formData: FormData,
    brandVoice: BrandVoiceData | null,
    userId: string,
    insights?: AIInsight[] | null
): Promise<MultiVariantPost[]> {
    // Assign hook types for A, B, C variants
    const variantConfigs: { variant: 'A' | 'B' | 'C'; hookType: typeof HOOK_TYPES[number]['type'] }[] = [
        { variant: 'A', hookType: 'emotional' },
        { variant: 'B', hookType: 'educational' },
        { variant: 'C', hookType: 'curiosity' }
    ];

    // If there's a specific copywriting framework, adjust hook assignments
    if (formData.copywritingFramework === CopywritingFramework.Storytelling) {
        variantConfigs[2].hookType = 'storytelling';
    } else if (formData.copywritingFramework === CopywritingFramework.HookStoryOffer) {
        variantConfigs[0].hookType = 'storytelling';
    }

    // Generate all 3 variants in parallel
    const variants = await Promise.all(
        variantConfigs.map(config =>
            generateSingleVariant({
                formData,
                brandVoice,
                userId,
                variant: config.variant,
                hookType: config.hookType,
                insights
            })
        )
    );

    return variants;
}

function extractHashtags(text: string): string[] {
    const hashtagRegex = /#\w+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.slice(0, 5) : [];
}

function generateHashtags(topic: string, platform: string): string[] {
    const baseTags = topic.toLowerCase().split(' ').slice(0, 3);
    const platformTags: Record<string, string[]> = {
        'Instagram': ['#instagood', '#instadaily'],
        'TikTok': ['#fyp', '#viral'],
        'LinkedIn': ['#business', '#leadership'],
        'X': ['#trending'],
        'Facebook': ['#community'],
        'YouTube': ['#youtube']
    };
    
    return [
        ...baseTags.map(t => `#${t}`),
        ...(platformTags[platform] || [])
    ].slice(0, 5);
}

function cleanPostFromHashtags(text: string): string {
    // Remove hashtags from the end of the post
    const lines = text.split('\n');
    while (lines.length > 0 && lines[lines.length - 1].trim().startsWith('#')) {
        lines.pop();
    }
    return lines.join('\n').trim();
}

function predictEngagement(hookType: string, postText: string): 'high' | 'medium' | 'low' {
    const highEngagementMarkers = ['?', '!', 'jak', 'dlaczego', 'secret', 'protip', '⚡', '🔥', '💡'];
    const text = postText.toLowerCase();
    
    const score = highEngagementMarkers.filter(m => text.includes(m)).length;
    
    if (hookType === 'emotional' || hookType === 'curiosity') {
        return score >= 2 ? 'high' : 'medium';
    }
    
    return score >= 3 ? 'high' : score >= 1 ? 'medium' : 'low';
}

function generateWhyItWorks(hookType: string, postText: string): string {
    const explanations: Record<string, string> = {
        emotional: 'Emocjonalny hook wywołuje natychmiastową reakcję. Ludzie dzielą treści, które czują.',
        educational: 'Edukacyjna wartość = zaangażowanie. Ludzie zapisują i udostępniają przydatne porady.',
        storytelling: 'Historie budują połączenie. Autentyczność = zaufanie = konwersja.',
        controversial: 'Kontrowersja = dyskusja = zasięg organiczny. Ale wymaga balansu.',
        curiosity: 'Luki w wiedzy (curiosity gaps) zmuszają do czytania do końca.'
    };
    
    return explanations[hookType] || 'Ten wariant testuje inną strategię przekazu.';
}

export { HOOK_TYPES };
export default generateMultiVariants;
