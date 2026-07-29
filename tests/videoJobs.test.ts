import { beforeEach, describe, expect, it, vi } from 'vitest';

const upsert = vi.fn();
const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ upsert, select }));

vi.mock('../server/supabase.js', () => ({
  supabase: { from: (...args: unknown[]) => from(...args) },
}));

vi.mock('../server/logger.js', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('videoJobs persistence', () => {
  beforeEach(() => {
    vi.resetModules();
    upsert.mockReset();
    maybeSingle.mockReset();
    from.mockClear();
    upsert.mockResolvedValue({ data: null, error: null });
    maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('createVideoJob zapisuje do Supabase i cache', async () => {
    const { createVideoJob, getVideoJob } = await import('../server/lib/videoJobs');
    const id = await createVideoJob('user-1', 'luma');
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(upsert).toHaveBeenCalled();
    const job = await getVideoJob(id);
    expect(job?.userId).toBe('user-1');
    expect(job?.stage).toBe('queued');
  });

  it('getVideoJob ładuje z DB gdy brak w cache', async () => {
    const { createVideoJob, getVideoJob } = await import('../server/lib/videoJobs');
    const id = await createVideoJob('user-2', 'veo');

    // Clear would need internal access — simulate DB hit for unknown id
    maybeSingle.mockResolvedValueOnce({
      data: {
        id: '11111111-1111-4111-8111-111111111111',
        user_id: 'user-db',
        stage: 'generating',
        stage_label: 'Generowanie…',
        progress: 40,
        active_provider: 'veo',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      error: null,
    });

    const loaded = await getVideoJob('11111111-1111-4111-8111-111111111111');
    expect(loaded?.userId).toBe('user-db');
    expect(loaded?.stage).toBe('generating');
    expect(id).toBeTruthy();
  });
});
