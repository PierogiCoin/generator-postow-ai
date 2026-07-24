import { genAI } from './clients.js';
import {
  findBannedPhrases,
  buildAntiSlopRewritePrompt,
  buildAntiSlopBlock,
} from '../prompts/plAntiSlop.ts';
import logger from '../logger.js';

export { buildAntiSlopBlock, findBannedPhrases };

/**
 * Server-side post-gen banlist enforcement. Fail-open on rewrite errors.
 */
export async function enforceAntiSlopTextServer(
  text: string
): Promise<{ text: string; rewritten: boolean; banned: string[] }> {
  const banned = findBannedPhrases(text);
  if (banned.length === 0) {
    return { text, rewritten: false, banned: [] };
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(buildAntiSlopRewritePrompt(text, banned));
    const rewritten = result.response.text()?.trim() ?? '';
    if (rewritten.length < 20) {
      return { text, rewritten: false, banned };
    }
    logger.info('[AntiSlop] Rewrote text after banlist hit', { banned });
    return { text: rewritten, rewritten: true, banned };
  } catch (err) {
    logger.warn('[AntiSlop] Rewrite failed, keeping original', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { text, rewritten: false, banned };
  }
}
