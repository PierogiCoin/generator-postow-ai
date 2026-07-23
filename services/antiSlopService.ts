import { findBannedPhrases, hasBannedPhrases, buildAntiSlopRewritePrompt } from '../prompts/plAntiSlop';
import { generateContent } from './apiClient';

/**
 * If generated text contains banned PL/EN marketing clichés, rewrite once via Gemini.
 * Fail-open: on rewrite error returns original text.
 */
export async function enforceAntiSlopText(
  text: string,
  userId?: string
): Promise<{ text: string; rewritten: boolean; banned: string[] }> {
  const banned = findBannedPhrases(text);
  if (banned.length === 0) {
    return { text, rewritten: false, banned: [] };
  }

  try {
    const response = await generateContent(
      {
        model: 'gemini-flash-latest',
        contents: buildAntiSlopRewritePrompt(text, banned),
      },
      userId
    );
    const rewritten = (response.text ?? '').trim();
    if (rewritten.length < 20) {
      return { text, rewritten: false, banned };
    }
    // Second pass: if still banned, keep rewrite anyway (better than loop)
    return { text: rewritten, rewritten: true, banned };
  } catch (error: unknown) {
    console.warn('[antiSlopService] rewrite failed, keeping original text', {
      error: error instanceof Error ? error.message : String(error),
      bannedCount: banned.length,
    });
    return { text, rewritten: false, banned };
  }
}

export { hasBannedPhrases, findBannedPhrases };
