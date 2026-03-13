import { Modality, GenerateContentResponse } from '@google/genai';
import { callApi, generateContent } from './apiClient';

/**
 * Media Service
 * Handles image and video generation and analysis
 */

export const generateImages = async (prompt: string, config: {
    numberOfImages?: number;
    outputMimeType?: string;
    aspectRatio?: string;
    safetyFilterLevel?: string;
} = {}, userId?: string) => {
    return await callApi("generate-images", {
        model: "imagen-4.0-generate-001",
        prompt: prompt,
        config: {
            numberOfImages: config.numberOfImages || 1,
            outputMimeType: config.outputMimeType || "image/jpeg",
            aspectRatio: config.aspectRatio || "1:1",
            safetyFilterLevel: config.safetyFilterLevel || "BLOCK_MEDIUM_AND_ABOVE",
        },
    }, userId);
};

export const generateVideoFromImage = async (prompt: string, image: { base64: string, mimeType: string }, aspectRatio: string, userId: string): Promise<any> => {
    if (aspectRatio !== '16:9' && aspectRatio !== '9:16') {
        throw new Error(`Unsupported aspect ratio for video generation: ${aspectRatio}. Only landscape (16:9) and portrait (9:16) are supported by the Veo model.`);
    }

    try {
        return await callApi("generate-videos", {
            model: "veo-3.1-fast-generate-preview",
            prompt: prompt,
            image: { imageBytes: image.base64, mimeType: image.mimeType },
            config: {
                numberOfVideos: 1,
                resolution: "720p",
                aspectRatio: aspectRatio as '16:9' | '9:16'
            }
        }, userId);
    } catch (e: any) {
        if (e.message?.includes("Requested entity was not found.")) {
            throw new Error("API_KEY_INVALID: Check backend server key.");
        }
        throw e;
    }
}

export const generateVideoFromText = async (prompt: string, aspectRatio: string, userId: string): Promise<any> => {
    if (aspectRatio !== '16:9' && aspectRatio !== '9:16') {
        throw new Error(`Unsupported aspect ratio for video generation: ${aspectRatio}. Only landscape (16:9) and portrait (9:16) are supported by the Veo model.`);
    }

    try {
        return await callApi("generate-videos", {
            model: "veo-3.1-fast-generate-preview",
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                resolution: "720p",
                aspectRatio: aspectRatio as '16:9' | '9:16'
            }
        }, userId);
    } catch (e: any) {
        if (e.message?.includes("Requested entity was not found.")) {
            throw new Error("API_KEY_INVALID: Check backend server key.");
        }
        throw e;
    }
}

export const getVideoOperationStatus = async (operation: any, userId: string) => {
    const operationName = operation.name || operation.operation?.name;

    if (!operationName) {
        throw new Error("Błąd: Nazwa operacji (LRO) jest wymagana.");
    }

    return callApi("get-videos-operation", { operation: { name: operationName } }, userId);
}

export const editImageWithPrompt = async (base64ImageData: string, mimeType: string, prompt: string, userId: string): Promise<string> => {
    const response: GenerateContentResponse = await generateContent({
        model: "gemini-flash-latest",
        contents: {
            parts: [
                { inlineData: { data: base64ImageData, mimeType: mimeType } },
                { text: prompt },
            ],
        },
        config: { responseModalities: [Modality.IMAGE] },
    }, userId);
    if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === "SAFETY") {
        throw new Error("[SAFETY] Image editing was blocked due to safety policies.");
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
        model: "gemini-flash-latest",
        contents: {
            parts: [
                { inlineData: { data: base64Image, mimeType: mimeType } },
                { text: prompt }
            ]
        }
    }, userId);
    if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === "SAFETY") {
        throw new Error("[SAFETY] Image analysis was blocked due to safety policies.");
    }
    return response.text;
}

export const analyzeVideo = async (base64Video: string, mimeType: string, prompt: string, userId: string): Promise<string> => {
    const response = await generateContent({
        model: "gemini-pro-latest",
        contents: {
            parts: [
                { inlineData: { data: base64Video, mimeType: mimeType } },
                { text: prompt }
            ]
        }
    }, userId);
    if (response.promptFeedback?.blockReason || response.candidates?.[0]?.finishReason === "SAFETY") {
        throw new Error("[SAFETY] Video analysis was blocked due to safety policies.");
    }
    return response.text;
}

export const suggestImageLayouts = async (postText: string, userId: string): Promise<any> => {
    return await callApi("generate-json", {
        model: "gemini-flash-latest",
        contents: `Based on this social media post: "${postText.substring(0, 500)}", suggest 3 punchy, short headlines (max 5 words each) to be overlayed on an image. For each, suggest an ideal position (top-left, center, bottom-right) and a mood/font style. Return as a JSON object with a 'layouts' array.`
    }, userId);
};
