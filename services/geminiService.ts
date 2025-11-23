import { v4 as uuidv4 } from 'uuid'; 

import { Modality, GenerateContentResponse, FunctionDeclaration, Type } from '@google/genai';
import { GenerationType } from '../types';
// Upewnij się, że typy są zaimportowane poprawnie!
import { FormData, GenerationResult, Platform, Tone, VisualStyle, IdeaResult, VideoScript, SentimentAnalysisResult, CampaignPlan, BrandVoiceData, User, SEOAnalysisResult, StyleSuggestionResult, FavoritePost, AIAssistantAction, Trend, RepurposedContent, PerformancePrediction, AIInsight, AudiencePersona, Scene, AlternativeIdea, CalendarSuggestion, StrategicIdea, GroundingSource, IntelligentCalendarPlanItem, StrategicAuditReport } from '../types';

// 🟢 Dynamiczna detekcja adresu backendu (lokalnie i w Codespaces)
// ZMIANA KLUCZOWA: Ta funkcja zwraca teraz URL BAZOWY BEZ KOŃCOWEGO /api.
const resolveApiBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
    const isGitHubDev = typeof window !== 'undefined' && /\.app\.github\.dev$/.test(window.location.hostname);
    
    // Jeśli mamy envUrl, użyjmy go, ale usuńmy końcowe /api, jeśli jest
    if (envUrl && !(isGitHubDev && envUrl.includes('localhost'))) {
        return envUrl.replace(/\/api$/, ''); // Usuń końcowe /api, jeśli istnieje
    }

    if (typeof window !== 'undefined') {
        const { protocol, hostname } = window.location;

        // Przykład: loud-name-3000.app.github.dev  -> loud-name-3001.app.github.dev
        if (/\.app\.github\.dev$/.test(hostname)) {
            const autoHost = hostname.replace(/-(\d+)\.app\.github\.dev$/, (_suffix, p1) => {
                const port = Number(p1) || 3000;
                const newPort = port + 1; // Zakładamy, że backend ma kolejny port (3001)
                return `-${newPort}.app.github.dev`;
            });
            return `${protocol}//${autoHost}`; // BEZ /api
        }

        if (hostname === 'localhost') {
            return 'http://localhost:3001'; // BEZ /api
        }

        // Railway/production - nie dodawaj portu!
        // VITE_API_BASE_URL powinien być ustawiony w env
        console.warn('⚠️  VITE_API_BASE_URL nie jest ustawiony - fallback nie zadziała w production!');
        return 'http://localhost:3001'; // Fallback tylko dla local dev
    }

    return 'http://localhost:3001'; // BEZ /api
};

// ZMIANA KLUCZOWA: API_BASE_URL to teraz tylko host:port
const API_BASE_URL = resolveApiBaseUrl();

