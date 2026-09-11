/** Prisma `SongWhereInput` fragments: a song must belong to every listed snapshot. */
export const playlistMembershipAnd = (
  playlistIds: string[],
): Array<{ thematicPlaylists: { some: { playlistId: string } } }> =>
  playlistIds.map((playlistId) => ({
    thematicPlaylists: { some: { playlistId } },
  }));
