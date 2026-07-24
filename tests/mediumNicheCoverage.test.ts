import { describe, expect, it } from 'vitest';
import { formatCalendarNicheBlock } from '../services/calendarCadenceService';
import golden from '../evals/golden-posts-pl.json';

describe('formatCalendarNicheBlock', () => {
  it('includes INDUSTRY_PACK for gastro niche', () => {
    const block = formatCalendarNicheBlock('Kawiarnia specialty');
    expect(block).toContain('NISZA:');
    expect(block).toContain('INDUSTRY_PACK:');
    expect(block).toMatch(/Lokal|gastronom/i);
  });

  it('still returns NISZA for unknown niche', () => {
    expect(formatCalendarNicheBlock('podróże')).toContain('NISZA: podróże');
  });
});

describe('golden posts coverage', () => {
  const industries = new Set((golden as { industry: string }[]).map((g) => g.industry));

  it('covers new industries and gastro-style lokal posts', () => {
    expect(industries.has('fitness')).toBe(true);
    expect(industries.has('moda')).toBe(true);
    expect(industries.has('edukacja')).toBe(true);
    expect(industries.has('finanse')).toBe(true);
    expect(industries.has('lokal')).toBe(true);
  });

  it('includes dedicated gastro subniche fixtures', () => {
    const ids = new Set((golden as { id: string }[]).map((g) => g.id));
    expect(ids.has('pl-gastro-kawiarnia-01')).toBe(true);
    expect(ids.has('pl-gastro-foodtruck-01')).toBe(true);
    expect(ids.has('pl-gastro-piekarnia-01')).toBe(true);
  });
});
