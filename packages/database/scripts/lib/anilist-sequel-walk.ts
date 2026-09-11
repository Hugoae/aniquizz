/**
 * Locked-franchise sequel walk for step 1 (AniList fetch).
 *
 * Walking every seed is required: a movie/OVA SEQUEL edge can hide a later TV
 * season. Without a cache, that re-fetches the same ids from every seed
 * (O(n²) HTTP for an n-season chain) with almost no console output.
 */

export interface AniListRelationNode {
  id: number;
  type: string;
  format?: string;
}

export interface AniListRelationEdge {
  relationType: string;
  node: AniListRelationNode;
}

export interface AniListMedia {
  id: number;
  status?: string;
  title?: { romaji?: string | null };
  relations?: { edges?: AniListRelationEdge[] };
  [key: string]: unknown;
}

export function isReleasedAniListStatus(status: string | undefined): boolean {
  return status === 'FINISHED' || status === 'RELEASING';
}

export function findSequelEdge(media: AniListMedia): AniListRelationEdge | undefined {
  return media.relations?.edges?.find(
    (edge) => edge.relationType === 'SEQUEL' && edge.node.type === 'ANIME',
  );
}

/** Dedupes in-flight and completed fetches so each id hits the network at most once. */
export function createCachedFetcher<T>(
  fetchMedia: (id: number) => Promise<T | null>,
): (id: number) => Promise<T | null> {
  const cache = new Map<number, T | null>();
  const inflight = new Map<number, Promise<T | null>>();

  return async (id: number): Promise<T | null> => {
    if (cache.has(id)) return cache.get(id) ?? null;
    const pending = inflight.get(id);
    if (pending) return pending;

    const request = fetchMedia(id)
      .then((media) => {
        // Do not cache misses: a timeout/403 on one hop must not skip that id later
        // in the same run (prequel walk, another seed, new-franchise sequels).
        if (media != null) cache.set(id, media);
        return media;
      })
      .finally(() => {
        inflight.delete(id);
      });

    inflight.set(id, request);
    return request;
  };
}

export interface LockedFranchiseSeed<TAnime extends { id: number } = { id: number }> {
  franchiseName: string;
  animes: TAnime[];
}

/**
 * Follow SEQUEL edges from every locked season. New released sequels are
 * appended (unlocked) so they continue through the rest of the pipeline.
 */
export async function expandLockedFranchiseSequels<TAnime extends { id: number }>(
  franchise: LockedFranchiseSeed<TAnime>,
  excludedAnimeIds: Set<number>,
  lockedAnimeIds: Set<number>,
  fetchMedia: (id: number) => Promise<AniListMedia | null>,
  adaptNewSeason: (media: AniListMedia) => TAnime = (media) => media as unknown as TAnime,
): Promise<number> {
  let newlyAdded = 0;
  const visited = new Set<number>();

  for (const seed of franchise.animes) {
    if (visited.has(seed.id)) continue;

    let current = await fetchMedia(seed.id);
    if (!current) continue;

    let depth = 0;
    while (current && depth < 15) {
      depth++;
      visited.add(current.id);

      const sequelEdge = findSequelEdge(current);
      if (!sequelEdge) break;

      const sequelId = sequelEdge.node.id;
      if (excludedAnimeIds.has(sequelId)) break;

      if (franchise.animes.find((anime) => anime.id === sequelId) || lockedAnimeIds.has(sequelId)) {
        current = await fetchMedia(sequelId);
        if (!current) {
          // Make chain interruptions visible: a failed hop here silently hid the
          // "Nouvelle saison" check for everything after this season.
          console.log(
            `   ! Chaîne interrompue pour "${franchise.franchiseName}" (échec fetch id=${sequelId})`,
          );
        }
        continue;
      }

      const newSeason = await fetchMedia(sequelId);
      const prefix = `   + Nouvelle saison de "${franchise.franchiseName}"...`;

      // Full console.log lines (not stdout.write + \\r progress) so PowerShell keeps them.
      if (!newSeason) {
        console.log(`${prefix} Stop (Erreur/Non trouvé)`);
        break;
      }
      if (!isReleasedAniListStatus(newSeason.status)) {
        console.log(`${prefix} Stop (Statut: ${newSeason.status})`);
        break;
      }

      console.log(`${prefix} OK (${newSeason.title?.romaji ?? sequelId})`);
      franchise.animes.push(adaptNewSeason(newSeason));
      lockedAnimeIds.add(sequelId);
      newlyAdded++;
      current = newSeason;
    }
  }

  return newlyAdded;
}
