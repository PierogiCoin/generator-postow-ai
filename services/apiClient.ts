import { GenerateContentResponse } from '@google/genai';

// 🟢 Dynamiczna detekcja adresu backendu
const resolveApiBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
    const isGitHubDev = typeof window !== 'undefined' && /\.app\.github\.dev$/.test(window.location.hostname);

    if (envUrl && !(isGitHubDev && envUrl.includes('localhost'))) {
        return envUrl.replace(/\/api$/, '');
    }

    if (typeof window !== 'undefined') {
        const { protocol, hostname } = window.location;

        if (/\.app\.github\.dev$/.test(hostname)) {
            const autoHost = hostname.replace(/-(\d+)\.app\.github\.dev$/, (_suffix, p1) => {
                const port = Number(p1) || 3000;
                const newPort = port + 1;
                return `-${newPort}.app.github.dev`;
            });
            return `${protocol}//${autoHost}`;
        }

        if (hostname === 'localhost') {
            return ''; // Use relative paths for proxy
        }
    }

    return ''; // Default to relative paths
};

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Próbuje wyciągnąć i sparować JSON z tekstu, nawet jeśli model dodał tekst dookoła lub bloki markdown.
 */
export function extractJson<T>(text: string): T {
    if (!text) throw new Error("Otrzymano pusty tekst do sparsowania.");

    // Usuń bloki markdown ```json ... ``` lub ``` ... ```
    let cleanText = text.replace(/```json\s?([\s\S]*?)```/g, '$1')
        .replace(/```\s?([\s\S]*?)```/g, '$1')
        .trim();

    try {
        // Find the boundary of the JSON object or array
        const firstBrace = cleanText.indexOf('{');
        const firstBracket = cleanText.indexOf('[');
        const lastBrace = cleanText.lastIndexOf('}');
        const lastBracket = cleanText.lastIndexOf(']');

        let start = -1;
        let end = -1;

        if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
            start = firstBrace;
            end = lastBrace;
        } else if (firstBracket !== -1) {
            start = firstBracket;
            end = lastBracket;
        }

        if (start !== -1 && end !== -1 && end > start) {
            const possibleJson = cleanText.substring(start, end + 1);
            return JSON.parse(possibleJson) as T;
        }

        return JSON.parse(cleanText) as T;
    } catch (e) {
        console.error("Błąd parsowania JSON. Tekst oryginalny:", text);
        console.error("Błąd parsowania JSON. Tekst po czyszczeniu:", cleanText);
        throw new Error(`Model AI nie zwrócił poprawnego formatu JSON. Otrzymano tekst zamiast danych.`);
    }
}

/**
 * Funkcja pomocnicza do wywołań API Proxy
 */
export const callApi = async (endpoint: string, payload: any, userId?: string, headers: Record<string, string> = {}) => {
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

    try {
        bodyText = await response.text();
    } catch (e) { }

    if (!response.ok) {
        let errorMessage = `Błąd API (${response.status}) z ${endpoint}`;
        if (contentType?.includes('application/json')) {
            try {
                const errorJson = JSON.parse(bodyText);
                errorMessage = errorJson.message || errorJson.error || errorMessage;
            } catch { }
        }
        throw new Error(errorMessage);
    }

    if (contentType?.includes('application/json')) {
        return JSON.parse(bodyText);
    }

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