// --- Funkcja pomocnicza do wywołań API Proxy - WZORZEC ODPORNY NA BŁĘDY PARSOWANIA JSON ---
const callApi = async (endpoint: string, payload: any, userId?: string, headers: Record<string, string> = {}) => {
    // ZMIANA KLUCZOWA: Dodajemy /api/ JAWNIE, aby utworzyć poprawną ścieżkę: host:port/api/endpoint
    const response = await fetch(`${API_BASE_URL}/api/${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId ?? '', 
            ...headers
        },
        credentials: 'include',
        body: JSON.stringify(payload)
    });

    const contentType = response.headers.get('content-type');
    let bodyText = '';
    
    // 1. Pobierz surowy tekst odpowiedzi
    try {
        bodyText = await response.text();
    } catch (e) {
        // Ignorujemy błędy odczytu strumienia w tym bloku
    }

    if (!response.ok) {
        let errorMessage = `Błąd API (${response.status}) z ${endpoint}`;
        
        // 2. SPRÓBUJ SPARSAĆ BŁĄD JAKO JSON
        if (contentType && contentType.includes('application/json')) {
            try {
                const errorJson = JSON.parse(bodyText);
                errorMessage = `Błąd API (${response.status}): ${errorJson.message || errorJson.error || 'Błąd serwera.'}`;
                console.error(`Błąd API z backendu (${response.status}):`, errorJson);
            } catch {
                // To jest przypadek, gdy serwer zwrócił status błędu (np. 500) i nie-JSON-ową treść (np. "I apologize...")
                errorMessage = `Błąd API (${response.status}): Serwer zwrócił nieoczekiwaną treść. Początek treści: ${bodyText.substring(0, 50)}...`;
                console.error(`Błąd API z backendu (${response.status}): Niepoprawna odpowiedź JSON`, bodyText);
            }
        } else {
            // Jeśli Content-Type nie jest JSON-em, po prostu zwróć surowy tekst jako wiadomość o błędzie
            errorMessage = `Błąd API (${response.status}): ${bodyText.substring(0, 100)}...`;
            console.error(`Błąd API z backendu (${response.status}):`, bodyText);
        }

        throw new Error(errorMessage);
    }
    
    // 3. Poprawna odpowiedź: Próba sparsowania JSON-a
    if (contentType && contentType.includes('application/json')) {
        try {
            return JSON.parse(bodyText);
        } catch (e) {
            // TUTAJ ŁAPIEMY BŁĄD: Unexpected token 'I', "I apologiz"... is not valid JSON
            // Model zwrócił tekst zamiast JSON-a, ale status był 200 OK.
            console.error("Błąd parsowania JSON. Surowy tekst:", bodyText);
            throw new Error(`Błąd parsowania odpowiedzi JSON z API. Odpowiedź zaczyna się od: ${bodyText.substring(0, 30)}...`);
        }
    }
    
    // 4. Jeśli status jest OK, ale Content-Type nie jest JSON, zwracamy surowy tekst (może być rzadkie)
    return bodyText;
};


// 🛑 POPRAWKA: Dodano export, jeśli używane poza plikiem
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

// 🛑 POPRAWKA KLUCZOWA: Dodano czyszczenie tekstu z znaczników Markdown
export async function generateContent(payload: any, userId?: string): Promise<GenerateContentResponse> {
    // Odpowiedź z callApi jest surowym obiektem odpowiedzi z backendu
    const responseData: GenerateContentResponse = await callApi('generate-content', payload, userId);
    
    // --- KLUCZOWA POPRAWKA CZYSZCZENIA TEKSTU ---
    if (responseData.text) {
        // Usuwamy otwierające znaczniki (np. ```json, ```python, ```)
        let cleanedText = responseData.text.replace(/^\s*```(json|JSON|javascript|js|typescript|ts)?\s*/, '');
        // Usuwamy zamykające znaczniki (np. ```)
        cleanedText = cleanedText.replace(/\s*```\s*$/, '');
        // Uaktualniamy obiekt odpowiedzi
        responseData.text = cleanedText;
    }
    // ---------------------------------------------
    
    return responseData; 
}


// --- 1. Generowanie strumieniowe ---
export async function* generateSocialMediaContentStream(
    formData: FormData,
    brandVoice: BrandVoiceData | null,
    userId: string,
    insights?: AIInsight[] | null
): AsyncGenerator<string> {
    
    const uid = userId || 'default-user'; 
    const model = formData.model === 'Pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

    let systemInstruction = `You are a PROFESSIONAL social media content strategist with 10+ years of experience creating viral, engaging content.

🎯 MISSION: Create a HIGH-QUALITY, PROFESSIONAL ${formData.platform} post that will captivate the audience and drive engagement.

📋 POST REQUIREMENTS:
- Topic: ${formData.topic}
- Platform: ${formData.platform}
- Target Audience: ${formData.audience}
- Tone: ${formData.tone}
- Keywords: ${formData.keywords || 'not specified'}
- Content Type: ${formData.contentType}

✨ QUALITY STANDARDS:
1. Hook: Start with a POWERFUL attention-grabbing opening (first 10 words are crucial!)
2. Value: Provide SPECIFIC, actionable insights (no generic fluff)
3. Structure: Use clear formatting with line breaks, emojis (2-4), and bullet points where appropriate
4. Engagement: Include a COMPELLING call-to-action or thought-provoking question
5. Length: ${formData.platform === 'Twitter' ? '280 characters max' : formData.platform === 'LinkedIn' ? '1300-2000 characters optimal' : 'Platform-appropriate length'}
6. Authenticity: Sound human, not robotic. Use conversational language.

📱 PLATFORM-SPECIFIC RULES:
${formData.platform === 'LinkedIn' 
    ? '- Professional but personable tone\n- Start with a hook, not "I am excited to..."\n- Use storytelling or data-driven insights\n- 3-5 short paragraphs max\n- End with question to spark conversation' 
    : formData.platform === 'Twitter'
    ? '- Concise and punchy (280 chars)\n- Start strong - no filler words\n- Use 1-2 emojis strategically\n- Make it quotable and shareable'
    : formData.platform === 'Instagram'
    ? '- Visually descriptive language\n- First line is critical (only 125 chars show before "more")\n- Use 2-4 emojis\n- Space out text for readability\n- Call-to-action in caption'
    : '- Engaging and authentic\n- Clear structure\n- Appropriate length for platform'}

🚫 AVOID:
- Generic phrases like "In today's fast-paced world..."
- Starting with "I'm excited to share..."
- Overused buzzwords
- Too many emojis (max 4)
- All caps (except for emphasis)
- Obvious sales pitches`;

    if (brandVoice) {
        systemInstruction += `\n\n🎨 BRAND VOICE (Must follow strictly):
- Brand: ${brandVoice.brandName}
- Voice Description: ${brandVoice.description}
- MUST include keywords: ${brandVoice.keywords}
- NEVER use: ${brandVoice.avoid}
- Maintain consistency with brand personality`;
    }
    
    if (insights && insights.length > 0) {
        systemInstruction += `\n\n📊 PROVEN SUCCESS INSIGHTS (Apply these patterns):
${insights.map(i => `✓ ${i.text}`).join('\n')}
Use these insights to maximize engagement!`;
    }
    
    // ZMIANA KLUCZOWA: fetch bezpośrednio do endpointu
    const streamResponse = await fetch(`${API_BASE_URL}/api/generate-content-stream`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-user-id': uid,
        },
        credentials: 'include',
        body: JSON.stringify({
            model,
            contents: `Generate the main text for a social media post about: "${formData.topic}"`,
            config: { systemInstruction },
        })
    });
    
    if (!streamResponse.ok) {
        const errorBody = await streamResponse.json().catch(() => ({ message: 'Nieznany błąd połączenia.' }));
        throw new Error(`Błąd API (${streamResponse.status}): ${errorBody.message}`);
    }

    const reader = streamResponse.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) {
        throw new Error("Nie można uzyskać dostępu do strumienia odpowiedzi.");
    }

    let buffer = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || '';

        for (const message of messages) {
            if (message.startsWith('data: ')) {
                const jsonText = message.substring(6);
                try {
                    const chunk = JSON.parse(jsonText);
                    
                    if (chunk.event === 'done') {
                        return;
                    }
                    if (chunk.promptFeedback?.blockReason || chunk.candidates?.[0]?.finishReason === 'SAFETY') {
                        throw new Error(`[SAFETY] Treść została zablokowana.`);
                    }
                    yield chunk.text || ''; 
                } catch (e) {
                    // Ignorowanie błędów parsowania (niekompletny JSON)
                }
            }
        }
    }
}


// --- 2. Regeneracja ---
export const regenerateWithFeedback = async (originalText: string, feedback: string, userId?: string): Promise<string> => {
    const response: GenerateContentResponse = await generateContent({
        model: 'gemini-2.5-flash',
        contents: `Here is a social media post: "${originalText}". Please regenerate it based on the following instruction: "${feedback}"`
    }, userId);
     if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('[SAFETY] Regeneration was blocked due to safety policies.');
    }
    return response.text;
}

// --- 3. Generowanie Szczegółów ---
export const generatePostDetails = async (
    postText: string,
    formData: FormData,
    brandVoice: BrandVoiceData | null,
    userId: string
): Promise<Partial<GenerationResult>> => {

    if (formData.platform === Platform.YouTube) {
        const detailsPrompt = `Based on the following video topic and script/description, generate a catchy YouTube video title and an engaging video description. The description should include relevant hashtags. Return a JSON object with keys: "videoTitle", "videoDescription", "hashtags".
        Topic: "${formData.topic.replace(/<[^>]*>?/gm, '')}"
        Script/Description: "${postText}"`;
        
        const detailsResponse = await generateContent({
            model: 'gemini-2.5-flash',
            contents: detailsPrompt,
            config: { responseMimeType: 'application/json' }
        }, userId);
        
        if (detailsResponse.promptFeedback?.blockReason || detailsResponse.candidates?.[0]?.finishReason === 'SAFETY') {
            throw new Error('[SAFETY] Could not generate video details due to safety policies.');
        }
        if (!detailsResponse.text || detailsResponse.text.trim() === '') {
             throw new Error('AI returned an empty response for video details.');
        }
        // WZMOCNIONE PARSOWANIE JSON (YOUTUBE)
        try {
            const details = JSON.parse(detailsResponse.text);
            return { videoTitle: details.videoTitle, videoDescription: details.videoDescription, hashtags: details.hashtags };
        } catch (e) {
            console.error("Błąd parsowania JSON (YouTube details). Surowy tekst:", detailsResponse.text);
            throw new Error(`Błąd parsowania JSON (generatePostDetails - YouTube). Model nie zwrócił poprawnego formatu JSON.`);
        }
    }

    if (formData.generationType === GenerationType.PostWithImage || formData.generationType === GenerationType.ABTest) {
        // 🎨 PROFESSIONAL IMAGE PROMPT ENGINEERING
        const visualStyleDescriptions = {
            Professional: 'clean, modern corporate aesthetic with professional color palette, high-end business photography style, sophisticated composition',
            Minimalist: 'ultra-minimalist design, lots of negative space, single focal point, monochromatic or limited color palette, zen-like simplicity',
            Bold: 'vibrant bold colors, high contrast, dramatic lighting, eye-catching composition, modern and energetic',
            Vintage: 'retro aesthetic, muted vintage colors, film grain texture, nostalgic feel, classic typography style',
            Modern: 'contemporary sleek design, gradient colors, geometric shapes, tech-forward aesthetic, clean lines',
            Playful: 'fun and energetic, bright cheerful colors, whimsical elements, friendly and approachable, dynamic composition'
        };

        const platformImageSpecs = {
            Instagram: 'Instagram-optimized: vibrant colors, mobile-first composition, story-worthy aesthetic',
            Facebook: 'Facebook-optimized: clear focal point, works at multiple sizes, eye-catching for feed',
            LinkedIn: 'LinkedIn-optimized: professional, clean, business-appropriate, trustworthy aesthetic',
            Twitter: 'Twitter-optimized: high contrast, readable at small sizes, attention-grabbing',
            YouTube: 'YouTube thumbnail-style: bold text overlay space, high contrast, clickable aesthetic',
            TikTok: 'TikTok-style: vertical format, dynamic, youth-oriented, trend-forward aesthetic'
        };

        const imagePrompt = `Create a PROFESSIONAL, HIGH-QUALITY image for a ${formData.platform} social media post.

🎯 SUBJECT: ${formData.topic}

🎨 VISUAL STYLE: ${visualStyleDescriptions[formData.visualStyle] || formData.visualStyle}

📱 PLATFORM OPTIMIZATION: ${platformImageSpecs[formData.platform] || 'Social media optimized'}

✨ REQUIREMENTS:
- ${formData.tone} mood and atmosphere
- Professional photography or illustration quality
- No text overlays (unless critical to design)
- Composition: Rule of thirds, balanced elements
- Color psychology: Colors that evoke ${formData.tone} emotion
- Visual metaphor related to: "${postText.substring(0, 100)}"
- Brand-safe, commercially appropriate
- High resolution, crisp details

🚫 AVOID:
- Generic stock photo look
- Cluttered composition
- Low-quality or pixelated elements
- Cliché imagery (handshakes, lightbulbs, etc.)
- Text that could be unreadable

Create an image that will STOP the scroll and perfectly complement the message.`;
        
        // ZMIANA KLUCZOWA: callApi teraz używa /api/ endpointu poprawnie
        const imageResponse = await callApi('generate-images', { 
            model: 'imagen-4.0-generate-001',
            prompt: imagePrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: formData.aspectRatio || '1:1',
              safetyFilterLevel: 'BLOCK_MEDIUM_AND_ABOVE',
            },
        }, userId);

        const imageUrl: string = imageResponse.publicUrls?.[0]
            || `data:image/jpeg;base64,${imageResponse.generatedImages?.[0]?.image?.imageBytes ?? ''}`;
        
        const detailsPrompt = `Based on the following social media post text, generate relevant hashtags, and if it's an ad, an ad headline and a call to action. Return a JSON object with keys: "hashtags", "adHeadline", "callToAction".
        Post text: "${postText}"
        Platform: ${formData.platform}
        Content Type: ${formData.contentType}`;
        
        const detailsResponse = await generateContent({
            model: 'gemini-2.5-flash',
            contents: detailsPrompt,
            config: { responseMimeType: 'application/json' }
        }, userId);

        if (detailsResponse.promptFeedback?.blockReason || detailsResponse.candidates?.[0]?.finishReason === 'SAFETY') {
            throw new Error('[SAFETY] Could not generate post details due to safety policies.');
        }
         if (!detailsResponse.text || detailsResponse.text.trim() === '') {
             throw new Error('AI returned an empty response for post details.');
        }
        // WZMOCNIONE PARSOWANIE JSON (POST DETAILS)
        try {
            const details = JSON.parse(detailsResponse.text);
            return { imageUrl, hashtags: details.hashtags, adHeadline: details.adHeadline, callToAction: details.callToAction };
        } catch (e) {
            console.error("Błąd parsowania JSON (Post details). Surowy tekst:", detailsResponse.text);
            throw new Error(`Błąd parsowania JSON (generatePostDetails - Post). Model nie zwrócił poprawnego formatu JSON.`);
        }
    }

    return { hashtags: await suggestHashtags(postText, formData.platform, userId) };
};

// --- 4. Pozostałe funkcje (wszystkie z exportem i WZMOCNIONYM PARSOWANIEM) ---

export const suggestHashtags = async (postText: string, platform: Platform, userId: string): Promise<string[]> => {
    const platformGuidelines = {
        LinkedIn: 'Use 3-5 professional hashtags. Mix broad (#Marketing) and specific (#B2BSaaS). Avoid overly trendy hashtags.',
        Twitter: 'Use 1-2 hashtags max. Must be trending or highly relevant. Keep them short.',
        Instagram: 'Use 8-15 hashtags. Mix popular (100K-1M posts), medium (10K-100K), and niche (<10K) hashtags.',
        Facebook: 'Use 2-3 hashtags max. Focus on branded or community hashtags.',
        YouTube: 'Use 3-5 highly searchable hashtags. Focus on discovery keywords.',
        TikTok: 'Use 4-6 trending hashtags. Include challenge/trend hashtags.'
    };

    const response = await generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a PROFESSIONAL hashtag strategist. Analyze this ${platform} post and suggest STRATEGIC hashtags for MAXIMUM reach and engagement.

POST CONTENT:
"${postText}"

PLATFORM: ${platform}
GUIDELINES: ${platformGuidelines[platform] || 'Use relevant, searchable hashtags'}

📊 HASHTAG STRATEGY:
- Mix of high-traffic and niche hashtags
- Must be directly relevant to content
- No banned or spammy hashtags
- Use proper capitalization (#SocialMediaMarketing, not #socialmediamarketing)
- Platform-specific best practices

Return ONLY a JSON array of hashtag strings (including the # symbol).
Example: ["#MarketingTips", "#SocialMediaGrowth", "#ContentStrategy"]

${platform === 'Instagram' ? 'IMPORTANT: Return 10-15 hashtags for Instagram' : platform === 'Twitter' ? 'IMPORTANT: Return maximum 2 hashtags for Twitter' : ''}`,
        config: { responseMimeType: 'application/json' }
    }, userId);
    if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('[SAFETY] Could not suggest hashtags due to safety policies.');
    }
    if (!response.text || response.text.trim() === '') {
        throw new Error('AI returned an empty response for hashtags.');
    }
    // WZMOCNIONE PARSOWANIE JSON
    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Błąd parsowania JSON (suggestHashtags). Surowy tekst:", response.text);
        throw new Error(`Błąd parsowania JSON (suggestHashtags). Model nie zwrócił poprawnego formatu JSON.`);
    }
};

