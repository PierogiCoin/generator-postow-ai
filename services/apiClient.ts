import { GenerateContentResponse } from '@google/genai';
import { extractJson } from '../utils/extractJson';
import { markQuotaDepleted, clearQuotaDepleted, isQuotaDepleted } from '../utils/chunkReload';
import {
  applyAiLanguage,
  getAppLanguageCode,
  isAiTextEndpoint,
  resolveAiLanguageCode,
} from '../utils/aiLanguage';
import { applyCreditsFromResponse } from '../utils/creditSync';
import { getSupabase } from './supabaseClient';

export { extractJson, markQuotaDepleted, clearQuotaDepleted, isQuotaDepleted };
export { applyAiLanguage, getAppLanguageCode, getAiLanguageInstruction, getAppLocale, resolveAiLanguageCode } from '../utils/aiLanguage';

const isLocalHostname = (hostname: string) =>
    hostname === 'localhost' || hostname === '127.0.0.1';

/** Ignoruje localhost w env, gdy app działa na produkcji (np. po lokalnym vercel build). */
const sanitizeEnvApiUrl = (raw: string | undefined): string | undefined => {
    if (!raw?.trim()) return undefined;
    const url = raw.trim().replace(/\/api$/, '');
    if (!url) return undefined;

    if (typeof window !== 'undefined' && !isLocalHostname(window.location.hostname)) {
        if (url.includes('localhost') || url.includes('127.0.0.1')) {
            return undefined;
        }
    }
    return url;
};

export const resolveApiBaseUrl = (): string => {
    if (typeof window !== 'undefined') {
        const { protocol, hostname } = window.location;

        // Lokalny dev: zawsze przez proxy Vite (/api → :3001)
        if (isLocalHostname(hostname)) {
            return '';
        }

        if (/\.app\.github\.dev$/.test(hostname)) {
            const autoHost = hostname.replace(/-(\d+)\.app\.github\.dev$/, (_suffix, p1) => {
                const port = Number(p1) || 3000;
                const newPort = port + 1;
                return `-${newPort}.app.github.dev`;
            });
            return `${protocol}//${autoHost}`;
        }
    }

    const envUrl = sanitizeEnvApiUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
    if (envUrl) return envUrl;

    // Produkcja Vercel: /api → serverless proxy → Railway (BACKEND_URL)
    return '';
};

export function getApiBaseUrl(): string {
    return resolveApiBaseUrl();
}

/** Długie requesty (wideo) — bezpośrednio na Railway, omija limit proxy Vercel. */
const PRODUCTION_BACKEND_URL = 'https://generator-postow-api-production.up.railway.app';

export function getLongRunningApiBaseUrl(): string {
    const envUrl = sanitizeEnvApiUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
    if (envUrl) return envUrl;

    if (typeof window !== 'undefined' && !isLocalHostname(window.location.hostname)) {
        return PRODUCTION_BACKEND_URL;
    }

    return getApiBaseUrl();
}

/** @deprecated Użyj getApiBaseUrl() — wartość liczona przy imporcie może być myląca w testach. */
export const API_BASE_URL = typeof window !== 'undefined' ? getApiBaseUrl() : '';

export async function getApiAuthHeaders(userId?: string): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
        'x-user-id': userId ?? '',
    };

    try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            headers.Authorization = `Bearer ${session.access_token}`;
        }
    } catch {
        // Supabase niedostępny (np. testy)
    }

    return headers;
}

/**
 * Funkcja pomocnicza do wywołań API Proxy
 */
export const callApi = async (endpoint: string, payload: any, userId?: string, headers: Record<string, string> = {}) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const requestBody = isAiTextEndpoint(endpoint, payload)
        ? applyAiLanguage(payload, resolveAiLanguageCode(payload))
        : payload;

    let response: Response;
    const authHeaders = await getApiAuthHeaders(userId);
    try {
        response = await fetch(`${getApiBaseUrl()}/api/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-app-language': resolveAiLanguageCode(payload),
                ...authHeaders,
                ...headers
            },
            credentials: 'include',
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });
    } catch (err) {
        clearTimeout(timeout);
        if (err instanceof Error && err.name === 'AbortError') {
            throw new Error('Przekroczono czas oczekiwania na odpowiedź AI (30s). Spróbuj ponownie.');
        }
        const netErr = new Error('Nie udało się połączyć z serwerem. Sprawdź internet i odśwież stronę.') as Error & { status?: number; code?: string };
        netErr.code = 'NETWORK_ERROR';
        throw netErr;
    }
    clearTimeout(timeout);

    const contentType = response.headers.get('content-type');
    let bodyText = '';

    try {
        bodyText = await response.text();
    } catch (e) { }

    if (!response.ok) {
        let errorMessage = `Błąd API (${response.status}) z ${endpoint}`;
        let errorCode: string | undefined;
        if (contentType?.includes('application/json')) {
            try {
                const errorJson = JSON.parse(bodyText);
                errorMessage = errorJson.message || errorJson.error || errorMessage;
                errorCode = errorJson.code;
            } catch { }
        }
        const err = new Error(errorMessage) as Error & { status?: number; code?: string };
        err.status = response.status;
        if (response.status === 402) {
            errorCode = 'insufficient_credits';
            errorMessage = errorMessage || 'Brak kredytów. Ulepsz plan lub dokup pakiet kredytów.';
        }
        if (errorCode) err.code = errorCode;
        if (response.status === 429 || errorCode === 'GEMINI_QUOTA_EXCEEDED') {
            markQuotaDepleted();
        }
        throw err;
    }

    clearQuotaDepleted();

    if (contentType?.includes('application/json')) {
        const parsed = JSON.parse(bodyText);
        applyCreditsFromResponse(parsed, response.headers);
        return parsed;
    }

    applyCreditsFromResponse(null, response.headers);
    return bodyText;
};

/**
 * Bezpieczne wywołanie dla generowania treści, obsługujące błędy bezpieczeństwa.
 */
export async function generateContent(payload: any, userId?: string): Promise<GenerateContentResponse> {
    const response: GenerateContentResponse = await callApi("generate-content", payload, userId);

    if (response.promptFeedback?.blockReason) {
        throw new Error(`[SAFETY] Zapytanie zablokowane: ${response.promptFeedback.blockReason}`);
    }

    if (response.candidates?.[0]?.finishReason === "SAFETY") {
        throw new Error("[SAFETY] Odpowiedź zablokowana przez filtry bezpieczeństwa.");
    }

    if (!response.text) {
        throw new Error("AI zwróciło pustą odpowiedź.");
    }

    return response;
}

/**
 * Kombinacja wywołania AI i parsowania JSON.
 */
export async function generateJson<T>(payload: any, userId?: string): Promise<T> {
    const response = await generateContent({
        ...payload,
        config: { ...payload.config, responseMimeType: "application/json" }
    }, userId);

    return extractJson<T>(response.text);
}

export const performComplexQuery = async (prompt: string, userId: string): Promise<string> => {
    const response = await generateContent({
        model: "gemini-pro-latest",
        contents: prompt,
        config: { thinkingConfig: { thinkingBudget: 32768 } }
    }, userId);
    return response.text;
}

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = (error) => reject(error);
    });
};
