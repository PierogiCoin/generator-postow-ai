/**
 * Referral Service (frontend) — komunikacja z backend referral API.
 */

import { callApi, getApiBaseUrl, getApiAuthHeaders } from './apiClient';

export interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  totalEarned: number;
  pendingRewards: number;
}

export interface ReferralEntry {
  id: string;
  referee_id: string;
  status: string;
  reward_claimed: boolean;
  created_at: string;
}

export interface ReferralData {
  referralCode: string;
  referralLink: string;
  stats: ReferralStats;
  referrals: ReferralEntry[];
  rewards: {
    referrer: number;
    referee: number;
  };
}

async function referralGet<T>(path: string): Promise<T> {
  const authHeaders = await getApiAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'GET',
    headers: authHeaders,
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Referral API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export const referralService = {
  async getReferralData(): Promise<ReferralData | null> {
    try {
      return await referralGet<ReferralData>('/api/referral');
    } catch {
      return null;
    }
  },

  async applyReferralCode(code: string): Promise<{ success: boolean; message: string; creditsAwarded?: number }> {
    try {
      const result = await callApi('referral/apply', { referralCode: code });
      return {
        success: true,
        message: result.message || 'Kod zastosowany!',
        creditsAwarded: result.creditsAwarded,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nie udało się zastosować kodu';
      return { success: false, message: msg };
    }
  },
};
