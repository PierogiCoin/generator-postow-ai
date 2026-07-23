import { beforeEach, describe, expect, it, vi } from 'vitest';

const scoreImageVisual = vi.fn();
const getAuthUserId = vi.fn(() => 'user-1');

vi.mock('../server/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  logRequest: vi.fn(),
  logCost: vi.fn(),
}));

vi.mock('../server/contentScoring.js', () => ({
  scoreContent: vi.fn(),
  compareWithBenchmark: vi.fn(),
  quickValidate: vi.fn(() => ({ isValid: true, errors: [] })),
}));

vi.mock('../server/middleware/credits.js', () => ({
  creditGate: vi.fn(() => []),
}));

vi.mock('../server/middleware/supabaseAuth.js', () => ({
  getAuthUserId: () => getAuthUserId(),
}));

vi.mock('../server/visualScoring.js', async () => {
  const actual = await vi.importActual<typeof import('../server/visualScoring')>(
    '../server/visualScoring.js'
  );
  return {
    ...actual,
    scoreImageVisual: (...args: unknown[]) => scoreImageVisual(...args),
  };
});

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status: vi.fn(function (this: { statusCode: number }, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (this: { body: unknown }, body: unknown) {
      this.body = body;
      return this;
    }),
  };
  return res;
}

async function getScoreImageHandler() {
  const { createScoringRouter } = await import('../server/routes/scoring');
  const router = createScoringRouter();
  const routeLayer = router.stack.find(
    (layer: { route?: { path?: string } }) => layer.route?.path === '/api/score-image'
  ) as { route?: { stack?: Array<{ handle: (...args: unknown[]) => unknown }> } } | undefined;
  if (!routeLayer?.route?.stack?.length) {
    throw new Error('score-image route handler not found');
  }
  return routeLayer.route.stack[routeLayer.route.stack.length - 1].handle;
}

describe('score-image route', () => {
  beforeEach(() => {
    scoreImageVisual.mockReset();
  });

  it('returns 503 when visual scoring is unavailable', async () => {
    const { VisualScoringUnavailableError } = await import('../server/visualScoring');
    scoreImageVisual.mockRejectedValueOnce(
      new VisualScoringUnavailableError('vision offline')
    );

    const handler = await getScoreImageHandler();
    const res = mockRes();

    await handler(
      {
        body: {
          base64: 'ZmFrZQ==',
          mimeType: 'image/jpeg',
          platform: 'Instagram',
          briefSummary: 'hero shot',
        },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Visual scoring unavailable',
        code: 'VISUAL_SCORING_UNAVAILABLE',
      })
    );
  });

  it('parses data-url image payload and forwards base64 to scorer', async () => {
    scoreImageVisual.mockResolvedValueOnce({
      overall: 80,
      thumbStop: 80,
      brandFit: 80,
      textLegibility: 80,
      platformFit: 80,
      feedback: [],
      badge: 'green',
    });

    const handler = await getScoreImageHandler();
    const res = mockRes();

    await handler(
      {
        body: {
          imageUrl: 'data:image/png;base64,cmVtb3RlLWltYWdl',
          platform: 'Instagram',
          briefSummary: 'hero shot',
        },
      },
      res
    );

    expect(scoreImageVisual).toHaveBeenCalledWith({
      base64: 'cmVtb3RlLWltYWdl',
      mimeType: 'image/png',
      platform: 'Instagram',
      briefSummary: 'hero shot',
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        score: expect.objectContaining({ overall: 80 }),
      })
    );

  });
});
