import type { PlaylistPoolStats, SoundSelection, WatchedPoolStats } from '@aniquizz/shared';

export interface CataloguePoolCounts {
  playableSongs: number;
  animeCount: number;
}

export interface ConfigPoolPreview {
  songs: number | null;
  animes: number | null;
  loading: boolean;
}

export function resolveConfigPoolPreview(input: {
  soundSelection: SoundSelection | string;
  catalogue: CataloguePoolCounts | null;
  catalogueLoading: boolean;
  watched: WatchedPoolStats | null;
  watchedLoading: boolean;
  playlist: PlaylistPoolStats | null;
  playlistLoading: boolean;
}): ConfigPoolPreview {
  if (input.soundSelection === 'watched') {
    return {
      songs: input.watched?.playableSongs ?? null,
      animes: input.watched?.animeCount ?? null,
      loading: input.watchedLoading,
    };
  }
  if (input.soundSelection === 'playlist') {
    return {
      songs: input.playlist?.playableSongs ?? null,
      animes: input.playlist?.animeCount ?? null,
      loading: input.playlistLoading,
    };
  }
  return {
    songs: input.catalogue?.playableSongs ?? null,
    animes: input.catalogue?.animeCount ?? null,
    loading: input.catalogueLoading,
  };
}