export const suggestAudioDescriptions = async (topic: string, audience: string, tone: Tone, userId?: string): Promise<string[]> => {
    const response = await generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: `Suggest 3 diverse audio descriptions (e.g., music style, sound effects) for a video about "${topic}" aimed at ${audience} with a ${tone} tone. Return a JSON array of strings.`,
        config: { responseMimeType: 'application/json' }
    }, userId);
     if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('[SAFETY] Could not suggest audio due to safety policies.');
    }
    if (!response.text || response.text.trim() === '') {
        throw new Error('AI returned an empty response for audio descriptions.');
    }
    // WZMOCNIONE PARSOWANIE JSON
    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Błąd parsowania JSON (suggestAudioDescriptions). Surowy tekst:", response.text);
        throw new Error(`Błąd parsowania JSON (suggestAudioDescriptions). Model nie zwrócił poprawnego formatu JSON.`);
    }
};

export const analyzeSentiment = async (text: string, userId: string): Promise<SentimentAnalysisResult | null> => {
    const response = await generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: `Analyze the sentiment of the following text. Return a JSON object with "sentiment" ('Pozytywny', 'Neutralny', 'Negatywny') and "score" (0-100). Text: "${text}"`,
        config: { responseMimeType: 'application/json' }
    }, userId);
    if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') return null;
    if (!response.text || response.text.trim() === '') {
        return null;
    }
    // WZMOCNIONE PARSOWANIE JSON
    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Błąd parsowania JSON (analyzeSentiment). Surowy tekst:", response.text);
        throw new Error(`Błąd parsowania JSON (analyzeSentiment). Model nie zwrócił poprawnego formatu JSON.`);
    }
};

