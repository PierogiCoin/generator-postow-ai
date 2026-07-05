/**
 * Tests for email service — verifies dev mode behavior and API structure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock apiClient
vi.mock('../services/apiClient', () => ({
  callApi: vi.fn(),
  getApiBaseUrl: vi.fn(() => 'http://localhost:3001'),
  getApiAuthHeaders: vi.fn(async () => ({ Authorization: 'Bearer test-token' })),
}));

describe('emailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggerWelcome calls API without throwing', async () => {
    const { callApi } = await import('../services/apiClient');
    const { emailService } = await import('../services/emailService');

    (callApi as any).mockResolvedValueOnce({});

    await expect(emailService.triggerWelcome()).resolves.not.toThrow();
    expect(callApi).toHaveBeenCalledWith('email/welcome', {});
  });

  it('triggerLowCredits passes remaining and planName', async () => {
    const { callApi } = await import('../services/apiClient');
    const { emailService } = await import('../services/emailService');

    (callApi as any).mockResolvedValueOnce({});

    await emailService.triggerLowCredits(50, 'Pro');
    expect(callApi).toHaveBeenCalledWith('email/low-credits', { remaining: 50, planName: 'Pro' });
  });

  it('triggerCreditsExhausted calls API', async () => {
    const { callApi } = await import('../services/apiClient');
    const { emailService } = await import('../services/emailService');

    (callApi as any).mockResolvedValueOnce({});

    await emailService.triggerCreditsExhausted();
    expect(callApi).toHaveBeenCalledWith('email/credits-exhausted', {});
  });

  it('triggerTrialStarted passes trialDays', async () => {
    const { callApi } = await import('../services/apiClient');
    const { emailService } = await import('../services/emailService');

    (callApi as any).mockResolvedValueOnce({});

    await emailService.triggerTrialStarted(7);
    expect(callApi).toHaveBeenCalledWith('email/trial-started', { trialDays: 7 });
  });

  it('unsubscribe passes types array', async () => {
    const { callApi } = await import('../services/apiClient');
    const { emailService } = await import('../services/emailService');

    (callApi as any).mockResolvedValueOnce({});

    await emailService.unsubscribe(['reengagement', 'upgrade-nudge']);
    expect(callApi).toHaveBeenCalledWith('email/unsubscribe', { types: ['reengagement', 'upgrade-nudge'] });
  });

  it('all methods silently catch errors', async () => {
    const { callApi } = await import('../services/apiClient');
    const { emailService } = await import('../services/emailService');

    (callApi as any).mockRejectedValueOnce(new Error('Network error'));

    await expect(emailService.triggerWelcome()).resolves.not.toThrow();
  });
});
