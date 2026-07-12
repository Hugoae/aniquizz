import type {
  LibraryBrowseParams,
  LibraryMetaResponse,
  LibrarySong,
  LibrarySongsResponse,
  LibraryTreeResponse,
} from '@aniquizz/shared';
import { supabase } from './supabase';
import { env } from './env';

const IS_PROD = import.meta.env.MODE === 'production';
const API_BASE = IS_PROD
  ? env.VITE_SERVER_URL || 'https://aniquizz-server.onrender.com'
  : 'http://localhost:3001';

export class LibraryApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function optionalAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await optionalAuthHeaders()),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new LibraryApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

function toQuery(params: LibraryBrowseParams): string {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.songType?.length) qs.set('songType', params.songType.join(','));
  if (params.difficulty?.length) qs.set('difficulty', params.difficulty.join(','));
  if (params.franchiseId !== undefined) qs.set('franchiseId', String(params.franchiseId));
  if (params.animeId !== undefined) qs.set('animeId', String(params.animeId));
  if (params.discovered) qs.set('discovered', params.discovered);
  if (params.sort) qs.set('sort', params.sort);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  const raw = qs.toString();
  return raw ? `?${raw}` : '';
}

export const libraryApi = {
  meta: () => request<LibraryMetaResponse>('/library/meta'),
  song: (id: number) => request<LibrarySong>(`/library/song/${id}`),
  songs: (params: LibraryBrowseParams = {}) =>
    request<LibrarySongsResponse>(`/library/songs${toQuery(params)}`),
  tree: (params: LibraryBrowseParams = {}) =>
    request<LibraryTreeResponse>(`/library/tree${toQuery(params)}`),
};
