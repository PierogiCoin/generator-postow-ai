/**
 * Gemini Service (Facade)
 * Main entry point for all AI services. Now modularized into specific services.
 */

// Re-export specific types if needed by other components
export type { Modality, GenerateContentResponse, FunctionDeclaration, Type } from '@google/genai';

// Core API communication
export * from './apiClient';
import { callApi } from './apiClient';

// Specialized services
export * from './contentService';
export * from './mediaService';
export * from './analysisService';
export * from './assistantService';

// Brand Voice learning
export const learnBrandVoiceFromHistory = async (userId: string): Promise<any> => {
    return await callApi('brand-voice/learn', {}, userId);
};

export const extractBrandVoiceFromUrl = async (url: string, userId: string): Promise<any> => {
    return await callApi('brand-voice/extract-url', { url }, userId);
};

// Individual exports for explicit usage if preferred
import * as Content from './contentService';
import * as Media from './mediaService';
import * as Analysis from './analysisService';
import * as Assistant from './assistantService';

export const services = {
    content: Content,
    media: Media,
    analysis: Analysis,
    assistant: Assistant
};
