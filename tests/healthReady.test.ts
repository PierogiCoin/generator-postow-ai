import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

describe('GET /health and /health/ready', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.CRON_SECRET;
    process.env.PUBLIC_BACKEND_URL = 'https://api.example.com';
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
    process.env.STRIPE_PRICE_PRO = 'price_pro';
  });

  it('public /health nie wycieka Stripe/OAuth', async () => {
    const { createHealthRouter } = await import('../server/routes/health');
    const router = createHealthRouter();
    const layer = (
      router as unknown as {
        stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>;
      }
    ).stack.find((l) => l.route?.path === '/health' && l.route.methods.get);

    const req = {} as Request;
    const res = {
      json: vi.fn(),
      status: vi.fn(function (this: unknown) {
        return this;
      }),
    } as unknown as Response;

    layer!.route!.stack[0].handle(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ok' })
    );
    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.deploy).toBeUndefined();
  });

  it('/health/ready wymaga x-cron-secret', async () => {
    process.env.CRON_SECRET = 'secret';
    const { createHealthRouter } = await import('../server/routes/health');
    const router = createHealthRouter();
    const layer = (
      router as unknown as {
        stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>;
      }
    ).stack.find((l) => l.route?.path === '/health/ready' && l.route.methods.get);

    const res = {
      json: vi.fn(),
      status: vi.fn(function (this: unknown) {
        return this;
      }),
    } as unknown as Response;

    layer!.route!.stack[0].handle({ headers: {} } as Request, res);
    expect(res.status).toHaveBeenCalledWith(401);

    const resOk = {
      json: vi.fn(),
      status: vi.fn(function (this: unknown) {
        return this;
      }),
    } as unknown as Response;
    layer!.route!.stack[0].handle(
      { headers: { 'x-cron-secret': 'secret' } } as unknown as Request,
      resOk
    );
    expect(resOk.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        deploy: expect.objectContaining({
          stripe: expect.objectContaining({ ready: true }),
        }),
      })
    );
  });
});
