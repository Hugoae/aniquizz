import type {
  SuggestionAdminUpdateInput,
  SuggestionCreateInput,
  SuggestionItem,
  SuggestionsBrowseParams,
  SuggestionSongOptionsParams,
  SuggestionSongOptionsResponse,
  SuggestionsResponse,
  SuggestionVoteResponse,
} from '@aniquizz/shared';
import { supabase } from './supabase';
import { env } from './env';

const API_BASE =
  import.meta.env.MODE === 'production'
    ? env.VITE_SERVER_URL || 'https://aniquizz-server.onrender.com'
    : 'http://localhost:3001';

export class SuggestionsApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'SuggestionsApiError';
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
    throw new SuggestionsApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const browseQuery = (params: SuggestionsBrowseParams): string => {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.sort) query.set('sort', params.sort);
  if (params.category) query.set('category', params.category);
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  const value = query.toString();
  return value ? `?${value}` : '';
};

const songOptionsQuery = (params: SuggestionSongOptionsParams): string => {
  const query = new URLSearchParams();
  query.set('q', params.q);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return `?${query.toString()}`;
};

export const suggestionsApi = {
  browse: (params: SuggestionsBrowseParams = {}, init: RequestInit = {}) =>
    request<SuggestionsResponse>(`/suggestions${browseQuery(params)}`, init),
  songOptions: (params: SuggestionSongOptionsParams, init: RequestInit = {}) =>
    request<SuggestionSongOptionsResponse>(
      `/suggestions/song-options${songOptionsQuery(params)}`,
      init,
    ),
  create: (input: SuggestionCreateInput) =>
    request<SuggestionItem>('/suggestions', { method: 'POST', body: JSON.stringify(input) }),
  vote: (id: string) =>
    request<SuggestionVoteResponse>(`/suggestions/${id}/vote`, { method: 'PUT' }),
  unvote: (id: string) =>
    request<SuggestionVoteResponse>(`/suggestions/${id}/vote`, { method: 'DELETE' }),
  deleteOwn: (id: string) => request<void>(`/suggestions/${id}`, { method: 'DELETE' }),
  adminUpdate: (id: string, input: SuggestionAdminUpdateInput) =>
    request<SuggestionItem>(`/admin/suggestions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  adminDelete: (id: string) =>
    request<void>(`/admin/suggestions/${id}`, { method: 'DELETE' }),
};
