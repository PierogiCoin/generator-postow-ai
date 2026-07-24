import type { VercelRequest, VercelResponse } from '@vercel/node';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'te',
  'trailer',
  'upgrade',
  'host',
]);

function getBackendBaseUrl(): string | null {
  const url = process.env.BACKEND_URL?.trim().replace(/\/$/, '');
  return url || null;
}

export function buildTargetUrl(req: VercelRequest, pathOverride?: string): string | null {
  const backend = getBackendBaseUrl();
  if (!backend) return null;

  const rawPath = pathOverride ?? req.url ?? '/';
  const [pathname, search = ''] = rawPath.split('?');
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${backend}${normalizedPath}${search ? `?${search}` : ''}`;
}

export function buildForwardHeaders(req: VercelRequest): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || HOP_BY_HOP.has(key.toLowerCase())) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  return headers;
}

export function buildRequestBody(req: VercelRequest): string | undefined {
  if (!req.method || ['GET', 'HEAD'].includes(req.method)) return undefined;
  if (req.body === undefined || req.body === null) return undefined;
  if (typeof req.body === 'string') return req.body;
  return JSON.stringify(req.body);
}

async function pipeStream(response: Response, res: VercelResponse): Promise<void> {
  if (!response.body) {
    res.end();
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(decoder.decode(value, { stream: true }));
  }

  res.end();
}

export async function proxyToBackend(
  req: VercelRequest,
  res: VercelResponse,
  pathOverride?: string
): Promise<void> {
  const targetUrl = buildTargetUrl(req, pathOverride);
  if (!targetUrl) {
    res.status(503).json({
      error: 'Backend not configured',
      message: 'Ustaw zmienną BACKEND_URL w Vercel (URL wdrożonego serwera Express, np. Railway).',
    });
    return;
  }

  const headers = buildForwardHeaders(req);
  const body = buildRequestBody(req);

  if (body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(502).json({
      error: 'Backend unreachable',
      message,
      backend: getBackendBaseUrl(),
    });
    return;
  }

  res.status(response.status);
  response.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (!HOP_BY_HOP.has(lowerKey) && lowerKey !== 'content-encoding' && lowerKey !== 'content-length') {
      res.setHeader(key, value);
    }
  });

  const contentType = response.headers.get('content-type') || '';

  if (
    contentType.includes('text/event-stream') ||
    (contentType.includes('text/plain') && response.body)
  ) {
    await pipeStream(response, res);
    return;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  res.send(buffer);
}
