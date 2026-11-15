/**
 * A late lobby join can carry the settings from before the host saved.
 * Apply a snapshot only when it is at least as new as the one already shown.
 * A missing revision (older server) still applies.
 */
export function acceptRoomSettingsRevision(seen: number, incoming: number | undefined): boolean {
  if (incoming == null || !Number.isInteger(incoming)) return true;
  return incoming >= seen;
}
