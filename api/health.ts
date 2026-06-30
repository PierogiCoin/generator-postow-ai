import type { VercelRequest, VercelResponse } from '@vercel/node';
import { proxyToBackend } from './_lib/proxy.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await proxyToBackend(req, res, '/health');
}
