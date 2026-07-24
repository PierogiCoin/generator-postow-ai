import type { VercelRequest, VercelResponse } from '@vercel/node';
import { proxyToBackend } from './_lib/proxy.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
  maxDuration: 300,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let rawUrl = req.url || '';
  // Gdy Vercel przekazuje zapytanie do catch-all /api/[...path], req.url to /api/[...path] lub req.query.path zawiera segmenty.
  if (rawUrl.includes('[...path]') || !rawUrl.startsWith('/api/')) {
    const segments = req.query.path;
    const suffix = Array.isArray(segments)
      ? segments.join('/')
      : typeof segments === 'string'
        ? segments
        : '';
    const queryIndex = rawUrl.indexOf('?');
    let query = queryIndex >= 0 ? rawUrl.slice(queryIndex) : '';

    if (query) {
      const urlParams = new URLSearchParams(query);
      urlParams.delete('path');
      const queryString = urlParams.toString();
      query = queryString ? `?${queryString}` : '';
    }

    rawUrl = `/api/${suffix}${query}`;
  }

  await proxyToBackend(req, res, rawUrl);
}