export const analyzeSEO = async (text: string, userId: string): Promise<SEOAnalysisResult | null> => {
    const response = await generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze the following text for SEO. Identify the main keyword, up to 3 secondary keywords, and provide 2 actionable suggestions for improvement. Return a JSON object with keys: "mainKeyword", "secondaryKeywords", "suggestions", "score" (0-100). Text: "${text}"`,
        config: { responseMimeType: 'application/json' }
    }, userId);
    if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') return null;
    if (!response.text || response.text.trim() === '') {
        return null;
    }
    // WZMOCNIONE PARSOWANIE JSON
    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Błąd parsowania JSON (analyzeSEO). Surowy tekst:", response.text);
        throw new Error(`Błąd parsowania JSON (analyzeSEO). Model nie zwrócił poprawnego formatu JSON.`);
    }
};

export const performAIAction = async (
    action: AIAssistantAction,
    text: string,
    context: { fullText: string, formData: FormData | null, [key: string]: any },
    userId: string
): Promise<{ resultText: string }> => {

    let prompt = '';
    switch(action) {
        case 'rewrite': prompt = `Rewrite the following text: "${text}"`; break;
        case 'shorten': prompt = `Shorten the following text: "${text}"`; break;
        case 'lengthen': prompt = `Lengthen the following text, adding more detail: "${text}"`; break;
        case 'add-emoji': prompt = `Add relevant emojis to the following text: "${text}"`; break;
        case 'change_tone': prompt = `Change the tone of the following text to ${context.tone}: "${text}"`; break;
        case 'summarize': prompt = `Summarize the following text concisely: "${text}"`; break;
        case 'expand_keywords':
            prompt = `Expand on the following text by adding more detail and relevant keywords. If a specific part was selected ("${text}"), focus the expansion around that part while maintaining the context of the whole text. Return the complete, modified text.\n\nFull text:\n"""\n${context.fullText}\n"""`;
            break;
        case 'suggest_hashtags':
            prompt = `Based on the content of the following text, suggest 3-5 relevant hashtags. Then, append these hashtags to the very end of the original text (after any existing content). Return the complete, modified text.\n\nOriginal text:\n"""\n${context.fullText}\n"""`;
            break;
        default:
            throw new Error(`Nieznana akcja AI: ${action}`);
    }
    const response = await generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt
    }, userId);
     if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('[SAFETY] AI action was blocked due to safety policies.');
    }
    return { resultText: response.text };
};

export const predictPerformance = async (result: GenerationResult, formData: FormData, userId: string): Promise<PerformancePrediction | null> => {
    const response = await generateContent({
        model: 'gemini-2.5-pro',
        contents: `Predict the performance of this social media post. Analyze its reach, engagement, and virality potential (scores 0-100) and provide actionable tips. Return a JSON object with keys: "reach" ({score, label}), "engagement" ({score, label}), "virality" ({score, label}), and "tips" (an array of {text, isMet:boolean}).
        Post Data: ${JSON.stringify({ ...formData, postText: result.postText })}`,
        config: { responseMimeType: 'application/json' }
    }, userId);
    if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
        return null;
    }
    if (!response.text || response.text.trim() === '') {
        return null;
    }
    // WZMOCNIONE PARSOWANIE JSON
    try {
        const prediction = JSON.parse(response.text);
        return { ...prediction, insights: [] };
    } catch (e) {
        console.error("Błąd parsowania JSON (predictPerformance). Surowy tekst:", response.text);
        throw new Error(`Błąd parsowania JSON (predictPerformance). Model nie zwrócił poprawnego formatu JSON.`);
    }
};


// --- Generowanie wideo (Użycie dedykowanych endpointów proxy) ---

export const generateVideoFromImage = async (prompt: string, image: { base64: string, mimeType: string }, aspectRatio: string, userId: string): Promise<any> => {
    if (aspectRatio !== '16:9' && aspectRatio !== '9:16') {
        throw new Error(`Unsupported aspect ratio for video generation: ${aspectRatio}. Only landscape (16:9) and portrait (9:16) are supported by the Veo model.`);
    }
    
    try {
        return await callApi('generate-videos', {
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            image: { imageBytes: image.base64, mimeType: image.mimeType },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspectRatio as '16:9' | '9:16'
            }
        }, userId);
    } catch (e: any) {
        if (e.message?.includes("Requested entity was not found.")) {
             throw new Error('API_KEY_INVALID: Check backend server key.');
        }
        throw e;
    }
}

export const generateVideoFromText = async (prompt: string, aspectRatio: string, userId: string): Promise<any> => {
    if (aspectRatio !== '16:9' && aspectRatio !== '9:16') {
        throw new Error(`Unsupported aspect ratio for video generation: ${aspectRatio}. Only landscape (16:9) and portrait (9:16) are supported by the Veo model.`);
    }
    
    try {
        return await callApi('generate-videos', {
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: aspectRatio as '16:9' | '9:16'
            }
        }, userId);
    } catch (e: any) {
        if (e.message?.includes("Requested entity was not found.")) {
             throw new Error('API_KEY_INVALID: Check backend server key.');
        }
        throw e;
    }
}

export const getVideoOperationStatus = async (operation: any, userId: string) => {
    const operationName = operation.name || operation.operation?.name; 
    
    if (!operationName) {
        throw new Error("Błąd: Nazwa operacji (LRO) jest wymagana.");
    }
    
    return callApi('get-videos-operation', {operation: {name: operationName}}, userId);
}

// --- Edycja i analiza obrazu/wideo (nie parsują JSON, więc są OK) ---

export const editImageWithPrompt = async (base64ImageData: string, mimeType: string, prompt: string, userId: string): Promise<string> => {
    const response: GenerateContentResponse = await generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
              { inlineData: { data: base64ImageData, mimeType: mimeType } },
              { text: prompt },
            ],
        },
        config: { responseModalities: [Modality.IMAGE] },
    }, userId);
    if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('[SAFETY] Image editing was blocked due to safety policies.');
    }
    for (const part of response.candidates![0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated from edit");
}


export const analyzeImage = async (base64Image: string, mimeType: string, prompt: string, userId: string): Promise<string> => {
    const response = await generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { data: base64Image, mimeType: mimeType }},
                { text: prompt }
            ]
        }
    }, userId);
     if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('[SAFETY] Image analysis was blocked due to safety policies.');
    }
    return response.text;
}

export const analyzeVideo = async (base64Video: string, mimeType: string, prompt: string, userId: string): Promise<string> => {
    const response = await generateContent({
        model: 'gemini-2.5-pro',
        contents: {
            parts: [
                { inlineData: { data: base64Video, mimeType: mimeType }},
                { text: prompt }
            ]
        }
    }, userId);
    if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('[SAFETY] Video analysis was blocked due to safety policies.');
    }
    return response.text;
}

export const performComplexQuery = async (prompt: string, userId: string): Promise<string> => {
    const response = await generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 32768 }
        }
    }, userId);
    if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('[SAFETY] Complex query was blocked due to safety policies.');
    }
    return response.text;
}

export const generateAudiencePersona = async (
    topic: string,
    platform: Platform | undefined,
    userId: string
): Promise<AudiencePersona> => {
    const response = await generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on the topic "${topic}" and platform ${platform}, create a detailed audience persona. Return a JSON object with keys: "name", "ageRange", "interests", "painPoints", and "goals".`,
        config: { responseMimeType: 'application/json' }
    }, userId);

    if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('[SAFETY] Audience persona generation was blocked due to safety policies.');
    }
    if (!response.text || response.text.trim() === '') {
        throw new Error('AI returned an empty response for audience persona.');
    }
    // WZMOCNIONE PARSOWANIE JSON
    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Błąd parsowania JSON (generateAudiencePersona). Surowy tekst:", response.text);
        throw new Error(`Błąd parsowania JSON (generateAudiencePersona). Model nie zwrócił poprawnego formatu JSON.`);
    }
};

