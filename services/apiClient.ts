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

type ResolveApiOptions = {
    longRunning?: boolean;
};

/**
 * Single resolver for the backend API base URL.
 *
 * Precedence:
 * 1. Local Vite dev → '' (uses the Vite proxy /api → localhost:3001).
 * 2. VITE_LONG_RUNNING_API_BASE_URL (only when longRunning = true).
 * 3. VITE_API_BASE_URL.
 * 4. Same-origin /api (e.g. Vercel serverless → Railway).
 *
 * Production URLs containing 'localhost' or '127.0.0.1' are ignored to avoid
 * accidentally bundling a development backend address into the production build.
 */
export const resolveApiBaseUrl = ({ longRunning = false }: ResolveApiOptions = {}): string => {
    if (import.meta.env.DEV) {
        return '';
    }

    const envKey = longRunning ? 'VITE_LONG_RUNNING_API_BASE_URL' : 'VITE_API_BASE_URL';
    const fallbackKey = longRunning ? 'VITE_API_BASE_URL' : undefined;

    const envUrl = sanitizeEnvApiUrl(import.meta.env[envKey] as string | undefined);
    if (envUrl) return envUrl;

    if (fallbackKey) {
        const fallbackUrl = sanitizeEnvApiUrl(import.meta.env[fallbackKey] as string | undefined);
        if (fallbackUrl) return fallbackUrl;
    }

    return '';
};

export function getApiBaseUrl(): string {
    return resolveApiBaseUrl();
}

/**
 * Długie requesty (wideo / multi-platform) — preferuj bezpośredni URL backendu
 * (omija limit czasu proxy Vercel). Bez env → same-origin /api (proxy BACKEND_URL).
 */
export function getLongRunningApiBaseUrl(): string {
    return resolveApiBaseUrl({ longRunning: true });
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
export const callApi = async <T = any>(endpoint: string, payload: Record<string, unknown>, userId?: string, headers: Record<string, string> = {}, retries = 2): Promise<T> => {
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
        if (retries > 0 && !(err instanceof Error && err.name === 'AbortError')) {
            await new Promise(res => setTimeout(res, 1000 * (3 - retries)));
            return callApi<T>(endpoint, payload, userId, headers, retries - 1);
        }
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
        const parsed = JSON.parse(bodyText) as T;
        applyCreditsFromResponse(parsed, response.headers);
        return parsed;
    }

    applyCreditsFromResponse(null, response.headers);
    return bodyText as T;
};

/**
 * Bezpieczne wywołanie dla generowania treści, obsługujące błędy bezpieczeństwa.
 */
export async function generateContent(payload: Record<string, unknown>, userId?: string): Promise<GenerateContentResponse> {
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
export async function generateJson<T>(payload: Record<string, unknown>, userId?: string): Promise<T> {
    const response = await generateContent({
        ...(payload as object),
        config: { ...(payload.config as object), responseMimeType: "application/json" }
    }, userId);

    return extractJson<T>(response.text ?? '');
}

export const performComplexQuery = async (prompt: string, userId: string): Promise<string> => {
    const response = await generateContent({
        model: "gemini-pro-latest",
        contents: prompt,
        config: { thinkingConfig: { thinkingBudget: 32768 } }
    }, userId);
    return response.text ?? '';
}

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = (error) => reject(error);
    });
};
