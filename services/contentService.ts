import { clearQuotaDepleted } from '../utils/chunkReload';
import { getApiBaseUrl, generateContent, generateJson, applyAiLanguage, getApiAuthHeaders, callApi } from './apiClient';
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
} from '../types';
import { normalizeCtaUrl } from '../utils/publishCaption';
import { buildAntiSlopBlock } from '../prompts/plAntiSlop';
import {
  formatNicheSystemInstruction,
  formatNicheUserPromptLines,
  resolveNicheContext,
} from '../utils/nicheContext';
import { composeTextPrompt } from './promptBuilders';
import { buildImageGenerationInput } from './imagePromptBuilder';
import {
  DEFAULT_FAST_MODEL,
  DEFAULT_LITE_MODEL,
  DEFAULT_PRO_MODEL,
  DEFAULT_TEXT_MODEL,
  QUALITY_GATE_THRESHOLD,
} from '../shared/config/generationConfig';
import type { ContentScore } from '../shared/contentScore';

function attachBrandCtaUrl(
    details: Record<string, unknown>,
    brandVoice: BrandVoiceData | null
): { ctaUrl?: string } {
    if (details.ctaUrl && typeof details.ctaUrl === 'string') {
        const normalized = normalizeCtaUrl(details.ctaUrl);
        return normalized ? { ctaUrl: normalized } : {};
    }
    const fromBrand = normalizeCtaUrl(brandVoice?.websiteUrl);
    return fromBrand ? { ctaUrl: fromBrand } : {};
}

function logNonBlockingError(scope: string, error: unknown, meta?: Record<string, unknown>) {
    console.warn(`[contentService] ${scope}`, {
        error: error instanceof Error ? error.message : String(error),
        ...(meta || {}),
    });
}

export interface QualityGateResult {
    text: string;
    score: ContentScore;
    retried: boolean;
}

/**
 * Auto-evaluate generated content and attempt one rewrite if quality is below threshold.
 */
export async function scoreAndImprovePost(
    postText: string,
    formData: FormData,
    brandVoice: BrandVoiceData | null,
    userId: string
): Promise<QualityGateResult> {
    const enabled = formData.enableQualityGate !== false;
    if (!enabled || postText.trim().length < 20) {
        return {
            text: postText,
            score: {
                overall: 0,
                engagement: { score: 0, level: 'low', feedback: [] },
                seo: { score: 0, level: 'low', feedback: [] },
                platformFit: { score: 0, level: 'poor', feedback: [] },
                suggestions: ['Quality gate disabled or content too short to score.'],
                badge: 'yellow',
            },
            retried: false,
        };
    }

    async function score(text: string): Promise<ContentScore> {
        try {
            const response = await callApi(
                'score-content',
                {
                    content: text,
                    platform: formData.platform,
                    context: {
                        targetAudience: formData.audience,
                        hasHashtags: text.includes('#'),
                        hasEmojis: /[\u{1F600}-\u{1F64F}]/u.test(text),
                    },
                },
                userId
            );
            return (response?.score as ContentScore) || fallbackScore(text, formData.platform);
        } catch (error: unknown) {
            logNonBlockingError('Quality gate scoring failed', error, { platform: formData.platform });
            return fallbackScore(text, formData.platform);
        }
    }

    let currentText = postText;
    let currentScore = await score(currentText);

    if (currentScore.overall >= QUALITY_GATE_THRESHOLD) {
        return { text: currentText, score: currentScore, retried: false };
    }

    // One auto-retry with scoring feedback
    const feedbackLines = [
        ...currentScore.suggestions,
        ...currentScore.engagement.feedback,
        ...currentScore.seo.feedback,
        ...currentScore.platformFit.feedback,
    ];
    const feedback = feedbackLines.length
        ? feedbackLines.join('\n- ')
        : 'Improve clarity, hook strength, and platform fit.';

    try {
        const { contents, config } = await composeTextPrompt({
            formData,
            brandVoice,
            userId,
        });

        const rewritePrompt = `${contents}

QUALITY GATE REWRITE:
The previous version scored ${currentScore.overall}/100 for ${formData.platform}. Improve the post based on this feedback:
- ${feedback}

Return ONLY the rewritten post text — no commentary, no markdown.`;

        const rewriteResponse = await generateContent({
            model: DEFAULT_FAST_MODEL,
            contents: rewritePrompt,
            config,
        }, userId);

        const rewrittenText = rewriteResponse.text?.trim() || currentText;
        if (rewrittenText.length >= 20 && rewrittenText !== currentText) {
            const newScore = await score(rewrittenText);
            return {
                text: rewrittenText,
                score: newScore,
                retried: true,
            };
        }
    } catch (error: unknown) {
        logNonBlockingError('Quality gate rewrite failed — keeping original', error, {
            platform: formData.platform,
        });
    }

    return { text: currentText, score: currentScore, retried: false };
}

