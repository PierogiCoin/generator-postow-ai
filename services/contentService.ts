import { clearQuotaDepleted } from '../utils/chunkReload';
import { getApiBaseUrl, generateContent, generateJson, applyAiLanguage } from './apiClient';
import { generateImages } from './mediaService';
import {
    FormData,
    GenerationResult,
    BrandVoiceData,
    AIInsight,
    GenerationType,
    Platform,
    OmnichannelPost,
    PerformancePrediction,
    CopywritingFramework,
    VisualStyle,
} from '../types';
import {
    buildPlatformImagePrompt,
    resolveAspectRatioForPlatform,
} from '../utils/platformVisualSpec';


/**
 * Content Service
 * Core generation for social media posts, streaming, and feedback
 */

export async function* generateSocialMediaContentStream(
    formData: FormData,
    brandVoice: BrandVoiceData | null,
    userId: string,
    insights?: AIInsight[] | null,
    signal?: AbortSignal
): AsyncGenerator<string> {
    let visualVibe: string | undefined;
    const model = formData.model === "Pro" ? "gemini-pro-latest" : "gemini-flash-lite-latest";

    const contents = `Generate an engaging ${formData.platform} post. 
TOPIC: ${formData.topic || 'General engaging content'}
TONE: ${formData.tone}
AUDIENCE: ${formData.audience || 'General public'}

CRITICAL: Do not ask for more information. Do not respond conversationally. Provide ONLY the post content.`;

    const currentDateStr = new Date().toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' });
    let systemInstruction = `You are an elite social media growth expert. Your task is to generate high-converting, creative, and human-like social media content.
CURRENT DATE: ${currentDateStr} (Ensure any temporal references, years, or dates in the post align with this date. Never reference outdated years like 2024 or 2025 unless explicitly asked to describe past events).
CRITICAL STYLE REQUIREMENT: Avoid generic AI-sounding clichés, placeholders, and introductory fluff.
NEVER use the following phrases or their variations:
- "In today's fast-paced/dynamic digital world..." (or "W dzisiejszym dynamicznym świecie...")
- "Have you ever wondered..." (or "Czy kiedykolwiek zastanawiałeś się...")
- "It is important to remember/bear in mind..." (or "Warto pamiętać...")
- "Key to success is..." (or "Klucz do sukcesu tkwi w...")
- "Look no further..." (or "Nie szukaj dalej...")
- "Here is/are..." (or "Oto...") when introducing lists.
Focus on strong, immediate emotional hooks, concrete examples, active verbs, and highly readable, mobile-friendly spacing (max 2-3 sentences per paragraph).`;

    const platformInstructions: Record<string, string> = {
        [Platform.Facebook]: `
FACEBOOK STYLE GUIDELINES:
- Write in a friendly, conversational, and community-oriented tone.
- Keep the structure highly readable with short paragraphs and spacing.
- Include an engaging question at the end to prompt discussions and comments.
- Use a moderate amount of emojis (3-6 max).`,

        [Platform.Instagram]: `
INSTAGRAM STYLE GUIDELINES:
- The very first line MUST be an extremely compelling hook that forces the user to click "...more".
- Move hashtags to the very bottom, separating them from the main copy by 4-5 empty lines or dots (e.g., ".").
- Use spacing to make lists readable. Tone should be visually evoking, lifestyle-focused, or inspiring.`,

        [Platform.LinkedIn]: `
LINKEDIN STYLE GUIDELINES:
- Write in an expert, professional, yet conversational and authentic tone.
- Avoid corporate jargon or excessive corporate fluff.
- Use mobile-friendly layouts: maximum 1-2 sentences per line/paragraph.
- Use bullet points or numbered lists to structure complex ideas.
- Include a "Key Takeaway" or action step at the end.
- CRITICAL: Keep emojis to an absolute minimum (maximum 3 in the entire post).`,

        [Platform.X]: `
X (TWITTER) STYLE GUIDELINES:
- Be highly concise, punchy, and direct. Skip introductions entirely.
- Hook in the very first sentence. Use bold claims, contrarian views, or stats.
- Keep it strictly within the character limit. Use at most 1 relevant hashtag at the end (or none).`,

        [Platform.TikTok]: `
TIKTOK STYLE GUIDELINES:
- Write in an energetic, informal, speaking-oriented verbal format.
- Include suggested overlay text captions in brackets [like this] that should appear on screen.
- Focus on short, fast-paced setups.`,

        [Platform.YouTube]: `
YOUTUBE STYLE GUIDELINES:
- Focus on searchability and hooks.
- Write a compelling description layout: brief hook, timestamp indicators, and call to action.`
    };

    if (platformInstructions[formData.platform]) {
        systemInstruction += platformInstructions[formData.platform];
    }

    // Apply copywriting framework if selected
    const framework = formData.copywritingFramework;
    if (framework && framework !== CopywritingFramework.Auto) {
        const frameworkInstructions: Record<CopywritingFramework, string> = {
            [CopywritingFramework.PAS]: `STRUCTURE - Use PAS Framework:
1. PROBLEM: Start with a relatable pain point that resonates with the audience. Be specific and empathetic.
2. AGITATION: Amplify the emotions around this problem. Make the reader feel the urgency and discomfort.
3. SOLUTION: Present the solution clearly. Show transformation and relief. End with a strong CTA.`,

            [CopywritingFramework.AIDA]: `STRUCTURE - Use AIDA Framework:
1. ATTENTION: Hook with a bold statement, question, or curiosity gap in first 2 lines.
2. INTEREST: Build interest with relevant facts, benefits, or intriguing details.
3. DESIRE: Create desire by painting a picture of the outcome/benefits. Use emotional language.
4. ACTION: Strong, clear call-to-action that creates urgency.`,

            [CopywritingFramework.Storytelling]: `STRUCTURE - Use Storytelling Framework:
1. SETUP: Establish the scene and characters. Create immediate relatability.
2. CONFLICT: Present the challenge or struggle. Build tension.
3. CLIMAX: The turning point or moment of realization.
4. RESOLUTION: How it all turned out. The lesson learned.
5. BRIDGE: Connect story to reader's life and include soft CTA.`,

            [CopywritingFramework.HookStoryOffer]: `STRUCTURE - Use Hook-Story-Offer Framework:
1. HOOK: Pattern interrupt. Something that stops the scroll (contrarian, curiosity, or bold claim).
2. STORY: Brief, engaging narrative that supports the hook. Personal or relatable.
3. OFFER: The value proposition. What they'll get/how this helps them.
4. CTA: Simple next step.`,

            [CopywritingFramework.ProblemAgitateSolve]: `STRUCTURE - Use Problem-Agitate-Solve:
1. PROBLEM: Identify a specific pain point your audience faces daily.
2. AGITATE: Describe the worst-case scenario if this continues. Use vivid, emotional language.
3. SOLVE: Present your solution as the obvious relief. Show before/after contrast.
4. PROOF: Add credibility (stats, testimonials, or logic).`,

            [CopywritingFramework.BeforeAfterBridge]: `STRUCTURE - Use Before-After-Bridge:
1. BEFORE: Paint the picture of current struggle/frustration. Make it visceral.
2. AFTER: Describe the ideal outcome. How life looks when problem is solved.
3. BRIDGE: How to get from Before to After. The method/tool/solution.
4. CTA: Invite them to take the first step on the bridge.`,

            [CopywritingFramework.FeatureBenefit]: `STRUCTURE - Use Feature-Benefit-Outcome:
1. HOOK: Catch attention with the main feature.
2. FEATURE: What it is (the specs/functionality).
3. BENEFIT: What it does for them (immediate value).
4. OUTCOME: The transformation in their life/business (emotional payoff).
5. CTA: Encourage them to experience the outcome.`,

            [CopywritingFramework.Auto]: ''
        };
        
        systemInstruction += `\n\n${frameworkInstructions[framework]}`;
    }

    if (brandVoice) {
        systemInstruction += ` Follow this brand voice: ${JSON.stringify(brandVoice)}.`;
        if (brandVoice.successPatterns && brandVoice.successPatterns.length > 0) {
            systemInstruction += ` CRITICAL: Replicate these specific success patterns that worked for this brand: ${brandVoice.successPatterns.join(", ")}.`;
        }

        // Branding Assets Implementation
        if (formData.includeLogo && brandVoice.logoUrl) {
            systemInstruction += ` \nBRANDING: Make sure to mention or leave space for the brand logo (URL: ${brandVoice.logoUrl}). Describe how it should be positioned.`;
        }

        if (formData.useMascot === true && brandVoice.mascotDescription) {
            systemInstruction += ` \nMASCOT: YOU MUST INCLUDE the brand mascot "${brandVoice.mascotName || 'the mascot'}" in this post. Mascot description: "${brandVoice.mascotDescription}". URL: ${brandVoice.mascotUrl || 'N/A'}. Explain how the mascot interacts with the content.`;
        } else if (formData.useMascot === "auto" && brandVoice.mascotDescription) {
            systemInstruction += ` \nMASCOT SUGGESTION: The brand has a mascot "${brandVoice.mascotName || 'the mascot'}" (${brandVoice.mascotDescription}). Decide if including the mascot would increase engagement for this specific topic. If yes, incorporate it creatively.`;
        }
    }
    if (insights && insights.length > 0) {
        systemInstruction += ` Use these high-performance insights retrieved from analytics: ${JSON.stringify(insights)}. Focus on "positive" insights to replicate success.`;

        const postMortemInsight = insights.find(i => (i as any).textTemplateSuggestion || (i as any).imagePromptSuggestion);
        if (postMortemInsight) {
            if ((postMortemInsight as any).textTemplateSuggestion) {
                systemInstruction += ` CRITICAL: Follow this proven text template that worked best for this brand: "${(postMortemInsight as any).textTemplateSuggestion}".`;
            }
        }
    }

    if (formData.repurposeFrom) {
        if (formData.generationType === GenerationType.SeriesFollowUp) {
            systemInstruction += ` \nSERIES MODE: You are creating a follow-up. Build upon this previous post: "${formData.repurposeFrom}". Reference its key points if appropriate to create a narrative journey.`;
        } else if (formData.topic.includes("Odśwież ten post")) {
            systemInstruction += ` \nRECYCLE MODE: Refresh this high-performing post: "${formData.repurposeFrom}". Maintain its core "vibe" but update the hook and context for today.`;
        } else {
            systemInstruction += ` \nREPURPOSE MODE: Adapt this content for ${formData.platform}: "${formData.repurposeFrom}".`;
        }
    } else if (insights && insights.length > 0) {
        // If we have insights but no specific repurpose, we can look at the "Previous Context" if provided via insights
        const contextStr = insights.find(i => i.category === "context")?.text;
        if (contextStr) systemInstruction += ` \nCONTEXT ECHO: Your previous related post was about: "${contextStr}". Ensure this new post feels like a natural next step in the brand's story.`;
    }

    if (formData.repurposeImageFrom) {
        try {
            // Analizujemy "vibe" obrazu, aby dostosować tekst
            const { analyzeImage } = await import('./mediaService');
            let base64: string;
            let mimeType: string;

            if (formData.repurposeImageFrom.startsWith('data:')) {
                const [header, data] = formData.repurposeImageFrom.split(',');
                base64 = data;
                mimeType = header.split(':')[1]?.split(';')[0] || "image/jpeg";
            } else {
                const imgResponse = await fetch(formData.repurposeImageFrom);
                const blob = await imgResponse.blob();
                mimeType = blob.type;
                const reader = new FileReader();
                base64 = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(blob);
                });
            }

            visualVibe = await analyzeImage(base64, mimeType, "Describe the visual style, mood, colors, and overall 'vibe' of this image in 2 sentences. Focus on things that help create similar content.", userId);
            systemInstruction += ` The visual style of the inspiration image is: "${visualVibe}". Ensure the text content complements this visual style and maintains the same professional/artistic mood.`;
        } catch (e) {
        }
    }

    const streamResponse = await fetch(`${getApiBaseUrl()}/api/generate-content-stream`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-user-id": userId,
            "x-app-language": formData.contentLanguage,
        },
        credentials: "include",
        signal,
        body: JSON.stringify(
            applyAiLanguage({
                model,
                contents,
                config: { systemInstruction },
                contentLanguage: formData.contentLanguage,
            })
        ),
    });

    if (!streamResponse.ok) {
        let errMsg = `Błąd API (${streamResponse.status})`;
        try {
            const errBody = await streamResponse.json();
            errMsg = errBody.message || errMsg;
        } catch { /* ignore */ }
        const err = new Error(errMsg) as Error & { status?: number; code?: string };
        err.status = streamResponse.status;
        throw err;
    }

    const reader = streamResponse.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error("Nie można uzyskać strumienia.");

    let buffer = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split("\n\n");
        buffer = messages.pop() || "";

        for (const message of messages) {
            if (message.startsWith("data: ")) {
                let chunk: { text?: string; error?: string; code?: string; event?: string };
                try {
                    chunk = JSON.parse(message.substring(6));
                } catch {
                    continue;
                }
                if (chunk.error) {
                    const err = new Error(chunk.error) as Error & { code?: string };
                    if (chunk.code) err.code = chunk.code;
                    if (chunk.code === 'GEMINI_QUOTA_EXCEEDED') {
                        const { markQuotaDepleted } = await import('../utils/chunkReload');
                        markQuotaDepleted();
                    }
                    throw err;
                }
                if (chunk.event === "done") {
                    clearQuotaDepleted();
                    if (visualVibe) yield `__VISUAL_VIBE__:${visualVibe}`;
                    return;
                }
                yield chunk.text || "";
            }
        }
    }
    if (visualVibe) yield `__VISUAL_VIBE__:${visualVibe}`;
    clearQuotaDepleted();
}