export const generateCalendarSuggestions = async (...args: any[]): Promise<CalendarSuggestion[]> => {
    // Accept flexible arguments from various call sites. We'll serialize provided args into the prompt.
    const userId = args.length > 0 && typeof args[args.length - 1] === 'string' ? args.pop() as string : undefined;
    const currentPlan = args[0] ?? [];
    const response = await generateContent({
        model: 'gemini-2.5-pro',
        contents: `Analyze the current content plan and additional context: ${JSON.stringify(args)}. Suggest 3 strategic improvements or new content ideas for the calendar. Return a JSON array of objects with keys: "date", "platform", "topic", "type" and "reason" (explaining the strategic choice).`,
        config: { responseMimeType: 'application/json' }
    }, userId);

    if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('[SAFETY] Calendar suggestion generation was blocked due to safety policies.');
    }
    if (!response.text || response.text.trim() === '') {
        throw new Error('AI returned an empty response for calendar suggestions.');
    }
    // WZMOCNIONE PARSOWANIE JSON
    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Błąd parsowania JSON (generateCalendarSuggestions). Surowy tekst:", response.text);
        throw new Error(`Błąd parsowania JSON (generateCalendarSuggestions). Model nie zwrócił poprawnego formatu JSON.`);
    }
};


// 🟢 DODANO: getStrategicContentIdeas
export const getStrategicContentIdeas = async (
    niche: string,
    platform?: Platform,
    userId?: string
): Promise<StrategicIdea[]> => {
    const response = await generateContent({
        model: 'gemini-2.5-pro',
        contents: `Generate 3 high-impact strategic content ideas for the "${niche}" niche${platform ? ` on the ${platform} platform` : ''}. Each idea must include a "topic", a "strategy" (e.g., trend hijacking, pillar content), a "requiredResource" (e.g., video, infographic), and a "potentialImpact" (0-100 score). Return a JSON array of these StrategicIdea objects.`,
        config: { responseMimeType: 'application/json' }
    }, userId);

    if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('[SAFETY] Strategic idea generation was blocked due to safety policies.');
    }
    if (!response.text || response.text.trim() === '') {
        throw new Error('AI returned an empty response for strategic ideas.');
    }
    // WZMOCNIONE PARSOWANIE JSON
    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Błąd parsowania JSON (getStrategicContentIdeas). Surowy tekst:", response.text);
        throw new Error(`Błąd parsowania JSON (getStrategicContentIdeas). Model nie zwrócił poprawnego formatu JSON.`);
    }
};

