import type { TFunction } from 'i18next';

export interface UserFacingError {
  title: string;
  message: string;
  action?: string;
  code?: string;
}

type ErrorLike = {
  message?: string;
  status?: number;
  code?: string;
};

const TECHNICAL_PATTERNS = [
  /failed to load resource/i,
  /failed to fetch/i,
  /networkerror/i,
  /load failed/i,
  /network request failed/i,
  /unexpected token/i,
  /json\.parse/i,
];

function extractErrorLike(error: unknown): ErrorLike {
  if (typeof error === 'string') return { message: error };
  if (error instanceof Error) {
    const e = error as Error & { status?: number; code?: string };
    return { message: e.message, status: e.status, code: e.code };
  }
  if (typeof error === 'object' && error !== null) {
    const e = error as ErrorLike;
    return { message: e.message, status: e.status, code: e.code };
  }
  return { message: '' };
}

function isTechnicalNoise(message: string): boolean {
  return TECHNICAL_PATTERNS.some((p) => p.test(message));
}

function tr(t: TFunction | undefined, key: string, fallback: string): string {
  if (!t) return fallback;
  return t(key, fallback);
}

function defaultUnknown(t?: TFunction, defaultKey?: string): UserFacingError {
  return {
    title: tr(t, 'errors.userFacing.unknownTitle', 'Coś poszło nie tak'),
    message: tr(t, defaultKey ?? 'errors.unknownError', 'Wystąpił nieoczekiwany błąd.'),
    action: tr(t, 'errors.userFacing.refreshAction', 'Odśwież stronę (Cmd+Shift+R) i spróbuj ponownie.'),
    code: 'unknown',
  };
}

/**
 * Zamienia surowe błędy API/sieci na komunikat z przyczyną i sugerowaną akcją.
 */
