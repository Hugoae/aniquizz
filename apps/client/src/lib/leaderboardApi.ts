import type { LeaderboardBrowseParams, LeaderboardResponse } from '@aniquizz/shared';
import { supabase } from './supabase';
import { env } from './env';

const API_BASE =
  import.meta.env.MODE === 'production'
    ? env.VITE_SERVER_URL || 'https://aniquizz-server.onrender.com'
    : 'http://localhost:3001';

export class LeaderboardApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'LeaderboardApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((init.headers as Record<string, string>) ?? {}),
    },
  });
  if (!response.ok) {
    let message = `Erreur ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep the HTTP fallback when the response is not JSON.
    }
    throw new LeaderboardApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

const browseQuery = (params: LeaderboardBrowseParams): string => {
  const query = new URLSearchParams();
  if (params.metric) query.set('metric', params.metric);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  const value = query.toString();
  return value ? `?${value}` : '';
};

export const leaderboardApi = {
  browse: (params: LeaderboardBrowseParams = {}, init: RequestInit = {}) =>
    request<LeaderboardResponse>(`/leaderboard${browseQuery(params)}`, init),
};
