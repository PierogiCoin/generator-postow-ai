import { callApi } from './apiClient';
import { Platform } from '../types';
import { STORAGE_KEYS } from '../utils/storageUtils';
import { getSupabase } from './supabaseClient';
import {
  analyzeCompetitorDeep,
  type DeepCompetitorAnalysis,
  type IntelligenceSource,
} from './intelligenceService';

export interface TrackedCompetitor {
  id: string;
  handle: string;
  platform: Platform;
  niche: string;
  addedAt: string;
  lastAnalyzedAt?: string;
  analysis?: CompetitorAnalysis;
}

export interface CompetitorAnalysis {
  topHashtags: string[];
  hashtagStrategy: string;
  hashtagPatterns: string[];
  hashtagRecommendations: string[];
  bestPostingTimes: string[];
  worstPostingTimes: string[];
  timingGaps: string[];
  timingRecommendation: string;
  contentThemes: string[];
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  contentGaps?: string[];
  summary: string;
  estimated?: boolean;
  sources?: IntelligenceSource[];
  recentNewsAngles?: { title: string; angle: string; url?: string }[];
}

const STORAGE_KEY = STORAGE_KEYS.COMPETITORS;
const MAX_COMPETITORS = 25;
const MIGRATION_FLAG = 'so_competitors_migrated_v1';

type CompetitorRow = {
  id: string;
  user_id: string;
  handle: string;
  platform: string;
  niche: string;
  analysis: CompetitorAnalysis | null;
  last_analyzed_at: string | null;
  added_at: string;
};

function storageKey(userId?: string): string {
  return userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
}

