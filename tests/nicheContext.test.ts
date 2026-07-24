import { describe, expect, it } from 'vitest';
import {
  formatNicheSystemInstruction,
  formatNicheUserPromptLines,
  nicheStorageLabel,
  resolveNicheContext,
} from '../utils/nicheContext';
import { matchIndustryPack } from '../utils/industryPacks';

describe('nicheContext', () => {
  it('resolves niche from audience and attaches pack', () => {
    const ctx = resolveNicheContext({ audience: 'Kawiarnia specialty' });
    expect(ctx.niche).toBe('Kawiarnia specialty');
    expect(ctx.pack?.id).toBe('pl-lokal');
    expect(ctx.pack?.subNicheId).toBe('gastro-kawiarnia');
  });

  it('prefers brand voice niche over audience', () => {
    const ctx = resolveNicheContext({
      brandVoice: {
        brandName: 'X',
        description: '',
        keywords: '',
        avoid: '',
        niche: 'B2B SaaS',
      },
      audience: 'Kawiarnia',
    });
    expect(ctx.niche).toBe('B2B SaaS');
    expect(ctx.pack?.id).toBe('pl-b2b-saas');
  });

  it('formats prompt lines with INDUSTRY_PACK', () => {
    const ctx = resolveNicheContext({ audience: 'fryzjer' });
    const lines = formatNicheUserPromptLines(ctx);
    expect(lines).toContain('NISZA:');
    expect(lines).toContain('INDUSTRY_PACK:');
    expect(formatNicheSystemInstruction(ctx)).toContain('NISZA / BRANŻA');
  });

  it('builds storage label with subniche', () => {
    const pack = matchIndustryPack('Food truck')!;
    expect(nicheStorageLabel(pack)).toContain('Food truck');
  });
});
