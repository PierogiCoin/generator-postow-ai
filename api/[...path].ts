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
  // Vercel serverless request path usually arrives as /api/... or /api/[...path]
  if (!rawUrl.startsWith('/api/')) {
    const segments = req.query.path;
    const suffix = Array.isArray(segments) ? segments.join('/') : segments || '';
    const queryIndex = rawUrl.indexOf('?');
    const query = queryIndex >= 0 ? rawUrl.slice(queryIndex) : '';
    rawUrl = `/api/${suffix}${query}`;
  }

  await proxyToBackend(req, res, rawUrl);
}
