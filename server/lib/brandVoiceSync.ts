import { supabase } from './clients.js';
import logger from '../logger.js';

function extractPatterns(analysis: Record<string, unknown>): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === 'string' && v.trim().length > 8) out.push(v.trim());
  };
  if (Array.isArray(analysis.topTakeaways)) analysis.topTakeaways.forEach(push);
  if (Array.isArray(analysis.improvementIdeas)) analysis.improvementIdeas.forEach(push);
  push(analysis.textTemplateSuggestion);
  push(analysis.imagePromptSuggestion);
  return [...new Set(out)].slice(0, 10);
}

/** Dopisuje wzorce sukcesu z post-mortem do ostatniego profilu Brand Voice użytkownika. */
export async function mergePostMortemIntoBrandVoice(
  userId: string,
  analysis: Record<string, unknown>
): Promise<void> {
  const patterns = extractPatterns(analysis);
  if (patterns.length === 0) return;

  const { data: profiles, error } = await supabase
    .from('brand_voice_profiles')
    .select('id, settings')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !profiles?.length) return;

  const profile = profiles[0];
  const settings = (profile.settings as Record<string, unknown>) || {};
  const existing = Array.isArray(settings.successPatterns)
    ? (settings.successPatterns as string[])
    : [];
  const merged = [...new Set([...existing, ...patterns])].slice(0, 15);

  const { error: updateError } = await supabase
    .from('brand_voice_profiles')
    .update({ settings: { ...settings, successPatterns: merged } })
    .eq('id', profile.id);

  if (updateError) {
    logger.warn('[BrandVoiceSync] Update failed', { userId, error: updateError.message });
    return;
  }
  logger.info('[BrandVoiceSync] Merged success patterns', { userId, count: merged.length });
}
