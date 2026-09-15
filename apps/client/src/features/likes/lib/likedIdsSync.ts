/** Merge a server snapshot with in-flight optimistic toggles so a stale GET cannot clobber a PUT. */
export function mergeLikedIdsFromServer(
  serverIds: readonly number[],
  pending: ReadonlyMap<number, boolean>,
): Set<number> {
  const next = new Set(serverIds);
  for (const [songId, liked] of pending) {
    if (liked) next.add(songId);
    else next.delete(songId);
  }
  return next;
}

/** Prefer the live set once ready or while a toggle for this song is in flight. */
export function resolveSongLikedState(opts: {
  ready: boolean;
  inSet: boolean;
  initialLiked: boolean;
  hasPending: boolean;
}): boolean {
  if (opts.ready || opts.hasPending) return opts.inSet;
  return opts.inSet || opts.initialLiked;
}