// 🛑 DODANO: Pozostałe funkcje z logów
export const generateIntelligentCalendarPlan = async (...args: any[]): Promise<IntelligentCalendarPlanItem[]> => {
    console.warn("Funkcja generateIntelligentCalendarPlan używa placeholdera.");
    return [];
}
export const generateStrategicAudit = async (...args: any[]): Promise<StrategicAuditReport> => {
    console.warn("Funkcja generateStrategicAudit używa placeholdera.");
    throw new Error("Funkcja generateStrategicAudit nie jest zaimplementowana.");
}


export const getCommandFunctionDeclarations = (): FunctionDeclaration[] => [
    { name: 'navigateTo', parameters: { type: Type.OBJECT, properties: { view: { type: Type.STRING, enum: ['generator', 'trends', 'calendar', 'analytics', 'account', 'analyzer', 'storyboard'] } }, required: ['view'] } },
    { name: 'startNewPost', parameters: { type: Type.OBJECT, properties: { topic: { type: Type.STRING }, platform: { type: Type.STRING, enum: Object.values(Platform) } }, required: ['topic', 'platform'] } },
    { name: 'findTrend', parameters: { type: Type.OBJECT, properties: { niche: { type: Type.STRING } }, required: ['niche'] } },
    { name: 'schedulePost', parameters: { type: Type.OBJECT, properties: { content: { type: Type.STRING }, platform: { type: Type.STRING, enum: Object.values(Platform) }, scheduleTime: { type: Type.STRING, description: "ISO 8601 format date-time string" } }, required: ['content', 'platform', 'scheduleTime'] } },
    { name: 'publishPost', parameters: { type: Type.OBJECT, properties: { content: { type: Type.STRING }, platform: { type: Type.STRING, enum: Object.values(Platform) } }, required: ['content', 'platform'] } },
];