function readLocalCompetitors(userId?: string): TrackedCompetitor[] {
  try {
    const key = storageKey(userId);
    let raw = localStorage.getItem(key);
    if (!raw && userId) {
      raw = localStorage.getItem(STORAGE_KEY);
      if (raw) localStorage.setItem(key, raw);
    }
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rowToCompetitor(row: CompetitorRow): TrackedCompetitor {
  return {
    id: row.id,
    handle: row.handle,
    platform: row.platform as Platform,
    niche: row.niche,
    addedAt: row.added_at,
    lastAnalyzedAt: row.last_analyzed_at ?? undefined,
    analysis: row.analysis ?? undefined,
  };
}

async function migrateLocalCompetitorsIfNeeded(userId: string): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  const flagKey = `${MIGRATION_FLAG}_${userId}`;
  if (localStorage.getItem(flagKey)) return;

  const local = readLocalCompetitors(userId);
  const supabase = getSupabase();

  if (local.length > 0) {
    const rows = local.map((c) => ({
      user_id: userId,
      handle: c.handle,
      platform: c.platform,
      niche: c.niche,
      analysis: c.analysis ?? null,
      last_analyzed_at: c.lastAnalyzedAt ?? null,
      added_at: c.addedAt,
    }));

    const { error } = await supabase
      .from('tracked_competitors')
      .upsert(rows, { onConflict: 'user_id,platform,handle' });

    if (!error) {
      localStorage.removeItem(storageKey(userId));
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  localStorage.setItem(flagKey, '1');
}

export async function fetchTrackedCompetitors(userId: string): Promise<TrackedCompetitor[]> {
  await migrateLocalCompetitorsIfNeeded(userId);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('tracked_competitors')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  if (error) {
    console.warn('[competitors] Supabase fetch failed, falling back to localStorage', error.message);
    return readLocalCompetitors(userId);
  }

  return (data as CompetitorRow[]).map(rowToCompetitor);
}

/** @deprecated Użyj fetchTrackedCompetitors — synchroniczny odczyt tylko z localStorage */
export function getTrackedCompetitors(userId?: string): TrackedCompetitor[] {
  return readLocalCompetitors(userId);
}

export async function addTrackedCompetitor(
  handle: string,
  platform: Platform,
  niche: string,
  userId: string
): Promise<TrackedCompetitor> {
  await migrateLocalCompetitorsIfNeeded(userId);

  const normalizedHandle = normalizeCompetitorHandle(handle);
  const normalizedNiche = niche.trim();

  const existing = await fetchTrackedCompetitors(userId);
  if (existing.length >= MAX_COMPETITORS) {
    throw new Error(`Możesz śledzić maksymalnie ${MAX_COMPETITORS} konkurentów. Usuń jednego, aby dodać nowego.`);
  }

  const duplicate = existing.find(
    (c) => c.handle.toLowerCase() === normalizedHandle.toLowerCase() && c.platform === platform
  );
  if (duplicate) {
    throw new Error('Ten konkurent jest już na liście.');
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('tracked_competitors')
    .insert({
      user_id: userId,
      handle: normalizedHandle,
      platform,
      niche: normalizedNiche,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Ten konkurent jest już na liście.');
    throw new Error(error.message);
  }

  return rowToCompetitor(data as CompetitorRow);
}

export async function removeTrackedCompetitor(id: string, userId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('tracked_competitors')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

export async function updateCompetitorAnalysis(
  id: string,
  analysis: CompetitorAnalysis,
  userId: string
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('tracked_competitors')
    .update({
      analysis,
      last_analyzed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

export function normalizeCompetitorHandle(handle: string): string {
  return handle.trim().replace(/^@+/, '').replace(/\s+/g, '');
}

export async function analyzeCompetitor(
  handle: string,
  platform: Platform,
  niche: string,
  userId: string
): Promise<CompetitorAnalysis> {
  try {
    const { analysis, sources } = await analyzeCompetitorDeep(handle, platform, niche, userId);
    return mapDeepAnalysis(analysis, sources);
  } catch {
    return analyzeCompetitorLegacy(handle, platform, niche, userId);
  }
}

function mapDeepAnalysis(analysis: DeepCompetitorAnalysis, sources: IntelligenceSource[]): CompetitorAnalysis {
  const timingGaps =
    analysis.timingGaps?.length > 0
      ? analysis.timingGaps
      : (analysis.hourlyActivity || [])
          .filter((h) => h.density <= 3)
          .slice(0, 5)
          .map((h) => {
            const days = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
            return `${days[h.weekday] ?? '?'} ${String(h.hour).padStart(2, '0')}:00 — niska aktywność (${h.density}/10)`;
          });

  return {
    topHashtags: analysis.topHashtags || [],
    hashtagStrategy: analysis.hashtagStrategy || '',
    hashtagPatterns: analysis.hashtagPatterns || [],
    hashtagRecommendations: analysis.hashtagRecommendations || [],
    bestPostingTimes: analysis.bestPostingTimes || [],
    worstPostingTimes: analysis.worstPostingTimes || [],
    timingGaps,
    timingRecommendation: analysis.timingRecommendation || '',
    contentThemes: analysis.contentThemes || [],
    strengths: analysis.strengths || [],
    weaknesses: analysis.weaknesses || [],
    opportunities: analysis.opportunities || [],
    contentGaps: analysis.contentGaps || [],
    summary: analysis.summary || '',
    estimated: analysis.estimated,
    sources,
    recentNewsAngles: analysis.recentNewsAngles,
  };
}

async function analyzeCompetitorLegacy(
  handle: string,
  platform: Platform,
  niche: string,
  userId: string
): Promise<CompetitorAnalysis> {
  const prompt = `You are a competitive intelligence analyst. Analyze the social media strategy of @${handle} on ${platform} in the ${niche} niche.

Based on industry knowledge and typical patterns for this type of account, provide:

HASHTAG ANALYSIS:
1. TOP_HASHTAGS: 10 hashtags they likely use most (comma-separated)
2. HASHTAG_STRATEGY: Their overall hashtag approach (1-2 sentences)
3. HASHTAG_PATTERNS: 3 patterns in their usage (one per line)
4. HASHTAG_RECOMMENDATIONS: 5 ways to adapt their strategy for your account (one per line)

TIMING ANALYSIS:
5. BEST_TIMES: Their top 5 posting times (e.g. "Monday 9:00", one per line)
6. WORST_TIMES: 3 times to avoid competing (one per line)
7. TIMING_GAPS: 3 time gaps you could exploit (one per line)
8. TIMING_RECOMMENDATION: One strategic sentence about when you should post

CONTENT ANALYSIS:
9. CONTENT_THEMES: 5 main topics/themes they cover (one per line)
10. STRENGTHS: 3 things they do well (one per line)
11. WEAKNESSES: 3 things they do poorly or miss (one per line)
12. OPPORTUNITIES: 3 content gaps you could exploit (one per line)
13. SUMMARY: 2-3 sentence strategic summary of their approach and how you can beat them`;

  const response = await callApi('generate-content', {
    model: 'gemini-2.5-flash',
    contents: prompt,
    systemInstruction: 'You are a competitive intelligence analyst specializing in social media strategy. Provide actionable, specific insights.',
  }, userId);

  return parseCompetitorAnalysis(response.text || response);
}

function parseSection(text: string, label: string, nextLabel: string): string[] {
  const regex = new RegExp(`${label}:\\s*([\\s\\S]*?)(?=${nextLabel}:|$)`, 'i');
  const match = text.match(regex);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map(l => l.replace(/^[-•*\d.]\s*/, '').trim())
    .filter(l => l.length > 3);
}

function parseSingleLine(text: string, label: string, nextLabel: string): string {
  const lines = parseSection(text, label, nextLabel);
  return lines[0] || '';
}

function parseHashtagList(text: string): string[] {
  const regex = /TOP_HASHTAGS:\s*([^\n]+)/i;
  const match = text.match(regex);
  if (!match) return [];
  return match[1]
    .split(/[,\s]+/)
    .map(h => h.replace(/^#/, '').trim())
    .filter(h => h.length > 1);
}

function parseCompetitorAnalysis(text: string): CompetitorAnalysis {
  return {
    topHashtags: parseHashtagList(text),
    hashtagStrategy: parseSingleLine(text, 'HASHTAG_STRATEGY', 'HASHTAG_PATTERNS'),
    hashtagPatterns: parseSection(text, 'HASHTAG_PATTERNS', 'HASHTAG_RECOMMENDATIONS'),
    hashtagRecommendations: parseSection(text, 'HASHTAG_RECOMMENDATIONS', 'BEST_TIMES'),
    bestPostingTimes: parseSection(text, 'BEST_TIMES', 'WORST_TIMES'),
    worstPostingTimes: parseSection(text, 'WORST_TIMES', 'TIMING_GAPS'),
    timingGaps: parseSection(text, 'TIMING_GAPS', 'TIMING_RECOMMENDATION'),
    timingRecommendation: parseSingleLine(text, 'TIMING_RECOMMENDATION', 'CONTENT_THEMES'),
    contentThemes: parseSection(text, 'CONTENT_THEMES', 'STRENGTHS'),
    strengths: parseSection(text, 'STRENGTHS', 'WEAKNESSES'),
    weaknesses: parseSection(text, 'WEAKNESSES', 'OPPORTUNITIES'),
    opportunities: parseSection(text, 'OPPORTUNITIES', 'SUMMARY'),
    summary: parseSingleLine(text, 'SUMMARY', '___END___'),
  };
}
