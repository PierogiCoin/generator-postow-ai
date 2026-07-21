import { describe, expect, it } from 'vitest';
import { mapModel } from '../server/lib/mapModel';

describe('mapModel', () => {
  it('maps Flash UI tier to gemini-2.5-flash', () => {
    expect(mapModel('Flash')).toBe('gemini-2.5-flash');
    expect(mapModel('gemini-flash-latest')).toBe('gemini-2.5-flash');
    expect(mapModel('')).toBe('gemini-2.5-flash');
  });

  it('keeps lite only when explicitly requested', () => {
    expect(mapModel('lite')).toBe('gemini-flash-lite-latest');
    expect(mapModel('gemini-flash-lite-latest')).toBe('gemini-flash-lite-latest');
  });

  it('maps Pro and passes through explicit versioned IDs', () => {
    expect(mapModel('Pro')).toBe('gemini-pro-latest');
    expect(mapModel('gemini-2.5-flash')).toBe('gemini-2.5-flash');
    expect(mapModel('gemini-2.5-pro')).toBe('gemini-2.5-pro');
  });
});