export const executeCommand = async (command: string, tools: FunctionDeclaration[], userId?: string): Promise<GenerateContentResponse> => {
    const response = await generateContent({
        model: 'gemini-2.5-flash',
        contents: `Execute this command: "${command}"`,
        config: {
            tools: [{ functionDeclarations: tools }],
        }
    }, userId);
    if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('[SAFETY] Command execution was blocked due to safety policies.');
    }
    return response;
};

export const generateABTestVariations = async (
    formData: FormData,
    brandVoice: BrandVoiceData | null,
    userId: string
): Promise<[GenerationResult, GenerationResult]> => {
    
    const uid = userId || 'default-user'; 

    const model = formData.model === 'Pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const basePrompt = `Create two distinct variations (A and B) of a social media post for A/B testing.
    - Topic: ${formData.topic}
    - Platform: ${formData.platform}
    - Target Audience: ${formData.audience}
    - Tone: ${formData.tone}
    
    Return a JSON object with two keys, "variantA" and "variantB". Each key should be an object with "postText" and "adHeadline" properties.`;
    
    const response = await generateContent({
        model,
        contents: basePrompt,
        config: { responseMimeType: 'application/json' }
    }, userId);
    
    if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('[SAFETY] A/B test generation was blocked due to safety policies.');
    }
    if (!response.text || response.text.trim() === '') {
        throw new Error('AI returned an empty response for A/B variants.');
    }
    // WZMOCNIONE PARSOWANIE JSON
    try {
        const variants = JSON.parse(response.text);

        const [detailsA, detailsB] = await Promise.all([
            generatePostDetails(variants.variantA.postText, formData, brandVoice, userId),
            generatePostDetails(variants.variantB.postText, formData, brandVoice, userId)
        ]);

        const createVariantResult = (variantData: any, details: any): GenerationResult => ({
            id: uuidv4(), 
            type: GenerationType.PostWithImage,
            platform: formData.platform,
            postText: variantData.postText,
            adHeadline: variantData.adHeadline,
            hashtags: details.hashtags || [],
            imageUrl: details.imageUrl || null,
            callToAction: details.callToAction || null,
            metadata: { ...formData, prompt: formData.topic },
            approvalStatus: 'draft',
            comments: [],
            authorId: uid,
        });

        return [
            createVariantResult(variants.variantA, detailsA),
            createVariantResult(variants.variantB, detailsB)
        ];
    } catch (e) {
        console.error("Błąd parsowania JSON (generateABTestVariations). Surowy tekst:", response.text);
        throw new Error(`Błąd parsowania JSON (generateABTestVariations). Model nie zwrócił poprawnego formatu JSON.`);
    }
};

export const repurposeContent = async (
    result: GenerationResult,
    originalPlatform: Platform,
    userId: string
): Promise<RepurposedContent> => {
    const platformsToRepurpose: Platform[] = [Platform.Facebook, Platform.Instagram, Platform.X, Platform.LinkedIn].filter(p => p !== originalPlatform);
    
    const response = await generateContent({
        model: 'gemini-2.5-pro',
        contents: `Repurpose the following ${originalPlatform} post for these platforms: ${platformsToRepurpose.join(', ')}. Adapt the style, length, and format for each. Original post: "${result.postText}". Return a JSON object where keys are platform names and values are the repurposed content (string or array of objects with title/text for carousels).`,
        config: { responseMimeType: "application/json" }
    }, userId);
    
    if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('[SAFETY] Repurposing was blocked due to safety policies.');
    }
    if (!response.text || response.text.trim() === '') {
        throw new Error('AI returned an empty response for content repurposing.');
    }
    // WZMOCNIONE PARSOWANIE JSON
    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Błąd parsowania JSON (repurposeContent). Surowy tekst:", response.text);
        throw new Error(`Błąd parsowania JSON (repurposeContent). Model nie zwrócił poprawnego formatu JSON.`);
    }
};


export const discoverTrends = async (niche: string, userId: string): Promise<Trend[]> => {
    const response = await generateContent({
        model: "gemini-2.5-flash",
    contents: `Discover 3-4 current trends in the "${niche}" niche. For each trend, provide a topic, a short summary, 3-4 relevant emerging hashtags, 2-3 questions people are asking, and 2 insightful quotes or stats. Return a JSON array of objects with keys: "id", "topic", "summary", "hashtags", "questions", "quotes".`,
        config: {
            tools: [{ googleSearch: {} }],
        },
    }, userId);
    
    if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('[SAFETY] Trend discovery was blocked due to safety policies.');
    }
    if (!response.text || response.text.trim() === '') {
        throw new Error('AI returned an empty response for trend discovery.');
    }
    // WZMOCNIONE PARSOWANIE JSON
    try {
        const trends: Trend[] = JSON.parse(response.text);
        return trends.map(trend => ({...trend, id: uuidv4() })); 
    } catch (e) {
        console.error("Błąd parsowania JSON (discoverTrends). Surowy tekst:", response.text);
        throw new Error(`Błąd parsowania JSON (discoverTrends). Model nie zwrócił poprawnego formatu JSON.`);
    }
};

export const generateStoryboard = async (topic: string, userId?: string): Promise<Scene[]> => {
    const response = await generateContent({
        model: 'gemini-2.5-pro',
        contents: `Create a 5-scene video storyboard for a short video about "${topic}". For each scene, provide a "sceneNumber", a "visualDescription", and a short "narrationText". Return a JSON array of these scene objects.`,
        config: { responseMimeType: 'application/json' }
    }, userId);
    if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('[SAFETY] Storyboard generation was blocked due to safety policies.');
    }
    if (!response.text || response.text.trim() === '') {
        throw new Error('AI returned an empty response for storyboard.');
    }
    // WZMOCNIONE PARSOWANIE JSON
    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Błąd parsowania JSON (generateStoryboard). Surowy tekst:", response.text);
        throw new Error(`Błąd parsowania JSON (generateStoryboard). Model nie zwrócił poprawnego formatu JSON.`);
    }
};

export const generateSpeech = async (text: string, userId: string): Promise<string> => {
    const response = await generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say this narration: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
        },
    }, userId);
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("Failed to generate audio.");
    }
    return base64Audio;
};


export const getTopicSuggestions = async (currentTopic: string, userPrompt: string, userId: string): Promise<string[]> => {
    const response = await generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: `Based on the current topic: "${currentTopic.replace(/<[^>]*>?/gm, '')}", and the user's request: "${userPrompt}", generate 3-4 alternative topic suggestions. Return a JSON array of strings.`,
        config: { responseMimeType: 'application/json' }
    }, userId);
    if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('[SAFETY] Topic suggestion was blocked due to safety policies.');
    }
    if (!response.text || response.text.trim() === '') {
        throw new Error('AI returned an empty response for topic suggestions.');
    }
    // WZMOCNIONE PARSOWANIE JSON
    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Błąd parsowania JSON (getTopicSuggestions). Surowy tekst:", response.text);
        throw new Error(`Błąd parsowania JSON (getTopicSuggestions). Model nie zwrócił poprawnego formatu JSON.`);
    }
};

