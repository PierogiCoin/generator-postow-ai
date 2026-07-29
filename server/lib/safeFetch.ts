/** Anti-SSRF URL validation + fetch with manual redirect re-validation. */

const MAX_REDIRECTS = 3;

export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (h === '0.0.0.0' || h === '[::1]' || h === '::1') return true;
  return false;
}

export function assertSafeUrl(urlRaw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(urlRaw);
  } catch {
    throw Object.assign(new Error('Nieprawidłowy URL'), { status: 400 });
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw Object.assign(new Error('Dozwolone tylko http/https'), { status: 400 });
  }
  if (isPrivateHost(parsed.hostname)) {
    throw Object.assign(new Error('URL niedozwolony'), { status: 400 });
  }
  return parsed;
}

export type SafeFetchOptions = {
  signal?: AbortSignal;
  userAgent?: string;
  accept?: string;
  maxRedirects?: number;
};

/** Fetch z ręczną obsługą redirectów — każdy hop re-waliduje host (anti-SSRF). */
export async function safeFetch(
  startUrl: string,
  options: SafeFetchOptions = {}
): Promise<Response> {
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  let current = assertSafeUrl(startUrl).toString();

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const response = await fetch(current, {
      signal: options.signal,
      headers: {
        'User-Agent': options.userAgent || 'GeneratorPostowAI-SafeFetch/1.0',
        Accept:
          options.accept ||
          'text/html, application/rss+xml, application/atom+xml, application/xml, text/xml, text/plain',
      },
      redirect: 'manual',
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw Object.assign(new Error('Redirect bez Location'), { status: 502 });
      }
      const next = new URL(location, current).toString();
      assertSafeUrl(next);
      current = next;
      continue;
    }

    return response;
  }

  throw Object.assign(new Error('Za dużo przekierowań'), { status: 502 });
}
