import { API_BASE_URL, generateContent, generateJson } from './apiClient';
import { generateImages } from './mediaService';
import {
    FormData,
    GenerationResult,
    BrandVoiceData,
    AIInsight,
    GenerationType,
    Platform,
    OmnichannelPost,
    PerformancePrediction
} from '../types';


/**
 * Content Service
 * Core generation for social media posts, streaming, and feedback
 */

export async function* generateSocialMediaContentStream(
    formData: FormData,
    brandVoice: BrandVoiceData | null,
    userId: string,
    insights?: AIInsight[] | null
): AsyncGenerator<string> {
    const model = formData.model === "Pro" ? "gemini-pro-latest" : "gemini-flash-latest";

    const contents = `Generate an engaging ${formData.platform} post. 
TOPIC: ${formData.topic || 'General engaging content'}
TONE: ${formData.tone}
AUDIENCE: ${formData.audience || 'General public'}

CRITICAL: Do not ask for more information. Do not respond conversationally. Provide ONLY the post content.`;

    let systemInstruction = "You are an elite social media growth expert. Your task is to generate high-converting, creative, and human-like social media content. Avoid generic AI-sounding phrases. Focus on strong emotional hooks, storytelling, and high-engagement structures (e.g., specific lists, paradoxical advice, or relatable 'POV' scenarios). NEVER ask the user for more information; if the prompt is vague, use your creativity to provide the absolute best possible content for the given topic.";
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
    if (insights && insights.length > 0) systemInstruction += ` Use these high-performance insights retrieved from analytics: ${JSON.stringify(insights)}. Focus on "positive" insights to replicate success.`;

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

            const visualAnalysis = await analyzeImage(base64, mimeType, "Describe the visual style, mood, colors, and overall 'vibe' of this image in 2 sentences. Focus on things that help create similar content.", userId);
            systemInstruction += ` The visual style of the inspiration image is: "${visualAnalysis}". Ensure the text content complements this visual style and maintains the same professional/artistic mood.`;
            (formData as any)._visualVibe = visualAnalysis; // Przekazujemy dalej do generowania obrazu
        } catch (e) {
            console.error("Visual analysis failed:", e);
        }
    }

    const streamResponse = await fetch(`${API_BASE_URL}/api/generate-content-stream`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-user-id": userId,
        },
        credentials: "include",
        body: JSON.stringify({
            model,
            contents,
            config: { systemInstruction },
        })
    });

    if (!streamResponse.ok) {
        throw new Error(`Błąd API (${streamResponse.status})`);
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
                try {
                    const chunk = JSON.parse(message.substring(6));
                    if (chunk.event === "done") return;
                    yield chunk.text || "";
                } catch (e) {
                    // Ignore malformed chunks
                }
            }
        }
    }
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
    userId: string
): Promise<Partial<GenerationResult>> => {

    // YouTube specific
    if (formData.platform === Platform.YouTube) {
        try {
            return await generateJson<Partial<GenerationResult>>({
                model: "gemini-flash-latest",
                contents: `For this YouTube script: "${postText.substring(0, 500)}", generate catchy videoTitle, SEO videoDescription, and hashtags [array].`,
            }, userId);
        } catch (e) {
            console.error("YouTube details generation failed:", e);
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

        let imagePrompt = `High quality social media photo for: "${postText.substring(0, 200)}". Style: ${imageStyle}.`;

        if (formData.useMascot === true && brandVoice?.mascotDescription) {
            imagePrompt += ` \nFEATURED MASCOT: You MUST include the brand mascot "${brandVoice.mascotName || 'the mascot'}" in this image. Description: ${brandVoice.mascotDescription}.`;
        } else if (formData.useMascot === "auto" && brandVoice?.mascotDescription && postText.toLowerCase().includes((brandVoice.mascotName || 'maskotka').toLowerCase())) {
            imagePrompt += ` \nFEATURED MASCOT: The user mentioned the mascot. Include it: ${brandVoice.mascotDescription}.`;
        }

        if ((formData as any)._visualVibe) {
            imagePrompt += ` Maintain the following visual style: ${(formData as any)._visualVibe}.`;
        }

        const imageResponse = await generateImages(imagePrompt, { aspectRatio: formData.aspectRatio || "1:1" }, userId);
        const imageUrl = imageResponse.publicUrls?.[0] || `data:image/jpeg;base64,${imageResponse.generatedImages?.[0]?.image?.imageBytes ?? ""}`;

        try {
            const details = await generateJson<any>({
                model: "gemini-flash-latest",
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
            console.error("Post details generation failed:", e);
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
        console.error("Hook variations failed:", e);
        return [];
    }
};

export const generateOmnichannelPosts = async (formData: FormData, brandVoice: BrandVoiceData | null, userId: string): Promise<OmnichannelPost[]> => {
    const platforms = (formData as any).selectedPlatforms || [Platform.Facebook, Platform.Instagram, Platform.LinkedIn, Platform.X];

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
        console.error("Omnichannel generation failed:", e);
        return [];
    }
};
