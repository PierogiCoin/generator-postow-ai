import { callApi } from './apiClient';

export interface BrandMemoryChunk {
  id: string;
  sourceType: 'url' | 'pdf' | 'manual' | 'top_post' | 'social' | 'history';
  title?: string;
  excerpt: string;
  platform?: string;
  engagementScore: number;
  sourceUrl?: string;
}

export interface BrandMemoryRetrieveResult {
  chunks: BrandMemoryChunk[];
  promptBlock: string;
  count: number;
}

export async function retrieveBrandMemoryContext(
  userId: string,
  opts: { topic?: string; platform?: string; limit?: number } = {}
): Promise<BrandMemoryRetrieveResult> {
  try {
    const data = await callApi(
      'brand-memory/retrieve',
      {
        topic: opts.topic,
        platform: opts.platform,
        limit: opts.limit ?? 6,
      },
      userId
    );
    return {
      chunks: (data?.chunks as BrandMemoryChunk[]) || [],
      promptBlock: typeof data?.promptBlock === 'string' ? data.promptBlock : '',
      count: Number(data?.count) || 0,
    };
  } catch {
    return { chunks: [], promptBlock: '', count: 0 };
  }
}

export async function ingestBrandMemory(
  userId: string,
  input: {
    sourceType: 'url' | 'pdf' | 'manual' | 'top_post';
    excerpt: string;
    title?: string;
    sourceUrl?: string;
    platform?: string;
    engagementScore?: number;
  }
): Promise<string | null> {
  const data = await callApi('brand-memory/ingest', input, userId);
  return typeof data?.id === 'string' ? data.id : null;
}
