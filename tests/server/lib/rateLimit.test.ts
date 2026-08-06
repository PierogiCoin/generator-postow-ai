import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../server/config/env.js', () => ({
    loadEnv: () => ({
        NODE_ENV: 'production',
        GOOGLE_API_KEY: 'x',
        SUPABASE_SERVICE_KEY: 'x',
        SUPABASE_URL: 'https://x.supabase.co',
        RATE_LIMIT_CONTACT_TOKENS: '3',
        RATE_LIMIT_CONTACT_WINDOW: '120000',
    }),
}));

vi.mock('../../../server/logger.js', () => ({
    default: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
    },
}));

import { checkRateLimit, createRateLimitResponse, createRedisFailureResponse, rateLimitConfigs } from '../../../server/lib/rateLimit';

describe('rateLimit', () => {
    it('loads per-config defaults with env overrides', () => {
        const cfg = rateLimitConfigs.contact;
        expect(cfg.tokens).toBe(5);
        expect(cfg.envTokenKey).toBe('RATE_LIMIT_CONTACT_TOKENS');
        expect(cfg.envWindowKey).toBe('RATE_LIMIT_CONTACT_WINDOW');
    });

    it('fail-closed in production when Redis is not configured', async () => {
        const result = await checkRateLimit('ip-1', 'contact');
        expect(result.success).toBe(false);
        expect(result.isServiceUnavailable).toBe(true);
        expect(result.limit).toBe(0);
        expect(result.remaining).toBe(0);
        expect(result.reset).toBeGreaterThan(Date.now());
    });

    it('createRateLimitResponse sets 429 + Retry-After', () => {
        const res = { set: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
        const reset = Date.now() + 60_000;
        createRateLimitResponse(res, reset);
        expect(res.set).toHaveBeenCalledWith('Retry-After', expect.any(String));
        expect(res.status).toHaveBeenCalledWith(429);
    });

    it('createRedisFailureResponse sets 503', () => {
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
        createRedisFailureResponse(res);
        expect(res.status).toHaveBeenCalledWith(503);
    });
});