export const regenerateWithFeedback = async (originalText: string, feedback: string, userId?: string): Promise<string> => {
    const prompt = `Based on this previous version: "${originalText}", apply this feedback: "${feedback}". Rewrite to be better.`;
    const response = await generateContent({
        model: "gemini-flash-latest",
        contents: prompt
    }, userId);
    return response.text;
}

export const generatePostDetails = async (
    postText: string,
    formData: FormData,
    brandVoice: BrandVoiceData | null,
    userId: string,
    visualVibe?: string,
    insights?: AIInsight[] | null
): Promise<Partial<GenerationResult>> => {

    // YouTube specific
    if (formData.platform === Platform.YouTube) {
        try {
            return await generateJson<Partial<GenerationResult>>({
                model: "gemini-flash-latest",
                contents: `For this YouTube script: "${postText.substring(0, 500)}", generate catchy videoTitle, SEO videoDescription, and hashtags [array].`,
            }, userId);
        } catch (e) {
            return { hashtags: [] };
        }
    }

    // Post with Image or AB Test
    if (formData.generationType === GenerationType.PostWithImage || formData.generationType === GenerationType.ABTest) {
        // Image generation
        let imageStyle = formData.visualStyle || 'modern';

        // Add brand visual style if active
        if (brandVoice?.visualStyle) {
            imageStyle = `${brandVoice.visualStyle}, ${imageStyle}`;
        }

        let mascotPrompt: string | undefined;
        if (formData.useMascot === true && brandVoice?.mascotDescription) {
            mascotPrompt = `FEATURED MASCOT: You MUST include the brand mascot "${brandVoice.mascotName || 'the mascot'}" in this image. Description: ${brandVoice.mascotDescription}.`;
        } else if (formData.useMascot === "auto" && brandVoice?.mascotDescription && postText.toLowerCase().includes((brandVoice.mascotName || 'maskotka').toLowerCase())) {
            mascotPrompt = `FEATURED MASCOT: The user mentioned the mascot. Include it: ${brandVoice.mascotDescription}.`;
        }

        const postMortemImageHint = insights?.find((i: any) => i.imagePromptSuggestion);
        const imagePrompt = buildPlatformImagePrompt({
            postText,
            platform: formData.platform,
            imageStyle,
            visualVibe,
            mascotPrompt,
            postMortemHint: postMortemImageHint
                ? (postMortemImageHint as AIInsight & { imagePromptSuggestion?: string }).imagePromptSuggestion
                : undefined,
        });

        const aspectRatio = resolveAspectRatioForPlatform(
            formData.platform,
            formData.aspectRatio,
            formData.visualStyle as VisualStyle
        );

        const imageResponse = await generateImages(imagePrompt, { aspectRatio }, userId).catch(() => null);
        if (!imageResponse) {
            try {
                const details = await generateJson<any>({
                    model: "gemini-flash-lite-latest",
                    contents: `For the following social media post, generate:
                    - 10 relevant hashtags [array]
                    - adHeadline (short, punchy)
                    - callToAction (persuasive)
                    - suggestedPostingTime (specific time like "18:30")
                    - visualStrategyTips (advice on visuals)
                    
                    POST TEXT: "${postText.substring(0, 500)}"
                    PLATFORM: ${formData.platform}
                    AUDIENCE: ${formData.audience}

                    CRITICAL: Return ONLY valid JSON.`,
                }, userId);
                return { ...details };
            } catch {
                return { hashtags: [] };
            }
        }

        const imageUrl = imageResponse.publicUrls?.[0] || `data:image/jpeg;base64,${imageResponse.generatedImages?.[0]?.image?.imageBytes ?? ""}`;

        try {
            const details = await generateJson<any>({
                model: "gemini-flash-lite-latest",
                contents: `For the following social media post, generate:
                - 10 relevant hashtags [array]
                - adHeadline (short, punchy)
                - callToAction (persuasive)
                - suggestedPostingTime (specific time like "18:30" based on typical ${formData.platform} peak for this topic/audience)
                - visualStrategyTips (advice on what kind of photo or graphic would work best, e.g. "Bright colors, close-up of a smiling face")
                
                POST TEXT: "${postText.substring(0, 500)}"
                PLATFORM: ${formData.platform}
                AUDIENCE: ${formData.audience}

                CRITICAL: Return ONLY valid JSON.`,
            }, userId);
            return { imageUrl, ...details };

        } catch (e) {
            return { imageUrl, hashtags: [] };
        }
    }

    return { hashtags: await suggestHashtags(postText, formData.platform, userId) };
};

