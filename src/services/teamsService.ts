import { getApiBaseUrl, getApiAuthHeaders } from './apiClient';
import type { Team } from '../types';

export interface TeamWithRole extends Team {
  myRole?: 'owner' | 'manager' | 'member';
}

async function teamsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeaders = await getApiAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/api/teams${path}`, {
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
    throw new Error((body as { error?: string; message?: string }).error
      || (body as { message?: string }).message
      || `Teams API error (${res.status})`);
  }
  return body as T;
}

export const teamsService = {
  async list(): Promise<TeamWithRole[]> {
    const data = await teamsFetch<{ teams: TeamWithRole[] }>('');
    return data.teams || [];
  },

  async create(name: string): Promise<TeamWithRole> {
    const data = await teamsFetch<{ team: TeamWithRole }>('', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    return data.team;
  },

  async invite(teamId: string, email: string, role: 'manager' | 'member' = 'member') {
    return teamsFetch<{ status: string; email: string; role: string }>(`/${teamId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  },

  async acceptInvites(token?: string): Promise<{ acceptedTeamIds: string[]; teams: TeamWithRole[] }> {
    return teamsFetch<{ acceptedTeamIds: string[]; teams: TeamWithRole[] }>('/invites/accept', {
      method: 'POST',
      body: JSON.stringify(token ? { token } : {}),
    });
  },
};
