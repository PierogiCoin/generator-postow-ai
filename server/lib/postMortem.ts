import logger from '../logger.js';
import { genAI, supabase } from './clients.js';
import { computeEngagementSummary } from './socialHelpers.js';
import { mergePostMortemIntoBrandVoice } from './brandVoiceSync.js';

export const POST_MORTEM_CUTOFF_HOURS = 48;
export const POST_MORTEM_BATCH = 8;

const POST_MORTEM_JSON_SCHEMA = `{
  "topTakeaways": ["konkretna obserwacja z danych, np. Posty z grafiką mają 3x wyższy ER"],
  "improvementIdeas": ["konkretna poprawa, np. Skróć posty do 150 znaków"],
  "imagePromptSuggestion": "konkretny prompt do generatora obrazów AI bazowany na stylu najlepszego posta",
  "textTemplateSuggestion": "konkretny schemat tekstu który działał najlepiej (hook + treść + CTA)",
  "bestDayTime": "najlepsza pora na podstawie danych",
  "winnerIndex": 0,
  "reasonWinner": "dlaczego ten post wygrał",
  "nextSlotsHint": "np. Wtorek 18:00"
}`;

type PostRow = {
  id: string;
  user_id?: string;
  platform?: string;
  content?: string;
  metrics?: Record<string, unknown>;
  published_at?: string;
  url?: string;
  media_url?: string;
};

function formatPostLine(p: PostRow, idx: number): string {
  const m = computeEngagementSummary(p);
  const publishedAt = p.published_at ? new Date(p.published_at) : null;
  const dayOfWeek = publishedAt ? ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'][publishedAt.getDay()] : 'N/A';
  const hourOfDay = publishedAt ? `${publishedAt.getHours()}:00` : 'N/A';
  const hasMedia = p.media_url ? 'TAK' : 'NIE';
  const contentLength = (p.content || '').length;
  const hashtagCount = ((p.content || '').match(/#\w+/g) || []).length;
  return `[${idx + 1}] Platforma: ${p.platform} | Dzień: ${dayOfWeek} ${hourOfDay} | Media: ${hasMedia} | Długość: ${contentLength} znaków | Hashtagi: ${hashtagCount} | ER: ${(m.engagementRate * 100).toFixed(2)}% | Interakcje: ${m.interactions} | Zasięg: ${m.impressions}\nTreść: ${p.content?.slice(0, 200) || '(brak)'}`;
}

export function buildPostMortemSummary(posts: PostRow[]): string {
  return posts.map((p, idx) => formatPostLine(p, idx)).join('\n\n');
}

export function buildPostMortemPrompt(summary: string): string {
  return `Jesteś ekspertem social media. Przeanalizuj te posty i daj KONKRETNE, ACTIONABLE rekomendacje.\n\nPosty:\n${summary}\n\nZwróć JSON (bez komentarzy, tylko JSON):\n${POST_MORTEM_JSON_SCHEMA}`;
}

export async function runPostMortemAnalysis(posts: PostRow[]): Promise<Record<string, unknown>> {
  const summary = buildPostMortemSummary(posts);
  const prompt = buildPostMortemPrompt(summary);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  return JSON.parse(response.text().replace(/```json|```/g, '').trim());
}

export async function persistPostMortemAnalysis(postIds: string[], analysis: Record<string, unknown>): Promise<void> {
  await supabase
    .from('social_posts')
    .update({ ai_analysis: analysis, last_synced_at: new Date().toISOString() })
    .in('id', postIds);
}

export async function processPostMortems(): Promise<void> {
  const cutoff = new Date(Date.now() - POST_MORTEM_CUTOFF_HOURS * 60 * 60 * 1000).toISOString();

  try {
    const { data: posts, error } = await supabase
      .from('social_posts')
      .select('id, user_id, platform, content, metrics, published_at, url, media_url')
      .is('ai_analysis', null)
      .lte('published_at', cutoff)
      .order('published_at', { ascending: false })
      .limit(POST_MORTEM_BATCH);

    if (error) throw error;
    if (!posts || posts.length === 0) return;

    const postsByUser = posts.reduce<Record<string, PostRow[]>>((acc, p) => {
      if (!acc[p.user_id]) acc[p.user_id] = [];
      acc[p.user_id].push(p);
      return acc;
    }, {});

    for (const [userId, userPosts] of Object.entries(postsByUser)) {
      try {
        const analysis = await runPostMortemAnalysis(userPosts);
        const ids = userPosts.map((p) => p.id);
        await persistPostMortemAnalysis(ids, analysis);
        await mergePostMortemIntoBrandVoice(userId, analysis);
        logger.info('[PostMortem] Saved analysis', { userId, posts: ids.length });
      } catch (userErr: unknown) {
        const message = userErr instanceof Error ? userErr.message : String(userErr);
        logger.error('[PostMortem] User batch failed', { userId, error: message });
      }
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error('[PostMortem] Fatal error', { error: message });
  }
}
