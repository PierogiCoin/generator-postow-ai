import { describe, it, expect } from 'vitest';
import { extractJson } from '../utils/extractJson';

describe('extractJson', () => {
  it('parsuje czysty obiekt JSON', () => {
    const result = extractJson<{ foo: string }>('{"foo":"bar"}');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('parsuje JSON w bloku markdown', () => {
    const text = 'Oto wynik:\n```json\n{"score": 42}\n```\nKoniec.';
    expect(extractJson<{ score: number }>(text)).toEqual({ score: 42 });
  });

  it('parsuje tablicę JSON', () => {
    expect(extractJson<number[]>('[1, 2, 3]')).toEqual([1, 2, 3]);
  });

  it('wycina tekst przed i po JSON-ie', () => {
    const text = 'Analiza: {"ok": true} — gotowe.';
    expect(extractJson<{ ok: boolean }>(text)).toEqual({ ok: true });
  });

  it('rzuca błąd dla pustego tekstu', () => {
    expect(() => extractJson('')).toThrow('pusty tekst');
  });

  it('rzuca błąd dla niepoprawnego JSON', () => {
    expect(() => extractJson('to nie jest json')).toThrow(/poprawnego formatu JSON/);
  });
});