export function parseUserFacingError(
  error: unknown,
  t?: TFunction,
  defaultMessageKey = 'errors.unknownError'
): UserFacingError {
  const { message: rawMessage = '', status, code } = extractErrorLike(error);
  const message = rawMessage.trim();
  const lower = message.toLowerCase();

  if (message.includes('[SAFETY]')) {
    return {
      title: t?.('errors.safetyBlock.title', 'Treść zablokowana') ?? 'Treść zablokowana',
      message: t?.('errors.safetyBlock.details', 'Zmodyfikuj prompt i spróbuj ponownie.') ?? message,
      action: tr(t, 'errors.userFacing.safetyAction', 'Usuń wrażliwe słowa lub uprość temat posta.'),
      code: 'safety',
    };
  }

  if (
    code === 'GEMINI_QUOTA_EXCEEDED' ||
    status === 429 ||
    lower.includes('rate limit') ||
    lower.includes('quota') ||
    lower.includes('limit darmowego api gemini')
  ) {
    return {
      title: t?.('errors.rateLimit.title', 'Przekroczono limit') ?? 'Przekroczono limit',
      message:
        message && !isTechnicalNoise(message)
          ? message
          : (t?.('errors.rateLimit.details', 'Zbyt wiele zapytań do AI.') ?? 'Zbyt wiele zapytań do AI.'),
      action: tr(t, 'errors.userFacing.quotaAction', 'Poczekaj ok. godzinę lub włącz rozliczenia w Google AI Studio.'),
      code: 'quota',
    };
  }

  if (
    message.includes('API_KEY_INVALID') ||
    message.includes('API_KEY_SELECTION_REQUIRED') ||
    lower.includes('api key')
  ) {
    return {
      title: t?.('errors.apiKeyInvalid.title', 'Problem z kluczem API') ?? 'Problem z kluczem API',
      message: t?.('errors.apiKeyInvalid.details', 'Klucz jest nieprawidłowy lub bez uprawnień.') ?? message,
      action: tr(t, 'errors.userFacing.apiKeyAction', 'Sprawdź klucz w Google AI Studio i wybierz projekt z płatnościami.'),
      code: 'api_key',
    };
  }

  if (
    status === 402 ||
    code === 'insufficient_credits' ||
    lower.includes('insufficient_credits') ||
    lower.includes('brak kredytów')
  ) {
    return {
      title: tr(t, 'errors.userFacing.creditsTitle', 'Brak kredytów'),
      message:
        message && !isTechnicalNoise(message)
          ? message
          : tr(t, 'errors.userFacing.creditsMessage', 'Nie masz wystarczającej liczby kredytów na tę operację.'),
      action: tr(t, 'errors.userFacing.creditsAction', 'Otwórz cennik — wybierz plan lub dokup pakiet kredytów.'),
      code: 'insufficient_credits',
    };
  }

  if (status === 401 || status === 403 || lower.includes('not authenticated') || lower.includes('jwt')) {
    return {
      title: t?.('errors.userFacing.authTitle', 'Sesja wygasła') ?? 'Sesja wygasła',
      message: t?.('errors.userFacing.authMessage', 'Zaloguj się ponownie, aby kontynuować.') ?? message,
      action: tr(t, 'errors.userFacing.authAction', 'Wyloguj się i zaloguj ponownie.'),
      code: 'auth',
    };
  }

  if (
    lower.includes('favorite') ||
    lower.includes('favorites') ||
    lower.includes('ulubion') ||
    code === 'PGRST' ||
    lower.includes('row-level security') ||
    lower.includes('column') && lower.includes('does not exist')
  ) {
    return {
      title: t?.('errors.userFacing.favoritesTitle', 'Nie udało się zapisać ulubionych') ?? 'Nie udało się zapisać ulubionych',
      message:
        message && !isTechnicalNoise(message) && !lower.startsWith('failed to')
          ? message
          : (t?.('errors.userFacing.favoritesMessage', 'Zapis w bazie nie powiódł się.') ?? 'Zapis w bazie nie powiódł się.'),
      action: tr(t, 'errors.userFacing.favoritesAction', 'Odśwież stronę. Jeśli problem wraca — wyloguj się i zaloguj ponownie.'),
      code: 'favorites',
    };
  }

  if (
    lower.includes('video') ||
    lower.includes('wideo') ||
    lower.includes('veo') ||
    lower.includes('luma') ||
    lower.includes('replicate')
  ) {
    if (status === 503 || lower.includes('niedostępne') || lower.includes('unavailable')) {
      return {
        title: t?.('errors.userFacing.videoTitle', 'Generowanie wideo niedostępne') ?? 'Generowanie wideo niedostępne',
        message: t?.('errors.userFacing.videoUnavailable', 'Silnik wideo jest chwilowo niedostępny.') ?? message,
        action: tr(t, 'errors.userFacing.videoRetryAction', 'Spróbuj za chwilę lub wybierz inny silnik (Auto / Luma).'),
        code: 'video_unavailable',
      };
    }
    if (lower.includes('abort') || lower.includes('timeout') || lower.includes('limit 10 min')) {
      return {
        title: t?.('errors.userFacing.videoTimeoutTitle', 'Wideo trwa zbyt długo') ?? 'Wideo trwa zbyt długo',
        message: message || (t?.('errors.userFacing.videoTimeoutMessage', 'Przekroczono limit czasu generowania.') ?? ''),
        action: tr(t, 'errors.userFacing.videoTimeoutAction', 'Skróć tekst posta lub wybierz styl Instagram Story.'),
        code: 'video_timeout',
      };
    }
    return {
      title: t?.('errors.userFacing.videoTitle', 'Błąd generowania wideo') ?? 'Błąd generowania wideo',
      message: message && !isTechnicalNoise(message) ? message : (t?.('errors.generation_failed', 'Generowanie nie powiodło się.') ?? ''),
      action: tr(t, 'errors.userFacing.videoRetryAction', 'Spróbuj ponownie z silnikiem Auto.'),
      code: 'video',
    };
  }

  if (
    lower.includes('dynamically imported module') ||
    lower.includes('importing a module script failed') ||
    lower.includes('text/html') && lower.includes('mime')
  ) {
    return {
      title: t?.('errors.userFacing.staleBundleTitle', 'Stara wersja aplikacji') ?? 'Stara wersja aplikacji',
      message: t?.('errors.userFacing.staleBundleMessage', 'Przeglądarka używa nieaktualnego pliku JS.') ?? message,
      action: tr(t, 'errors.userFacing.refreshAction', 'Odśwież stronę (Cmd+Shift+R).'),
      code: 'stale_bundle',
    };
  }

  if (
    isTechnicalNoise(message) ||
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('connection')
  ) {
    return {
      title: t?.('errors.userFacing.networkTitle', 'Błąd połączenia') ?? 'Błąd połączenia',
      message: t?.('errors.userFacing.networkMessage', 'Nie udało się połączyć z serwerem.') ?? 'Nie udało się połączyć z serwerem.',
      action: tr(t, 'errors.userFacing.networkAction', 'Sprawdź internet i odśwież stronę.'),
      code: 'network',
    };
  }

  if (lower.includes('timeout') || lower.includes('abort') || lower.includes('czas oczekiwania')) {
    return {
      title: t?.('errors.userFacing.timeoutTitle', 'Przekroczono czas oczekiwania') ?? 'Przekroczono czas oczekiwania',
      message: message || (t?.('errors.userFacing.timeoutMessage', 'Serwer nie odpowiedział na czas.') ?? ''),
      action: tr(t, 'errors.userFacing.timeoutAction', 'Spróbuj ponownie za chwilę.'),
      code: 'timeout',
    };
  }

  if (status === 500 || status === 502 || status === 503) {
    return {
      title: t?.('errors.userFacing.serverTitle', 'Błąd serwera') ?? 'Błąd serwera',
      message: t?.('errors.userFacing.serverMessage', 'Coś poszło nie tak po stronie API.') ?? message,
      action: tr(t, 'errors.userFacing.serverAction', 'Spróbuj ponownie za 1–2 minuty.'),
      code: 'server',
    };
  }

  if (message && !isTechnicalNoise(message)) {
    return {
      title: t?.(defaultMessageKey, 'Operacja nie powiodła się') ?? 'Operacja nie powiodła się',
      message,
      action: tr(t, 'errors.userFacing.genericAction', 'Spróbuj ponownie lub odśwież stronę.'),
      code: code ?? 'generic',
    };
  }

  return defaultUnknown(t, defaultMessageKey);
}

export function formatUserFacingMessage(error: unknown, t?: TFunction): string {
  const parsed = parseUserFacingError(error, t);
  const parts = [parsed.title, parsed.message];
  if (parsed.action) parts.push(parsed.action);
  return parts.filter(Boolean).join(' — ');
}
