import { callApi } from './apiClient';
import { STORAGE_KEYS } from '../utils/storageUtils';

export interface PostMortemReport {
  overallScore: number; // 1-10
  verdict: 'hit' | 'miss' | 'average';
  whatWorked: string[];
  whatFailed: string[];
  keyLesson: string;
  nextTimeRecommendation: string;
  bestTimeToRepost?: string;
  suggestedImprovedHook?: string;
}

const STORAGE_KEY = STORAGE_KEYS.POST_MORTEMS;

export function getCachedPostMortem(postId: string): PostMortemReport | null {
  try {
    const cache = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return cache[postId] || null;
  } catch {
    return null;
  }
}

function cachePostMortem(postId: string, report: PostMortemReport): void {
  try {
    const cache = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    cache[postId] = report;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {}
}

export async function generatePostMortem(
  postContent: string,
  platform: string,
  publishedAt: string,
  metrics: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
    reach?: number;
  },
  userId: string,
  postId?: string
): Promise<PostMortemReport> {
  if (postId) {
    const cached = getCachedPostMortem(postId);
    if (cached) return cached;
  }

  const hoursAgo = Math.floor((Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60));
  const engagementRate = metrics.views && metrics.likes
    ? ((metrics.likes + (metrics.comments || 0) + (metrics.shares || 0)) / metrics.views * 100).toFixed(2)
    : null;

  const prompt = `Perform a POST-MORTEM analysis of this ${platform} post published ${hoursAgo} hours ago:

CONTENT:
"${postContent.slice(0, 500)}"

METRICS:
- Likes: ${metrics.likes ?? 'unknown'}
- Comments: ${metrics.comments ?? 'unknown'}
- Shares: ${metrics.shares ?? 'unknown'}
- Views/Reach: ${metrics.views ?? metrics.reach ?? 'unknown'}
${engagementRate ? `- Engagement rate: ${engagementRate}%` : ''}

Analyze performance and provide:
1. OVERALL_SCORE: Rate performance 1-10 based on typical ${platform} benchmarks
2. VERDICT: one of: hit | miss | average
3. WHAT_WORKED: 2-3 specific elements that drove positive results (one per line)
4. WHAT_FAILED: 2-3 specific elements that hurt performance or are missing (one per line)
5. KEY_LESSON: The single most important takeaway from this post's performance (one sentence)
6. NEXT_TIME: One concrete recommendation to improve the next similar post (one sentence)
7. BEST_REPOST_TIME: Best day and time to repost/reshare this content if it underperformed
8. IMPROVED_HOOK: A rewritten, more engaging opening line for this post`;

  const response = await callApi('generate-content', {
    model: 'gemini-2.5-flash',
    contents: prompt,
    systemInstruction: 'You are a social media performance analyst. Be specific, data-driven, and actionable. Focus on what actually drives engagement on this platform.',
  }, userId);

  const report = parsePostMortem(response.text || response);
  if (postId) cachePostMortem(postId, report);
  return report;
}

function parsePostMortem(text: string): PostMortemReport {
  const lines = text.split('\n');

  const getLine = (label: string): string => {
    const regex = new RegExp(`${label}:\\s*(.+)`, 'i');
    const match = text.match(regex);
    return match?.[1]?.trim() || '';
  };

  const getSection = (label: string, nextLabel: string): string[] => {
    const regex = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=${nextLabel}:|$)`, 'i');
    const match = text.match(regex);
    if (!match) return [];
    return match[1]
      .split('\n')
      .map(l => l.replace(/^[-•*\d.]\s*/, '').trim())
      .filter(l => l.length > 5);
  };

  const scoreMatch = text.match(/OVERALL_SCORE:\s*(\d+)/i);
  const score = scoreMatch ? Math.min(10, Math.max(1, parseInt(scoreMatch[1]))) : 5;

  const verdictRaw = getLine('VERDICT').toLowerCase();
  const verdict: PostMortemReport['verdict'] =
    verdictRaw.includes('hit') ? 'hit' :
    verdictRaw.includes('miss') ? 'miss' : 'average';

  return {
    overallScore: score,
    verdict,
    whatWorked: getSection('WHAT_WORKED', 'WHAT_FAILED'),
    whatFailed: getSection('WHAT_FAILED', 'KEY_LESSON'),
    keyLesson: getLine('KEY_LESSON'),
    nextTimeRecommendation: getLine('NEXT_TIME'),
    bestTimeToRepost: getLine('BEST_REPOST_TIME') || undefined,
    suggestedImprovedHook: getLine('IMPROVED_HOOK') || undefined,
  };
}
