/**
 * Tests for referral service — verifies API communication.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock apiClient
vi.mock('../services/apiClient', () => ({
  callApi: vi.fn(),
  getApiBaseUrl: vi.fn(() => 'http://localhost:3001'),
  getApiAuthHeaders: vi.fn(async () => ({ Authorization: 'Bearer test-token' })),
}));

describe('referralService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getReferralData returns null on error', async () => {
    const { referralService } = await import('../services/referralService');
    // fetch will fail in test env
    const result = await referralService.getReferralData();
    expect(result).toBeNull();
  });

  it('applyReferralCode returns success on valid response', async () => {
    const { callApi } = await import('../services/apiClient');
    const { referralService } = await import('../services/referralService');

    (callApi as any).mockResolvedValueOnce({
      message: 'Dodano 200 kredytów!',
      creditsAwarded: 200,
    });

    const result = await referralService.applyReferralCode('GPA-ABC12345');
    expect(result.success).toBe(true);
    expect(result.creditsAwarded).toBe(200);
  });

  it('applyReferralCode returns failure on error', async () => {
    const { callApi } = await import('../services/apiClient');
    const { referralService } = await import('../services/referralService');

    (callApi as any).mockRejectedValueOnce(new Error('Nieprawidłowy kod'));

    const result = await referralService.applyReferralCode('INVALID');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Nieprawidłowy');
  });
});