function fallbackScore(content: string, platform: string): ContentScore {
    const length = content.length;
    const hasEmojis = /[\u{1F600}-\u{1F64F}]/u.test(content);
    const hasHashtags = content.includes('#');
    const hasQuestion = content.includes('?');
    const hasCTA = /\b(klik|sprawdź|zobacz|download|kupić|dołącz|zapisz|link)\b/i.test(content);

    let score = 50;
    if (platform === 'TikTok' && length < 150) score += 10;
    if (platform === 'LinkedIn' && length > 200 && length < 600) score += 10;
    if (platform === 'Twitter' && length < 280) score += 10;
    if (hasEmojis) score += 5;
    if (hasHashtags) score += 5;
    if (hasQuestion) score += 10;
    if (hasCTA) score += 10;

    return {
        overall: Math.min(score, 100),
        engagement: { score: Math.min(score, 100), level: score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low', feedback: [] },
        seo: { score: Math.min(score, 100), level: score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low', feedback: [] },
        platformFit: { score: Math.min(score, 100), level: score >= 70 ? 'excellent' : score >= 50 ? 'good' : 'poor', feedback: [] },
        suggestions: ['Automatic scoring unavailable'],
        badge: score >= 70 ? 'green' : score >= 50 ? 'yellow' : 'red',
    };
}


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
    const model = formData.model === "Pro" ? DEFAULT_PRO_MODEL : DEFAULT_TEXT_MODEL;

    const nicheCtx = resolveNicheContext({ userId, brandVoice, audience: formData.audience });

    const { contents, config: { systemInstruction } } = await composeTextPrompt({
        formData,
        brandVoice,
        userId,
        insights,
    });

    if (formData.repurposeImageFrom) {
        try {
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
        } catch (error: unknown) {
            logNonBlockingError('Repurpose image analysis failed — continuing without visual vibe', error, {
                platform: formData.platform,
            });
        }
    }

    const effectiveContents = visualVibe
        ? `${contents}\n\nVISUAL INSPIRATION: The visual style of the inspiration image is: "${visualVibe}". Ensure the text content complements this visual style and maintains the same professional/artistic mood.`
        : contents;

    const streamAuthHeaders = await getApiAuthHeaders(userId);
    const streamResponse = await fetch(`${getApiBaseUrl()}/api/generate-content-stream`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-app-language": formData.contentLanguage,
            ...streamAuthHeaders,
        },
        credentials: "include",
        signal,
        body: JSON.stringify(
            applyAiLanguage({
                model,
                contents: effectiveContents,
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
        } catch (error: unknown) {
            logNonBlockingError('Failed to parse stream error body', error, {
                status: streamResponse.status,
            });
        }
        const err = new Error(errMsg) as Error & { status?: number; code?: string };
        err.status = streamResponse.status;
        if (streamResponse.status === 402) err.code = 'insufficient_credits';
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
                } catch (error: unknown) {
                    logNonBlockingError('Invalid SSE chunk JSON skipped', error);
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
    const prompt = `Based on this previous version: "${originalText}", apply this feedback: "${feedback}". Rewrite to be better.

${buildAntiSlopBlock()}

Return ONLY the rewritten post text.`;
    const response = await generateContent({
        model: DEFAULT_FAST_MODEL,
        contents: prompt
    }, userId);
    const { enforceAntiSlopText } = await import('./antiSlopService');
    const cleaned = await enforceAntiSlopText(response.text ?? '', userId);
    return cleaned.text;
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
                model: DEFAULT_FAST_MODEL,
                contents: `For this YouTube script: "${postText.substring(0, 500)}", generate catchy videoTitle, SEO videoDescription, and hashtags [array].`,
            }, userId);
        } catch (error: unknown) {
            logNonBlockingError('YouTube details generation failed — returning minimal hashtags', error);
            return { hashtags: [] };
        }
    }

    // Post with Image or AB Test
    if (formData.generationType === GenerationType.PostWithImage || formData.generationType === GenerationType.ABTest) {
        const postMortemImageHint = insights?.find((i: AIInsight & { imagePromptSuggestion?: string }) => i.imagePromptSuggestion);
        const postMortemImageHintStr = postMortemImageHint
            ? (postMortemImageHint as AIInsight & { imagePromptSuggestion?: string }).imagePromptSuggestion
            : undefined;

        const {
            imagePrompt,
            aspectRatio,
            imageQuality,
            referenceImages,
            brief,
        } = await buildImageGenerationInput({
            postText,
            formData,
            brandVoice,
            userId,
            visualVibe,
            postMortemImageHint: postMortemImageHintStr,
        });

        let imageGenerationError: string | null = null;
        let imageResponse = await generateImages(
            imagePrompt,
            {
                aspectRatio,
                quality: imageQuality,
                provider: 'auto',
                referenceImages: referenceImages.length ? referenceImages : undefined,
            },
            userId
        ).catch((err: unknown) => {
            imageGenerationError =
                err instanceof Error ? err.message : 'Generowanie grafiki nie powiodło się';
            return null;
        });

        // Visual QA + one auto-regen
        if (imageResponse) {
            try {
                const { ensureImageQuality } = await import('./visualQualityService');
                imageResponse = await ensureImageQuality({
                    imageResponse,
                    prompt: imagePrompt,
                    brief,
                    platform: formData.platform,
                    aspectRatio,
                    quality: imageQuality,
                    referenceImages,
                    userId,
                });
            } catch (error: unknown) {
                logNonBlockingError('Visual quality check failed — keeping first image', error, {
                    platform: formData.platform,
                });
            }
        }

        if (!imageResponse) {
            const failMeta: Pick<
                GenerationResult,
                'imageUrl' | 'imageGenerationFailed' | 'imageGenerationError'
            > = {
                imageUrl: null,
                imageGenerationFailed: true,
                imageGenerationError:
                    imageGenerationError || 'Generowanie grafiki nie powiodło się',
            };
            try {
                const details = await generateJson<Record<string, unknown>>({
                    model: DEFAULT_LITE_MODEL,
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
                return { ...details, ...failMeta };
            } catch (error: unknown) {
                logNonBlockingError('Fallback detail generation failed after image generation error', error, {
                    platform: formData.platform,
                });
                return { hashtags: [], ...failMeta };
            }
        }

        const imageUrl = imageResponse.publicUrls?.[0] || `data:image/jpeg;base64,${imageResponse.generatedImages?.[0]?.image?.imageBytes ?? ""}`;

        try {
            const details = await generateJson<Record<string, unknown>>({
                model: DEFAULT_LITE_MODEL,
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
            return { imageUrl, ...details, ...attachBrandCtaUrl(details, brandVoice) };

        } catch (error: unknown) {
            logNonBlockingError('Post details generation failed — returning minimal details', error, {
                platform: formData.platform,
            });
            return { imageUrl, hashtags: [], ...attachBrandCtaUrl({}, brandVoice) };
        }
    }

    return { hashtags: await suggestHashtags(postText, formData.platform, userId) };
};

export const suggestHashtags = async (postText: string, platform: Platform, userId: string): Promise<string[]> => {
    try {
        return await generateJson<string[]>({
            model: DEFAULT_FAST_MODEL,
            contents: `Suggest 10 relevant hashtags for this ${platform} post: "${postText.substring(0, 300)}". Return as array of strings.`,
        }, userId);
    } catch (error: unknown) {
        logNonBlockingError('Hashtag suggestion failed — returning empty list', error, {
            platform,
        });
        return [];
    }
};

export const repurposeContent = async (text: string, newPlatform: Platform, userId: string): Promise<string> => {
    const response = await generateContent({
        model: DEFAULT_PRO_MODEL,
        contents: `Repurpose this content for ${newPlatform}: "${text}". Adapt format and tone.`,
    }, userId);
    return response.text ?? '';
};

export const generateABTestVariations = async (formData: FormData, brandVoice: BrandVoiceData | null, userId: string): Promise<[Partial<GenerationResult>, Partial<GenerationResult>]> => {
    const nicheCtx = resolveNicheContext({ userId, brandVoice, audience: formData.audience });
    const prompt = `Generate two distinct versions (Variant A and Variant B) for a ${formData.platform} post about: "${formData.topic}".
    TONE: ${formData.tone}
    AUDIENCE: ${formData.audience || nicheCtx.niche || 'General public'}
    ${formatNicheUserPromptLines(nicheCtx)}
    KEYWORDS: ${formData.keywords}
    
    Variant A should focus on: Emotional appeal and benefits.
    Variant B should focus on: Direct facts and call to action.
    
    Return as JSON with structure: { variantA: { postText: string }, variantB: { postText: string } }`;

    const response = await generateJson<{ variantA: { postText: string }, variantB: { postText: string } }>({
        model: DEFAULT_FAST_MODEL,
        contents: prompt,
        config: {
            systemInstruction: `You are an elite social media copywriter.${formatNicheSystemInstruction(nicheCtx)}${brandVoice ? ` Follow brand voice: ${JSON.stringify(brandVoice)}.` : ''}\n${buildAntiSlopBlock()}`,
        },
    }, userId);

    return [
        { id: 'variant-a', postText: response.variantA.postText },
        { id: 'variant-b', postText: response.variantB.postText }
    ];
};

export const generateHookVariations = async (postText: string, userId: string): Promise<string[]> => {
    try {
        const response = await generateJson<string[]>({
            model: DEFAULT_FAST_MODEL,
            contents: `Based on this social media post: "${postText.substring(0, 500)}", generate 4 alternative, highly engaging opening sentences (hooks). 
            Each hook should have a different angle (e.g., curious, controversial, beneficial, storyteller).
            Return ONLY a JSON array of strings.`,
        }, userId);
        return response;
    } catch (error: unknown) {
        logNonBlockingError('Hook variations generation failed — returning empty list', error);
        return [];
    }
};

export const generateOmnichannelPosts = async (formData: FormData, brandVoice: BrandVoiceData | null, userId: string): Promise<OmnichannelPost[]> => {
    const platforms = formData.selectedPlatforms || [Platform.Facebook, Platform.Instagram, Platform.LinkedIn, Platform.X];
    const nicheCtx = resolveNicheContext({ userId, brandVoice, audience: formData.audience });

    try {
        const response = await generateJson<{ posts: OmnichannelPost[] }>({
            model: DEFAULT_FAST_MODEL,
            contents: `Generate simultaneous high-engagement social media posts for multiple platforms about: "${formData.topic}".
            TARGET AUDIENCE: ${formData.audience || nicheCtx.niche || 'General public'}
            ${formatNicheUserPromptLines(nicheCtx)}
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
            config: {
                systemInstruction: `You are an elite multi-platform social media strategist.${formatNicheSystemInstruction(nicheCtx)}${brandVoice ? ` Follow brand voice: ${JSON.stringify(brandVoice)}.` : ''}\n${buildAntiSlopBlock()}`,
            },
        }, userId);
        return response.posts;
    } catch (error: unknown) {
        logNonBlockingError('Omnichannel generation failed — returning empty list', error, {
            selectedPlatforms: platforms,
        });
        return [];
    }
};