export const suggestHashtags = async (postText: string, platform: Platform, userId: string): Promise<string[]> => {
    try {
        return await generateJson<string[]>({
            model: "gemini-flash-latest",
            contents: `Suggest 10 relevant hashtags for this ${platform} post: "${postText.substring(0, 300)}". Return as array of strings.`,
        }, userId);
    } catch (e) {
        return [];
    }
};

export const repurposeContent = async (text: string, newPlatform: Platform, userId: string): Promise<string> => {
    const response = await generateContent({
        model: "gemini-pro-latest",
        contents: `Repurpose this content for ${newPlatform}: "${text}". Adapt format and tone.`,
    }, userId);
    return response.text;
};

export const generateABTestVariations = async (formData: FormData, brandVoice: BrandVoiceData | null, userId: string): Promise<[Partial<GenerationResult>, Partial<GenerationResult>]> => {
    const prompt = `Generate two distinct versions (Variant A and Variant B) for a ${formData.platform} post about: "${formData.topic}".
    TONE: ${formData.tone}
    AUDIENCE: ${formData.audience}
    KEYWORDS: ${formData.keywords}
    
    Variant A should focus on: Emotional appeal and benefits.
    Variant B should focus on: Direct facts and call to action.
    
    Return as JSON with structure: { variantA: { postText: string }, variantB: { postText: string } }`;

    const response = await generateJson<{ variantA: { postText: string }, variantB: { postText: string } }>({
        model: "gemini-flash-latest",
        contents: prompt
    }, userId);

    return [
        { id: 'variant-a', postText: response.variantA.postText },
        { id: 'variant-b', postText: response.variantB.postText }
    ];
};

