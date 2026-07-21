import { describe, expect, it, vi } from 'vitest';
import { mapWithConcurrency } from '../utils/mapWithConcurrency';

describe('mapWithConcurrency', () => {
  it('preserves order and respects concurrency', async () => {
    let running = 0;
    let maxRunning = 0;

    const results = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 20));
      running -= 1;
      return n * 10;
    });

    expect(results).toEqual([10, 20, 30, 40]);
    expect(maxRunning).toBeLessThanOrEqual(2);
  });

  it('returns empty for empty input', async () => {
    const fn = vi.fn();
    await expect(mapWithConcurrency([], 3, fn)).resolves.toEqual([]);
    expect(fn).not.toHaveBeenCalled();
  });
});
