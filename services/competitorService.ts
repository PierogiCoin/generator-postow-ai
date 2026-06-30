import { callApi } from './apiClient';
import { Platform } from '../types';
import { STORAGE_KEYS } from '../utils/storageUtils';

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
  summary: string;
}

const STORAGE_KEY = STORAGE_KEYS.COMPETITORS;
const MAX_COMPETITORS = 25;

function storageKey(userId?: string): string {
  return userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
}

function readCompetitors(userId?: string): TrackedCompetitor[] {
  try {
    const key = storageKey(userId);
    let raw = localStorage.getItem(key);
    if (!raw && userId) {
      raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        localStorage.setItem(key, raw);
      }
    }
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getTrackedCompetitors(userId?: string): TrackedCompetitor[] {
  return readCompetitors(userId);
}

export function saveTrackedCompetitors(competitors: TrackedCompetitor[], userId?: string): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(competitors));
}

export function normalizeCompetitorHandle(handle: string): string {
  return handle.trim().replace(/^@+/, '').replace(/\s+/g, '');
}

export function addTrackedCompetitor(
  handle: string,
  platform: Platform,
  niche: string,
  userId?: string
): TrackedCompetitor {
  const competitors = readCompetitors(userId);
  if (competitors.length >= MAX_COMPETITORS) {
    throw new Error(`Możesz śledzić maksymalnie ${MAX_COMPETITORS} konkurentów. Usuń jednego, aby dodać nowego.`);
  }

  const normalizedHandle = normalizeCompetitorHandle(handle);
  const normalizedNiche = niche.trim();

  const duplicate = competitors.find(
    c => c.handle.toLowerCase() === normalizedHandle.toLowerCase() && c.platform === platform
  );
  if (duplicate) {
    throw new Error('Ten konkurent jest już na liście.');
  }

  const newCompetitor: TrackedCompetitor = {
    id: `comp_${Date.now()}`,
    handle: normalizedHandle,
    platform,
    niche: normalizedNiche,
    addedAt: new Date().toISOString(),
  };
  competitors.push(newCompetitor);
  saveTrackedCompetitors(competitors, userId);
  return newCompetitor;
}

export function removeTrackedCompetitor(id: string, userId?: string): void {
  const competitors = readCompetitors(userId).filter(c => c.id !== id);
  saveTrackedCompetitors(competitors, userId);
}

export function updateCompetitorAnalysis(id: string, analysis: CompetitorAnalysis, userId?: string): void {
  const competitors = readCompetitors(userId);
  const idx = competitors.findIndex(c => c.id === id);
  if (idx !== -1) {
    competitors[idx].analysis = analysis;
    competitors[idx].lastAnalyzedAt = new Date().toISOString();
    saveTrackedCompetitors(competitors, userId);
  }
}

export async function analyzeCompetitor(
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
