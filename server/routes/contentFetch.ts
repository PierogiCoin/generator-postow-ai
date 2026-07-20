import { Router } from 'express';
import { requireSupabaseAuth, getAuthUserId } from '../middleware/supabaseAuth.js';
import logger from '../logger.js';

const MAX_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 12_000;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html: string): string {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return og[1].trim();
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return title?.[1]?.trim() || '';
}

function extractRssItems(xml: string): { title: string; text: string } {
  const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].slice(0, 5);
  if (items.length === 0) {
    const entries = [...xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)].slice(0, 5);
    const parts = entries.map((m) => {
      const block = m[0];
      const t = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
      const summary =
        block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ||
        block.match(/<content[^>]*>([\s\S]*?)<\/content>/i)?.[1] ||
        '';
      return `${stripHtml(t)}\n${stripHtml(summary)}`;
    });
    return {
      title: stripHtml(entries[0]?.[0]?.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || 'RSS'),
      text: parts.join('\n\n---\n\n'),
    };
  }

  const parts = items.map((m) => {
    const block = m[0];
    const t = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
    const desc =
      block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ||
      block.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i)?.[1] ||
      '';
    return `${stripHtml(t)}\n${stripHtml(desc)}`;
  });

  return {
    title: stripHtml(items[0][0].match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || 'RSS'),
    text: parts.join('\n\n---\n\n'),
  };
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  return false;
}

export function createContentFetchRouter(): Router {
  const router = Router();

  router.post('/api/content/fetch-url', requireSupabaseAuth, async (req, res) => {
    try {
      getAuthUserId(req);
      const urlRaw = String(req.body?.url || '').trim();
      if (!urlRaw) {
        return res.status(400).json({ message: 'Brak URL' });
      }

      let parsed: URL;
      try {
        parsed = new URL(urlRaw);
      } catch {
        return res.status(400).json({ message: 'Nieprawidłowy URL' });
      }

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return res.status(400).json({ message: 'Dozwolone tylko http/https' });
      }
      if (isPrivateHost(parsed.hostname)) {
        return res.status(400).json({ message: 'URL niedozwolony' });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(parsed.toString(), {
          signal: controller.signal,
          headers: {
            'User-Agent': 'GeneratorPostowAI-ContentFetch/1.0',
            Accept: 'text/html, application/rss+xml, application/atom+xml, application/xml, text/xml, text/plain',
          },
          redirect: 'follow',
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        return res.status(502).json({ message: `Nie udało się pobrać URL (${response.status})` });
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const buf = Buffer.from(await response.arrayBuffer());
      if (buf.byteLength > MAX_BYTES) {
        return res.status(413).json({ message: 'Treść zbyt duża' });
      }
      const raw = buf.toString('utf8');

      const looksRss =
        contentType.includes('xml') ||
        contentType.includes('rss') ||
        contentType.includes('atom') ||
        /<rss[\s>]/i.test(raw) ||
        /<feed[\s>]/i.test(raw);

      if (looksRss) {
        const { title, text } = extractRssItems(raw);
        if (!text || text.length < 20) {
          return res.status(422).json({ message: 'Feed RSS bez użytecznej treści' });
        }
        return res.json({
          title,
          text: text.slice(0, 20000),
          kind: 'rss',
        });
      }

      const title = extractTitle(raw);
      const text = stripHtml(raw).slice(0, 20000);
      if (text.length < 40) {
        return res.status(422).json({ message: 'Za mało tekstu na stronie' });
      }

      return res.json({ title, text, kind: 'html' });
    } catch (error) {
      logger.error('content/fetch-url error', error);
      const aborted = error instanceof Error && error.name === 'AbortError';
      return res.status(aborted ? 504 : 500).json({
        message: aborted ? 'Timeout pobierania URL' : 'Błąd pobierania treści',
      });
    }
  });

  return router;
}
