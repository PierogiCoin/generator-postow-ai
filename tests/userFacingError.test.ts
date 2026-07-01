import { describe, expect, it } from 'vitest';
import { parseUserFacingError } from '../utils/userFacingError';

describe('parseUserFacingError', () => {
  it('maps technical fetch errors to network message', () => {
    const result = parseUserFacingError(new Error('Failed to fetch'));
    expect(result.code).toBe('network');
    expect(result.title).toContain('połączenia');
    expect(result.action).toBeTruthy();
  });

  it('maps quota errors', () => {
    const err = new Error('quota exceeded') as Error & { status?: number; code?: string };
    err.status = 429;
    const result = parseUserFacingError(err);
    expect(result.code).toBe('quota');
  });

  it('maps safety blocks', () => {
    const result = parseUserFacingError(new Error('[SAFETY] blocked'));
    expect(result.code).toBe('safety');
  });

  it('maps favorites failures without raw english', () => {
    const result = parseUserFacingError(new Error('Failed to add favorite'));
    expect(result.code).toBe('favorites');
    expect(result.message).not.toMatch(/^Failed to/i);
  });

  it('maps insufficient credits', () => {
    const err = new Error('Brak kredytów') as Error & { status?: number; code?: string };
    err.status = 402;
    err.code = 'insufficient_credits';
    const result = parseUserFacingError(err);
    expect(result.code).toBe('insufficient_credits');
    expect(result.action).toContain('cennik');
  });

  it('maps stale bundle import errors', () => {
    const result = parseUserFacingError(
      new Error('Failed to fetch dynamically imported module')
    );
    expect(result.code).toBe('stale_bundle');
  });
});
