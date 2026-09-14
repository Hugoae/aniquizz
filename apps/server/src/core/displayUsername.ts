/** Display-only name from JWT metadata — never used as identity. */
export function usernameFromMetadata(
  metadata: Record<string, unknown> | undefined,
  fallback: string,
): string {
  if (!metadata) return fallback;
  const raw = [metadata.username, metadata.user_name, metadata.name].find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0,
  );
  return raw?.trim() || fallback;
}

/**
 * Authenticated sockets must show Profile.username (rename source of truth).
 * Metadata is only a fallback when the Profile row is not there yet (signup race).
 */
export function resolveAuthenticatedUsername(
  profileUsername: string | null | undefined,
  metadataUsername: string,
): string {
  const fromProfile = profileUsername?.trim();
  return fromProfile || metadataUsername;
}

/**
 * Authenticated lobby joins ignore the client-sent name (it can lag a rename or be spoofed).
 * Guests still use the handshake / payload display name.
 */
export function resolveLobbyUsername(
  isAuthenticated: boolean,
  socketUsername: string | null | undefined,
  payloadUsername: string | undefined,
): string {
  if (isAuthenticated) {
    return socketUsername?.trim() || 'Joueur';
  }
  return payloadUsername?.trim() || socketUsername?.trim() || 'Joueur';
}
