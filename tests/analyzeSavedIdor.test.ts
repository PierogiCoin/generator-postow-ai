import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Guard: UPDATE w analyze-saved musi filtrować po ID z SELECT (własne posty)
 * oraz po user_id — nigdy surowego postIds z body.
 */
describe('analyze-saved IDOR guard (source)', () => {
  it('update filtruje po posts.map id + user_id, nie po raw postIds', () => {
    const src = readFileSync(resolve(__dirname, '../server/routes/social.ts'), 'utf8');
    const analyzeIdx = src.indexOf("router.post('/api/social/analyze-saved'");
    expect(analyzeIdx).toBeGreaterThan(-1);
    const snippet = src.slice(analyzeIdx, analyzeIdx + 2500);

    expect(snippet).toMatch(/\.eq\(\s*['"]user_id['"]\s*,\s*userId\s*\)/);
    expect(snippet).toMatch(/posts\.map\(\s*\(p\)\s*=>\s*p\.id\s*\)/);
    expect(snippet).not.toMatch(/\.update\(\s*\{\s*ai_analysis:\s*analysis\s*\}\s*\)\.in\(\s*['"]id['"]\s*,\s*postIds\s*\)/);
  });
});
