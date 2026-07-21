/**
 * Brand Memory retrieval — engagement-ranked + keyword overlap (lightweight RAG).
 * Full pgvector can replace tokenizeSimilarity later without changing the API.
 */

import { supabase } from './clients.js';
import logger from '../logger.js';

export interface BrandMemoryChunk {
  id: string;
  sourceType: 'url' | 'pdf' | 'manual' | 'top_post' | 'social' | 'history';
  title?: string;
  excerpt: string;
  platform?: string;
  engagementScore: number;
  sourceUrl?: string;
}

export interface BrandMemoryRetrieveOptions {
  userId: string;
  topic?: string;
  platform?: string;
  limit?: number;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9ąćęłńóśźżàáâäãåèéêëìíîïòóôöùúûüç]+/i)
      .filter((t) => t.length > 2)
  );
}

/** Jaccard-like overlap on tokens (0–1). */
export function tokenizeSimilarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) {
    if (tb.has(t)) inter += 1;
  }
  return inter / (ta.size + tb.size - inter);
}

function engagementFromMetrics(metrics: Record<string, unknown> | null | undefined): number {
  if (!metrics || typeof metrics !== 'object') return 0;
  const likes = Number(metrics.likes) || 0;
  const comments = Number(metrics.comments) || 0;
  const shares = Number(metrics.shares) || 0;
  const views = Number(metrics.views) || 0;
  const reach = Number(metrics.reach) || 0;
  const impressions = Number(metrics.impressions) || 0;
  // Weighted ER proxy
  return likes * 1 + comments * 3 + shares * 4 + views * 0.01 + reach * 0.02 + impressions * 0.005;
}

function rankChunks(
  chunks: BrandMemoryChunk[],
  topic: string | undefined,
  limit: number
): BrandMemoryChunk[] {
  const scored = chunks.map((c) => {
    const topicBoost = topic ? tokenizeSimilarity(topic, `${c.title || ''} ${c.excerpt}`) : 0;
    const score = c.engagementScore * (1 + topicBoost * 2) + topicBoost * 50;
    return { chunk: c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  // Deduplicate near-identical excerpts
  const seen = new Set<string>();
  const out: BrandMemoryChunk[] = [];
  for (const { chunk } of scored) {
    const key = chunk.excerpt.slice(0, 80).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(chunk);
    if (out.length >= limit) break;
  }
  return out;
}

export async function retrieveBrandMemory(
  options: BrandMemoryRetrieveOptions
): Promise<BrandMemoryChunk[]> {
  const { userId, topic, platform, limit = 6 } = options;
  const chunks: BrandMemoryChunk[] = [];

  try {
    const { data: docs, error: docsErr } = await supabase
      .from('brand_memory_documents')
      .select('id, source_type, source_url, title, excerpt, platform, engagement_score')
      .eq('user_id', userId)
      .order('engagement_score', { ascending: false })
      .limit(40);

    if (docsErr) {
      // Table may not exist yet — continue with social/history
      logger.warn('[BrandMemory] documents query:', docsErr.message);
    } else if (docs) {
      for (const d of docs) {
        chunks.push({
          id: d.id,
          sourceType: d.source_type,
          title: d.title || undefined,
          excerpt: (d.excerpt || '').slice(0, 800),
          platform: d.platform || undefined,
          engagementScore: Number(d.engagement_score) || 0,
          sourceUrl: d.source_url || undefined,
        });
      }
    }
  } catch (e) {
    logger.warn('[BrandMemory] documents exception', e);
  }

  try {
    let q = supabase
      .from('social_posts')
      .select('id, content, platform, url, metrics')
      .eq('user_id', userId)
      .not('content', 'is', null)
      .order('published_at', { ascending: false })
      .limit(50);

    if (platform) {
      q = q.ilike('platform', platform);
    }

    const { data: posts, error } = await q;
    if (error) {
      logger.warn('[BrandMemory] social_posts:', error.message);
    } else if (posts) {
      for (const p of posts) {
        const content = (p.content || '').trim();
        if (content.length < 40) continue;
        chunks.push({
          id: `social-${p.id}`,
          sourceType: 'social',
          excerpt: content.slice(0, 800),
          platform: p.platform || undefined,
          engagementScore: engagementFromMetrics(p.metrics as Record<string, unknown>),
          sourceUrl: p.url || undefined,
          title: 'Top social post',
        });
      }
    }
  } catch (e) {
    logger.warn('[BrandMemory] social exception', e);
  }

  try {
    const { data: history, error } = await supabase
      .from('history')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(30);

    if (error) {
      logger.warn('[BrandMemory] history:', error.message);
    } else if (history) {
      for (const h of history) {
        const row = h as Record<string, unknown>;
        const result = row.result as { postText?: string } | null | undefined;
        const text = String(
          result?.postText ||
            (typeof row.content === 'string' ? row.content : '') ||
            ''
        ).trim();
        if (text.length < 40) continue;
        const formData = row.form_data as { platform?: string } | null | undefined;
        const histPlatform =
          formData?.platform ||
          (typeof row.platform === 'string' ? row.platform : undefined);
        if (platform && histPlatform && histPlatform.toLowerCase() !== platform.toLowerCase()) {
          continue;
        }
        chunks.push({
          id: `history-${String(row.id)}`,
          sourceType: 'history',
          excerpt: text.slice(0, 800),
          platform: histPlatform,
          engagementScore: 5,
          title: 'Recent generation',
        });
      }
    }
  } catch (e) {
    logger.warn('[BrandMemory] history exception', e);
  }

  return rankChunks(chunks, topic, limit);
}

export function formatBrandMemoryPromptBlock(chunks: BrandMemoryChunk[]): string {
  if (!chunks.length) return '';
  const lines = chunks.map((c, i) => {
    const meta = [
      c.sourceType,
      c.platform,
      c.engagementScore > 0 ? `ER~${Math.round(c.engagementScore)}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    return `${i + 1}. [${meta}]\n${c.excerpt}`;
  });
  return `BRAND MEMORY (retrieve top-performing / reference content — match voice, hooks, structure; do NOT copy verbatim):
${lines.join('\n\n')}`;
}

export async function ingestBrandMemoryDocument(input: {
  userId: string;
  sourceType: 'url' | 'pdf' | 'manual' | 'top_post';
  excerpt: string;
  title?: string;
  sourceUrl?: string;
  platform?: string;
  engagementScore?: number;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string } | null> {
  const excerpt = input.excerpt.trim().slice(0, 12000);
  if (excerpt.length < 20) return null;

  const { data, error } = await supabase
    .from('brand_memory_documents')
    .insert({
      user_id: input.userId,
      source_type: input.sourceType,
      source_url: input.sourceUrl || null,
      title: input.title || null,
      excerpt,
      platform: input.platform || null,
      engagement_score: input.engagementScore ?? 0,
      metadata: input.metadata || {},
    })
    .select('id')
    .single();

  if (error) {
    logger.error('[BrandMemory] ingest failed:', error.message);
    throw error;
  }
  return data ? { id: data.id } : null;
}
