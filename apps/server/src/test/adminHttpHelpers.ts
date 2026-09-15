import type { SanctionUpdatePayload } from '@aniquizz/shared';

/** Call an admin REST endpoint from integration tests. */
export async function adminRequest<T>(
  baseUrl: string,
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${baseUrl}/admin${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...((init.headers as Record<string, string>) ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Admin ${init.method ?? 'GET'} ${path} failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

export const adminMute = (
  baseUrl: string,
  token: string,
  userId: string,
  minutes: number | null,
): Promise<SanctionUpdatePayload & { id: string }> =>
  adminRequest(baseUrl, token, `/users/${userId}/mute`, {
    method: 'POST',
    body: JSON.stringify({ minutes }),
  });

/** POST mute — returns status so callers can assert 400 without throwing. */
export async function adminMuteStatus(
  baseUrl: string,
  token: string,
  userId: string,
  minutes: number | null,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${baseUrl}/admin/users/${userId}/mute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ minutes }),
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* empty / non-JSON */
  }
  return { status: res.status, body };
}

/** PATCH role — returns status so callers can assert 400/403 without throwing. */
export async function adminSetRole(
  baseUrl: string,
  token: string,
  userId: string,
  role: 'USER' | 'MODERATOR' | 'ADMIN',
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${baseUrl}/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* empty / non-JSON */
  }
  return { status: res.status, body };
}
