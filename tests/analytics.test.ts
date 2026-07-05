/**
 * Tests for analytics service — verifies dev mode fallback and event tracking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock posthog-js to avoid actual import
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
  },
}));

describe('analytics service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AnalyticsEvents has expected keys', async () => {
    const { AnalyticsEvents } = await import('../services/analytics');
    expect(AnalyticsEvents.SIGNUP).toBe('user_signed_up');
    expect(AnalyticsEvents.LOGIN).toBe('user_logged_in');
    expect(AnalyticsEvents.PRICING_VIEWED).toBeDefined();
    expect(AnalyticsEvents.TRIAL_STARTED).toBe('trial_started');
  });

  it('track calls without throwing (dev mode)', async () => {
    const { analytics } = await import('../services/analytics');
    await expect(analytics.track('test_event', { foo: 'bar' })).resolves.not.toThrow();
  });

  it('identify calls without throwing (dev mode)', async () => {
    const { analytics } = await import('../services/analytics');
    await expect(analytics.identify('user-123', { plan: 'free' })).resolves.not.toThrow();
  });

  it('reset calls without throwing', async () => {
    const { analytics } = await import('../services/analytics');
    await expect(analytics.reset()).resolves.not.toThrow();
  });
});
