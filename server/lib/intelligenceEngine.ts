import { genAI } from './clients.js';
import { retryWithBackoff, withTimeout } from './retry.js';
import logger from '../logger.js';

const GROUNDED_MODEL = 'gemini-2.5-flash';

export type GroundingSource = { title: string; url: string };

function parseJsonFromText<T>(text: string): T {
  const clean = text
    .replace(/```json\s?([\s\S]*?)```/g, '$1')
    .replace(/```\s?([\s\S]*?)```/g, '$1')
    .trim();

  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');
  const lastBrace = clean.lastIndexOf('}');
  const lastBracket = clean.lastIndexOf(']');

  let start = -1;
  let end = -1;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    end = lastBrace;
  } else if (firstBracket !== -1) {
    start = firstBracket;
    end = lastBracket;
  }

  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(clean.substring(start, end + 1)) as T;
  }
  return JSON.parse(clean) as T;
}

export function extractGroundingSources(candidates: unknown): GroundingSource[] {
  if (!Array.isArray(candidates) || !candidates[0]) return [];
  const meta = (candidates[0] as { groundingMetadata?: { groundingChunks?: unknown[] } }).groundingMetadata;
  const chunks = meta?.groundingChunks;
  if (!Array.isArray(chunks)) return [];

  const seen = new Set<string>();
  const out: GroundingSource[] = [];
  for (const chunk of chunks) {
    const web = (chunk as { web?: { title?: string; uri?: string } }).web;
    const url = web?.uri || '';
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({ title: web?.title || url, url });
  }
  return out;
}

export async function runGroundedJsonGeneration<T>(
  prompt: string,
  options?: {
    systemInstruction?: string;
    temperature?: number;
    maxOutputTokens?: number;
  }
): Promise<{ data: T; sources: GroundingSource[]; rawText: string }> {
  const model = genAI.getGenerativeModel({
    model: GROUNDED_MODEL,
    systemInstruction: options?.systemInstruction,
  });

  const result = await retryWithBackoff(
    () =>
      withTimeout(
        model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options?.temperature ?? 0.35,
            maxOutputTokens: options?.maxOutputTokens ?? 8192,
            responseMimeType: 'application/json',
          },
          tools: [{ googleSearch: {} }],
        }),
        120000,
        'Intelligence generation timed out'
      ),
    { maxRetries: 2, baseDelay: 1500 }
  );

  const response = await result.response;
  const rawText = response.text();
  const sources = extractGroundingSources(response.candidates);

  let data: T;
  try {
    data = parseJsonFromText<T>(rawText);
  } catch (error) {
    logger.error('[intelligenceEngine] JSON parse failed', { preview: rawText.slice(0, 400) });
    throw new Error('Model AI nie zwrócił poprawnego JSON. Spróbuj ponownie.');
  }

  return { data, sources, rawText };
}
