import { v4 as uuidv4 } from 'uuid';
import { callApi, extractJson } from './apiClient';
import { fetchIntelligenceNews } from './intelligenceService';
import type { Platform } from '../types';

const CACHE_KEY = 'so_tech_radar_cache';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export interface TechNewsItem {
  id: string;
  title: string;
  summary: string;
  /** Kąt na post social media (1 zdanie) */
  angle: string;
  sourceTitle: string;
  sourceUrl: string;
  publishedHint?: string;
  relevance: number;
}

export interface TechRadarResult {
  items: TechNewsItem[];
  niche: string;
  searchedAt: string;
  sources: { title: string; url: string }[];
}

interface CachedRadar {
  key: string;
  result: TechRadarResult;
  cachedAt: number;
}

function cacheKey(niche: string, platform: Platform): string {
  return `${niche.trim().toLowerCase()}|${platform}`;
}

function readCache(key: string): TechRadarResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entries = JSON.parse(raw) as CachedRadar[];
    const hit = entries.find((e) => e.key === key);
    if (!hit || Date.now() - hit.cachedAt > CACHE_TTL_MS) return null;
    return hit.result;
  } catch {
    return null;
  }
}

function writeCache(key: string, result: TechRadarResult): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const entries: CachedRadar[] = raw ? JSON.parse(raw) : [];
    const next = [{ key, result, cachedAt: Date.now() }, ...entries.filter((e) => e.key !== key)].slice(0, 8);
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function extractGroundingSources(candidates: unknown): { title: string; url: string }[] {
  if (!Array.isArray(candidates) || !candidates[0]) return [];
  const meta = (candidates[0] as { groundingMetadata?: { groundingChunks?: unknown[] } }).groundingMetadata;
  const chunks = meta?.groundingChunks;
  if (!Array.isArray(chunks)) return [];

  const seen = new Set<string>();
  const out: { title: string; url: string }[] = [];
  for (const chunk of chunks) {
    const web = (chunk as { web?: { title?: string; uri?: string } }).web;
    const url = web?.uri || '';
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ title: web?.title || url, url });
  }
  return out;
}

function normalizeItems(raw: Partial<TechNewsItem>[], sources: { title: string; url: string }[]): TechNewsItem[] {
  return raw
    .filter((item) => item.title && item.angle)
    .slice(0, 8)
    .map((item, i) => ({
      id: item.id || uuidv4(),
      title: String(item.title).slice(0, 120),
      summary: String(item.summary || item.title).slice(0, 300),
      angle: String(item.angle).slice(0, 200),
      sourceTitle: item.sourceTitle || sources[i]?.title || 'Źródło',
      sourceUrl: item.sourceUrl || sources[i]?.url || '',
      publishedHint: item.publishedHint,
      relevance: Math.min(10, Math.max(1, Number(item.relevance) || 7)),
    }));
}

function buildFallbackFromSources(sources: { title: string; url: string }[], niche: string): TechNewsItem[] {
  return sources.slice(0, 5).map((s) => ({
    id: uuidv4(),
    title: s.title,
    summary: `Aktualna informacja z branży ${niche}.`,
    angle: `Wyjaśnij, co to znaczy dla odbiorców w niszy „${niche}”.`,
    sourceTitle: s.title,
    sourceUrl: s.url,
    relevance: 6,
  }));
}

export async function fetchTechRadarNews(
  niche: string,
  platform: Platform,
  userId: string,
  options?: { forceRefresh?: boolean }
): Promise<TechRadarResult> {
  const trimmedNiche = niche.trim() || 'technologia i innowacje';
  const key = cacheKey(trimmedNiche, platform);

  if (!options?.forceRefresh) {
    const cached = readCache(key);
    if (cached) return cached;
  }

  try {
    const intel = await fetchIntelligenceNews(trimmedNiche, platform, userId);
    const items = normalizeItems(
      (intel.items || []).map((item) => ({
        ...item,
        id: undefined,
      })),
      intel.sources || []
    );
    if (items.length > 0) {
      const result: TechRadarResult = {
        items,
        niche: trimmedNiche,
        searchedAt: intel.searchedAt || new Date().toISOString(),
        sources: intel.sources || [],
      };
      writeCache(key, result);
      return result;
    }
  } catch {
    // fallback do bezpośredniego generate-content
  }

  const today = new Date().toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const prompt = `Jesteś analitykiem tech/news. Użyj Google Search.

DATA: ${today}
NISZA / BRANŻA: ${trimmedNiche}
PLATFORMA DOCELOWA POSTA: ${platform}

Znajdź 5–8 aktualnych (ostatnie 7 dni) newsów, nowinek technologicznych lub branżowych istotnych dla tej niszy.
Preferuj wiarygodne źródła (tech media, oficjalne blogi, raporty).

Zwróć WYŁĄCZNIE tablicę JSON (bez markdown), każdy element:
{
  "title": "krótki tytuł newsa",
  "summary": "2 zdania streszczenia",
  "angle": "kąt na post social — co napisać, żeby złapać uwagę",
  "sourceTitle": "nazwa źródła",
  "sourceUrl": "pełny URL",
  "publishedHint": "np. wczoraj / 3 dni temu",
  "relevance": 1-10
}

Pisz po polsku. Tylko prawdziwe, zweryfikowane informacje z wyszukiwania.`;

  const response = await callApi(
    'generate-content',
    {
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
      config: {
        temperature: 0.4,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        tools: [{ googleSearch: {} }],
      },
    },
    userId
  );

  const sources = extractGroundingSources(response.candidates);
  let items: TechNewsItem[] = [];

  try {
    const parsed = extractJson<Partial<TechNewsItem>[]>(response.text || '[]');
    items = normalizeItems(Array.isArray(parsed) ? parsed : [], sources);
  } catch {
    items = [];
  }

  if (items.length === 0 && sources.length > 0) {
    items = buildFallbackFromSources(sources, trimmedNiche);
  }

  if (items.length === 0) {
    throw new Error('Nie znaleziono aktualnych newsów. Spróbuj szerszą niszę lub odśwież za chwilę.');
  }

  const result: TechRadarResult = {
    items,
    niche: trimmedNiche,
    searchedAt: new Date().toISOString(),
    sources,
  };

  writeCache(key, result);
  return result;
}

/** Tekst tematu do wstawienia w formularz generatora */
export function techNewsToTopic(item: TechNewsItem): string {
  return `${item.title}\n\n${item.angle}\n\nŹródło: ${item.sourceTitle}${item.sourceUrl ? ` (${item.sourceUrl})` : ''}`;
}