export const generateHookVariations = async (postText: string, userId: string): Promise<string[]> => {
    try {
        const response = await generateJson<string[]>({
            model: "gemini-flash-latest",
            contents: `Based on this social media post: "${postText.substring(0, 500)}", generate 4 alternative, highly engaging opening sentences (hooks). 
            Each hook should have a different angle (e.g., curious, controversial, beneficial, storyteller).
            Return ONLY a JSON array of strings.`,
        }, userId);
        return response;
    } catch (e) {
        return [];
    }
};

export const generateOmnichannelPosts = async (formData: FormData, brandVoice: BrandVoiceData | null, userId: string): Promise<OmnichannelPost[]> => {
    const platforms = formData.selectedPlatforms || [Platform.Facebook, Platform.Instagram, Platform.LinkedIn, Platform.X];

    try {
        const response = await generateJson<{ posts: OmnichannelPost[] }>({
            model: "gemini-flash-latest",
            contents: `Generate simultaneous high-engagement social media posts for multiple platforms about: "${formData.topic}".
            TARGET AUDIENCE: ${formData.audience}
            TONE: ${formData.tone}
            PLATFORMS: ${platforms.join(', ')}
            
            Each post MUST be perfectly adapted to its platform's style and character limits.
            Include hashtags for each platform.
            
            Return JSON in this format:
            {
              "posts": [
                { "platform": "PlatformName", "postText": "content...", "hashtags": ["#tag1", "#tag2"] }
              ]
            }`,
        }, userId);
        return response.posts;
    } catch (e) {
        return [];
    }
};
