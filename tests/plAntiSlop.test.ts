import { describe, it, expect } from 'vitest';
import {
  findBannedPhrases,
  hasBannedPhrases,
  buildAntiSlopBlock,
} from '../prompts/plAntiSlop';

describe('plAntiSlop', () => {
  it('detects banned PL phrases', () => {
    const text = 'W dzisiejszym dynamicznym świecie marketingu warto pamiętać o kliencie.';
    expect(hasBannedPhrases(text)).toBe(true);
    expect(findBannedPhrases(text).length).toBeGreaterThanOrEqual(2);
  });

  it('passes clean copy', () => {
    expect(hasBannedPhrases('3 rzeczy, które zabiły CTR wczoraj. Sprawdź nr 2.')).toBe(false);
  });

  it('builds anti-slop block with extras', () => {
    const block = buildAntiSlopBlock('Use short sentences.');
    expect(block).toContain('CRITICAL STYLE');
    expect(block).toContain('Use short sentences.');
  });
});
