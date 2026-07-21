import { getApiBaseUrl, getApiAuthHeaders } from './apiClient';

export interface EvergreenItem {
  id: string;
  platform: string;
  sourceContent: string;
  recycleAfterDays: number;
  nextRunAt: string;
  timesRecycled: number;
  status: 'active' | 'paused' | 'archived';
}

async function evergreenFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getApiAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/api/evergreen${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(init?.headers || {}),
    },
    credentials: 'include',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (body as { error?: string }).error ||
        (body as { message?: string }).message ||
        `Evergreen API (${res.status})`
    );
  }
  return body as T;
}

export const evergreenService = {
  list(): Promise<{ items: EvergreenItem[] }> {
    return evergreenFetch('');
  },

  enqueue(input: {
    content: string;
    platform: string;
    recycleAfterDays?: number;
    sourceHistoryId?: string;
    connectionId?: string;
  }): Promise<{ item: EvergreenItem }> {
    return evergreenFetch('', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  pause(id: string): Promise<{ ok: boolean }> {
    return evergreenFetch(`/${id}/pause`, { method: 'POST', body: '{}' });
  },

  resume(id: string): Promise<{ ok: boolean }> {
    return evergreenFetch(`/${id}/resume`, { method: 'POST', body: '{}' });
  },
};
