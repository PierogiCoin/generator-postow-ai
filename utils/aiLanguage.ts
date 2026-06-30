import { i18n } from '../i18n';
import { useGenerationStore } from '../stores/generationStore';
import { ContentLanguage } from '../types';

const LANGUAGE_LABELS: Record<string, string> = {
  pl: 'Polish (polski)',
  en: 'English',
  de: 'German (Deutsch)',
  cs: 'Czech (čeština)',
};

type AiPayload = {
  contents?: unknown;
  config?: { systemInstruction?: string; [key: string]: unknown };
  systemInstruction?: string;
  contentLanguage?: ContentLanguage | string;
  [key: string]: unknown;
};

export function getAppLanguageCode(): string {
  if (typeof window === 'undefined') return 'pl';
  const raw = i18n.language || i18n.resolvedLanguage || 'pl';
  return raw.split('-')[0].toLowerCase();
}

export function getAppLocale(): string {
  const code = getAppLanguageCode();
  if (code === 'en') return 'en-US';
  if (code === 'de') return 'de-DE';
  if (code === 'cs') return 'cs-CZ';
  return 'pl-PL';
}

/** Język treści AI: z payloadu → ostatni formularz → język UI. */
export function resolveAiLanguageCode(payload?: { contentLanguage?: ContentLanguage | string }): string {
  if (payload?.contentLanguage) {
    return String(payload.contentLanguage).split('-')[0].toLowerCase();
  }
  const fromForm = useGenerationStore.getState().lastFormData?.contentLanguage;
  if (fromForm) return String(fromForm).split('-')[0].toLowerCase();
  return getAppLanguageCode();
}

export function getAiLanguageLabel(code?: string): string {
  const lang = (code || resolveAiLanguageCode()).split('-')[0].toLowerCase();
  return LANGUAGE_LABELS[lang] ?? LANGUAGE_LABELS.en;
}

export function getAiLanguageInstruction(code?: string): string {
  const label = getAiLanguageLabel(code);
  return `LANGUAGE (CRITICAL): Write ALL user-facing output exclusively in ${label}. Use natural idioms and culturally appropriate style for that language. JSON string values must also be in ${label}. Do not mix languages unless the user explicitly requests another language.`;
}

/** Przenosi legacy `systemInstruction` z root do `config`. */
export function normalizeAiPayload<T extends AiPayload>(payload: T): T {
  if (typeof payload.systemInstruction !== 'string') return payload;

  const systemInstruction = payload.systemInstruction;
  const { systemInstruction: _removed, ...rest } = payload;
  const baseConfig: NonNullable<AiPayload['config']> =
    rest.config && typeof rest.config === 'object' ? rest.config : {};
  const existing =
    typeof baseConfig.systemInstruction === 'string' ? baseConfig.systemInstruction : undefined;

  return {
    ...rest,
    config: {
      ...baseConfig,
      systemInstruction: existing ? `${existing}\n\n${systemInstruction}` : systemInstruction,
    },
  } as T;
}

export function stripContentLanguage<T extends AiPayload>(payload: T): T {
  if (!payload || typeof payload !== 'object') return payload;
  const { contentLanguage: _removed, ...rest } = payload;
  return rest as T;
}

export function applyAiLanguage<T extends AiPayload>(payload: T, langCode?: string): T {
  const code = langCode ?? resolveAiLanguageCode(payload);
  const withoutMeta = stripContentLanguage(payload);
  const normalized = normalizeAiPayload(withoutMeta);
  const instruction = getAiLanguageInstruction(code);
  const existing = normalized.config?.systemInstruction;

  return {
    ...normalized,
    config: {
      ...normalized.config,
      systemInstruction: existing ? `${existing}\n\n${instruction}` : instruction,
    },
  };
}

export function isAiTextEndpoint(endpoint: string, payload: unknown): boolean {
  const aiEndpoints = new Set([
    'generate-content',
    'generate-content-stream',
    'generate-batch',
    'optimize-multi-platform',
    'generate-ab-variants',
    'generate',
  ]);
  if (aiEndpoints.has(endpoint)) return true;
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return 'contents' in p && typeof p.model === 'string';
}