export const learnStyleFromFavorites = async (favorites: FavoritePost[], userId: string): Promise<BrandVoiceData> => {

    const examples = favorites.map(fav => fav.result.postText).join('\n\n---\n\n');
    const response = await generateContent({
        model: 'gemini-2.5-pro',
        contents: `Analyze the following examples of social media posts to define a brand voice. Extract the brand name, a concise description of the style, common keywords, and things to avoid. Return a JSON object with keys: "brandName", "description", "keywords", "avoid".\n\nExamples:\n${examples}`,
        config: { responseMimeType: "application/json" }
    }, userId);
     if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('[SAFETY] Style learning was blocked due to safety policies.');
    }
    if (!response.text || response.text.trim() === '') {
        throw new Error('AI returned an empty response for style learning.');
    }
    // WZMOCNIONE PARSOWANIE JSON
    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Błąd parsowania JSON (learnStyleFromFavorites). Surowy tekst:", response.text);
        throw new Error(`Błąd parsowania JSON (learnStyleFromFavorites). Model nie zwrócił poprawnego formatu JSON.`);
    }
};

export const suggestToneAndStyle = async (topic: string, userId: string): Promise<StyleSuggestionResult | null> => {
    try {
        const response = await generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: `For a post about "${topic.replace(/<[^>]*>?/gm, '')}", suggest 2-3 suitable tones and 2-3 visual styles. Return a JSON object with keys: "suggestedTones" and "suggestedVisualStyles". The values should be arrays of strings matching these allowed values: Tones: ${Object.values(Tone).join(', ')}`
        }, userId);
        
        if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === 'SAFETY') return null;
        
        // WZMOCNIONE PARSOWANIE JSON
        try {
            const result = JSON.parse(response.text);
            return {
                suggestedTones: result.suggestedTones,
                suggestedVisualStyles: result.suggestedVisualStyles,
            };
        } catch (e) {
            console.error("Błąd parsowania JSON (suggestToneAndStyle). Surowy tekst:", response.text);
            throw new Error(`Błąd parsowania JSON (suggestToneAndStyle). Model nie zwrócił poprawnego formatu JSON.`);
        }

    } catch (error) {
        console.error("Błąd podczas sugerowania tonu/stylu:", error);
        return null;
    }
};