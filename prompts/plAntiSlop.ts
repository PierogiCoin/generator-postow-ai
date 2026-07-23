/**
 * Prompt pack PL v1 — anti-slop / human copy for CEE social content.
 * Shared by client generation (contentService) and server-side jobs.
 */

export const PL_BANNED_PHRASES = [
  'W dzisiejszym dynamicznym świecie',
  'W dzisiejszym szybko zmieniającym się świecie',
  "In today's fast-paced",
  "In today's digital world",
  'Czy kiedykolwiek zastanawiałeś się',
  'Have you ever wondered',
  'Warto pamiętać',
  'It is important to remember',
  'Klucz do sukcesu',
  'Key to success',
  'Nie szukaj dalej',
  'Look no further',
  'Odkryj magię',
  'Revolutionize your',
  'Game-changer',
  'Unlock your potential',
  'Take your business to the next level',
  'Podnieś swój biznes na wyższy poziom',
] as const;

export const PL_ANTI_SLOP_SYSTEM = `CRITICAL STYLE (PL/CEE anti-slop):
- Write like a sharp human marketer, not a brochure or LinkedIn bot.
- Start with a concrete hook (fact, tension, scene, number, or opinion) — never with fluff.
- Prefer short paragraphs (max 2–3 sentences), active voice, specific nouns over adjectives.
- Ban corporate filler and AI clichés. NEVER use (or close variations of):
${PL_BANNED_PHRASES.map((p) => `  • "${p}"`).join('\n')}
- Avoid starting lists with "Oto…" / "Here is/are…".
- No empty enthusiasm ("niesamowite!", "rewolucja!") without a concrete claim.
- If the user language is Polish: natural PL syntax, no calques from English marketing.
- Mobile-first: one idea per short block; scannable.`;

export function buildAntiSlopBlock(extraRules?: string): string {
  if (!extraRules?.trim()) return PL_ANTI_SLOP_SYSTEM;
  return `${PL_ANTI_SLOP_SYSTEM}\n\nADDITIONAL STYLE RULES:\n${extraRules.trim()}`;
}

/** Case-insensitive scan for banned marketing clichés. */
export function findBannedPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return PL_BANNED_PHRASES.filter((phrase) => lower.includes(phrase.toLowerCase()));
}

export function hasBannedPhrases(text: string): boolean {
  return findBannedPhrases(text).length > 0;
}

export function buildAntiSlopRewritePrompt(originalText: string, banned: string[]): string {
  return `Rewrite this social post to remove AI marketing slop while keeping the same meaning, language, and platform intent.

BANNED phrases found (remove or replace with concrete language):
${banned.map((p) => `- "${p}"`).join('\n')}

RULES:
${PL_ANTI_SLOP_SYSTEM}

ORIGINAL:
"""
${originalText}
"""

Return ONLY the rewritten post text — no markdown, no commentary.`;
}
