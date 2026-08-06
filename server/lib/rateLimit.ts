import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import type { Response } from 'express';
import { loadEnv } from '../config/env.js';
import logger from '../logger.js';

export interface RateLimitConfig {
    tokens: number;
    window: number;
    prefix: string;
    envTokenKey: string;
    envWindowKey: string;
}

export type RateLimitResult = {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
    isServiceUnavailable: boolean;
};

export const rateLimitConfigs: Record<string, RateLimitConfig> = {
    contact: { tokens: 5, window: 60_000, prefix: 'contact', envTokenKey: 'RATE_LIMIT_CONTACT_TOKENS', envWindowKey: 'RATE_LIMIT_CONTACT_WINDOW' },
    calculatorLead: { tokens: 10, window: 60_000, prefix: 'calc-lead', envTokenKey: 'RATE_LIMIT_CALCULATOR_LEAD_TOKENS', envWindowKey: 'RATE_LIMIT_CALCULATOR_LEAD_WINDOW' },
    qualifyLead: { tokens: 10, window: 60_000, prefix: 'qualify-lead', envTokenKey: 'RATE_LIMIT_QUALIFY_LEAD_TOKENS', envWindowKey: 'RATE_LIMIT_QUALIFY_LEAD_WINDOW' },
    roiLead: { tokens: 10, window: 60_000, prefix: 'roi-lead', envTokenKey: 'RATE_LIMIT_ROI_LEAD_TOKENS', envWindowKey: 'RATE_LIMIT_ROI_LEAD_WINDOW' },
    leadMagnet: { tokens: 10, window: 60_000, prefix: 'lead-magnet', envTokenKey: 'RATE_LIMIT_LEAD_MAGNET_TOKENS', envWindowKey: 'RATE_LIMIT_LEAD_MAGNET_WINDOW' },
    adsLead: { tokens: 10, window: 60_000, prefix: 'ads-lead', envTokenKey: 'RATE_LIMIT_ADS_LEAD_TOKENS', envWindowKey: 'RATE_LIMIT_ADS_LEAD_WINDOW' },
    wizard: { tokens: 10, window: 60_000, prefix: 'wizard', envTokenKey: 'RATE_LIMIT_WIZARD_TOKENS', envWindowKey: 'RATE_LIMIT_WIZARD_WINDOW' },
    generateOffer: { tokens: 5, window: 60_000, prefix: 'generate-offer', envTokenKey: 'RATE_LIMIT_GENERATE_OFFER_TOKENS', envWindowKey: 'RATE_LIMIT_GENERATE_OFFER_WINDOW' },
    liveAnalyze: { tokens: 5, window: 60_000, prefix: 'live-analyze', envTokenKey: 'RATE_LIMIT_LIVE_ANALYZE_TOKENS', envWindowKey: 'RATE_LIMIT_LIVE_ANALYZE_WINDOW' },
    blogNewsletter: { tokens: 20, window: 60_000, prefix: 'blog-newsletter', envTokenKey: 'RATE_LIMIT_BLOG_NEWSLETTER_TOKENS', envWindowKey: 'RATE_LIMIT_BLOG_NEWSLETTER_WINDOW' },
    audit: { tokens: 3, window: 60_000, prefix: 'audit', envTokenKey: 'RATE_LIMIT_AUDIT_TOKENS', envWindowKey: 'RATE_LIMIT_AUDIT_WINDOW' },
    auditShare: { tokens: 10, window: 60_000, prefix: 'audit-share', envTokenKey: 'RATE_LIMIT_AUDIT_SHARE_TOKENS', envWindowKey: 'RATE_LIMIT_AUDIT_SHARE_WINDOW' },
    metaCapi: { tokens: 20, window: 60_000, prefix: 'meta-capi', envTokenKey: 'RATE_LIMIT_META_CAPI_TOKENS', envWindowKey: 'RATE_LIMIT_META_CAPI_WINDOW' },
    promoCodesValidate: { tokens: 30, window: 60_000, prefix: 'promo-codes-validate', envTokenKey: 'RATE_LIMIT_PROMO_CODES_VALIDATE_TOKENS', envWindowKey: 'RATE_LIMIT_PROMO_CODES_VALIDATE_WINDOW' },
    upload: { tokens: 10, window: 60_000, prefix: 'upload', envTokenKey: 'RATE_LIMIT_UPLOAD_TOKENS', envWindowKey: 'RATE_LIMIT_UPLOAD_WINDOW' },
    aiPromo: { tokens: 5, window: 60_000, prefix: 'ai-promo', envTokenKey: 'RATE_LIMIT_AI_PROMO_TOKENS', envWindowKey: 'RATE_LIMIT_AI_PROMO_WINDOW' },
    blogView: { tokens: 60, window: 60_000, prefix: 'blog-view', envTokenKey: 'RATE_LIMIT_BLOG_VIEW_TOKENS', envWindowKey: 'RATE_LIMIT_BLOG_VIEW_WINDOW' },
    blogTrack: { tokens: 60, window: 60_000, prefix: 'blog-track', envTokenKey: 'RATE_LIMIT_BLOG_TRACK_TOKENS', envWindowKey: 'RATE_LIMIT_BLOG_TRACK_WINDOW' },
    trackVideo: { tokens: 30, window: 60_000, prefix: 'track-video', envTokenKey: 'RATE_LIMIT_TRACK_VIDEO_TOKENS', envWindowKey: 'RATE_LIMIT_TRACK_VIDEO_WINDOW' },
    abandonedCart: { tokens: 10, window: 60_000, prefix: 'abandoned-cart', envTokenKey: 'RATE_LIMIT_ABANDONED_CART_TOKENS', envWindowKey: 'RATE_LIMIT_ABANDONED_CART_WINDOW' },
    publicApi: { tokens: 60, window: 60_000, prefix: 'public-api', envTokenKey: 'RATE_LIMIT_PUBLIC_API_TOKENS', envWindowKey: 'RATE_LIMIT_PUBLIC_API_WINDOW' },
};

