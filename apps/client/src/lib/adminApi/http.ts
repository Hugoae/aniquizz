import { supabase } from '../supabase';
import { serverApiBase } from '../env';
import { ADMIN_HTTP_ERROR } from '@/features/admin/copy/adminCopy';

/**
 * Thin client for the server-side admin REST API. Every call attaches the
 * Supabase access token as a Bearer header; the server enforces roles.
 */

const API_BASE = serverApiBase();

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await authHeaders()),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${API_BASE}/admin${path}`, { ...init, headers });
  if (!res.ok) {
    let message = ADMIN_HTTP_ERROR[res.status] ?? `Erreur ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body?.error === 'string' && body.error.trim()) message = body.error;
    } catch {
      /* ignore */
    }
    throw new AdminApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
