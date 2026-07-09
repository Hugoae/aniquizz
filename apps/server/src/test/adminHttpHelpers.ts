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
