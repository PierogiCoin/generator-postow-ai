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
  const segments = req.query.path;
  const suffix = Array.isArray(segments) ? segments.join('/') : segments || '';
  const queryIndex = (req.url || '').indexOf('?');
  const query = queryIndex >= 0 ? req.url!.slice(queryIndex) : '';
  const apiPath = `/api/${suffix}${query}`;

  await proxyToBackend(req, res, apiPath);
}
