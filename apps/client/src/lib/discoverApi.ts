import type { SongOfTheDayResponse } from '@aniquizz/shared';
import { serverApiBase } from './env';
import { supabase } from './supabase';

const API_BASE = serverApiBase();

export class DiscoverApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'DiscoverApiError';
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
      /* keep the HTTP fallback */
    }
    throw new DiscoverApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

export const discoverApi = {
  today: () => request<SongOfTheDayResponse>('/discover/today'),
  heard: () => request<SongOfTheDayResponse>('/discover/today/heard', { method: 'POST' }),
};