const env = loadEnv();
const isProduction = env.NODE_ENV === 'production';
const hasUpstash = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

let upstashRedis: Redis | null = null;
if (hasUpstash) {
    upstashRedis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL!,
        token: env.UPSTASH_REDIS_REST_TOKEN!,
    });
}

const ratelimitInstances = new Map<string, Ratelimit>();

function parseEnvNumber(value: unknown, fallback: number): number {
    if (value === undefined || value === null) return fallback;
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}

function effectiveConfig(config: RateLimitConfig): { tokens: number; window: number } {
    const tokens = parseEnvNumber((env as Record<string, unknown>)[config.envTokenKey], config.tokens);
    const window = parseEnvNumber((env as Record<string, unknown>)[config.envWindowKey], config.window);
    return { tokens, window };
}

function getRatelimit(config: RateLimitConfig): Ratelimit | null {
    if (!upstashRedis) return null;
    if (ratelimitInstances.has(config.prefix)) {
        return ratelimitInstances.get(config.prefix)!;
    }
    const { tokens, window } = effectiveConfig(config);
    const windowSeconds = Math.max(1, Math.ceil(window / 1000));
    const instance = new Ratelimit({
        redis: upstashRedis,
        limiter: Ratelimit.slidingWindow(tokens, `${windowSeconds} s`),
        prefix: `@upstash/ratelimit/${config.prefix}`,
        analytics: true,
    });
    ratelimitInstances.set(config.prefix, instance);
    return instance;
}

export async function checkRateLimit(identifier: string, configKey: string): Promise<RateLimitResult> {
    const config = rateLimitConfigs[configKey];
    if (!config) {
        throw new Error(`Unknown rate limit config: ${configKey}`);
    }
    const { tokens, window } = effectiveConfig(config);
    const reset = Date.now() + window;

    const instance = getRatelimit(config);
    if (!instance) {
        if (isProduction) {
            logger.error('Rate limit service unavailable', { configKey, identifier });
            return { success: false, limit: 0, remaining: 0, reset, isServiceUnavailable: true };
        }
        logger.warn('Rate limit Redis not configured — dev mode permissive', { configKey, identifier });
        return { success: true, limit: tokens, remaining: tokens, reset, isServiceUnavailable: false };
    }

    try {
        const result = await instance.limit(identifier);
        return {
            success: result.success,
            limit: result.limit,
            remaining: result.remaining,
            reset: result.reset,
            isServiceUnavailable: false,
        };
    } catch (err) {
        if (isProduction) {
            logger.error('Rate limit service unavailable', { configKey, identifier, error: (err as Error).message });
            return { success: false, limit: 0, remaining: 0, reset, isServiceUnavailable: true };
        }
        logger.warn('Rate limit Redis error — dev mode permissive', { configKey, identifier, error: (err as Error).message });
        return { success: true, limit: tokens, remaining: tokens, reset, isServiceUnavailable: false };
    }
}

export function createRateLimitResponse(res: Response, reset: number): void {
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({ success: false, code: 'RATE_LIMIT_EXCEEDED' });
}

export function createRedisFailureResponse(res: Response): void {
    res.status(503).json({ success: false, code: 'RATE_LIMIT_SERVICE_UNAVAILABLE' });
}
