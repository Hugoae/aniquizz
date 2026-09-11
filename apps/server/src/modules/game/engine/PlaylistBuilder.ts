import {
  GAME_CONFIG,
  buildChoices,
  buildDuo,
  formatSongTypeLabel,
  normalizePrecision,
  normalizeSongStartMode,
  playlistSourceIds,
  type Precision,
  type RoomSettings,
  type SongStartMode,
} from '@aniquizz/shared';
import { logger } from '../../../utils/logger';
import { getChoiceCandidates, getRandomSongs, listPlayableAnimeIds, type SelectedSong, type SongFilters } from '../gameService';
import { loadPlaylistPoolScope } from '../playlistRecipeService';
import { resolveWatchedIds } from '../watchedPoolService';
import type { PlaylistItem, RoomPlayer } from './types';

export type PlaylistAbortReason = 'watched_empty' | 'no_songs' | 'playlist_empty' | 'playlist_missing';

export interface BuiltPlaylist {
  playlist: PlaylistItem[];
  fallbackUsed: boolean;
  /** True when fetchWithFallback had to climb past the host's difficulty filter. */
  difficultyRelaxed?: boolean;
  /** Set when the build failed for a known reason (empty playlist). */
  abortReason?: PlaylistAbortReason;
}

/**
 * Builds the full playlist for a match at start time:
 * resolves the Watched pool / thematic snapshot, selects songs, and pre-generates
 * every round's QCM/duo choices so the round loop never touches the DB.
 */
export class PlaylistBuilder {
  async build(
    settings: RoomSettings,
    players: RoomPlayer[],
    options?: { excludePriorMatchSongIds?: number[] },
  ): Promise<BuiltPlaylist> {
    const isPlaylist = settings.soundSelection === 'playlist';
    const playlistWatched = isPlaylist && Boolean(settings.playlistWatched);
    const isWatchedMode = settings.soundSelection === 'watched' || playlistWatched;

    let playlistIds: string[] | undefined;
    let snapshotAnimeIds: number[] | undefined;

    if (isPlaylist) {
      const ids = playlistSourceIds(settings);
      if (!ids.length) {
        return { playlist: [], fallbackUsed: false, abortReason: 'playlist_missing' };
      }
      const scope = await loadPlaylistPoolScope(ids);
      if (!scope || !scope.isPublished || scope.liveCount === 0) {
        return { playlist: [], fallbackUsed: false, abortReason: 'playlist_empty' };
      }
      playlistIds = scope.playlistIds;
    }

    let watchedIds: number[] | undefined;
    if (isWatchedMode) {
      watchedIds = await resolveWatchedIds(
        settings.watchedMode ?? 'union',
        players.map((p) => ({
          userId: p.userId,
          isBot: p.isBot,
          anilistUsername: p.anilistUsername,
          malUsername: p.malUsername,
        })),
      );
      if (!watchedIds.length && !(playlistWatched && settings.watchedAllowFallback)) {
        return { playlist: [], fallbackUsed: false, abortReason: 'watched_empty' };
      }
      if (!watchedIds.length) watchedIds = undefined;
    }

    const filters: SongFilters = {
      difficulty: settings.difficulty,
      types: settings.soundTypes,
      watchedIds,
      playlistIds,
      allowWatchedFallback: settings.watchedAllowFallback ?? false,
      excludePriorMatchSongIds: options?.excludePriorMatchSongIds,
    };

    const precision: Precision = normalizePrecision(settings.precision);
    const needsChoices = (settings.responseType ?? 'mix') !== 'typing';

    const startedAt = Date.now();
    const overlayRestrictsChoices = playlistWatched && Boolean(watchedIds?.length) && !settings.watchedAllowFallback;
    const [songsResult, candidatePool] = await Promise.all([
      getRandomSongs(settings.soundCount || 10, filters),
      needsChoices
        ? (async () => {
            if (playlistIds) {
              snapshotAnimeIds = await listPlayableAnimeIds({
                playlistIds,
                ...(overlayRestrictsChoices ? { watchedIds } : {}),
              });
            }
            return getChoiceCandidates(
              precision,
              this.choiceAnimeIds(
                isWatchedMode,
                watchedIds,
                snapshotAnimeIds,
                playlistWatched,
                settings.watchedAllowFallback,
              ),
            );
          })()
        : Promise.resolve<string[]>([]),
    ]);
    const { songs, fallbackUsed, priorMatchReuse, difficultyRelaxed } = songsResult;

    if (!songs.length) {
      return { playlist: [], fallbackUsed, difficultyRelaxed, abortReason: 'no_songs' };
    }

    const guessDuration = settings.guessDuration || 20;
    const songStartMode = normalizeSongStartMode(settings.songStartMode);
    const playlist = songs.map((song) =>
      this.toPlaylistItem(song, precision, candidatePool, guessDuration, needsChoices, songStartMode),
    );

    logger.info(
      `[PlaylistBuilder] Built ${playlist.length} rounds in ${Date.now() - startedAt}ms ` +
        `(precision=${precision}, choices=${needsChoices}, watched=${isWatchedMode}, playlist=${isPlaylist}, fallback=${fallbackUsed}, difficultyRelaxed=${difficultyRelaxed}, priorReuse=${priorMatchReuse}, songStart=${songStartMode}).`,
      'Playlist',
    );

    return { playlist, fallbackUsed, difficultyRelaxed };
  }

  private choiceAnimeIds(
    isWatchedMode: boolean,
    watchedIds: number[] | undefined,
    snapshotAnimeIds: number[] | undefined,
    playlistWatched: boolean,
    allowFallback: boolean | undefined,
  ): number[] | undefined {
    if (snapshotAnimeIds) {
      if (playlistWatched && watchedIds?.length && !allowFallback) {
        const watched = new Set(watchedIds);
        return snapshotAnimeIds.filter((id) => watched.has(id));
      }
      return snapshotAnimeIds;
    }
    if (isWatchedMode) return watchedIds;
    return undefined;
  }

  private toPlaylistItem(
    song: SelectedSong,
    precision: Precision,
    candidatePool: string[],
    guessDuration: number,
    needsChoices: boolean,
    songStartMode: SongStartMode,
  ): PlaylistItem {
    const franchise = song.anime.franchise?.name ?? null;
    const correctTarget = precision === 'franchise' ? franchise || song.anime.name : song.anime.name;

    const choices = needsChoices ? buildChoices(correctTarget, candidatePool, 4) : [];
    const duo = needsChoices ? buildDuo(correctTarget, choices) : [];

    const baseAnswers = [song.anime.name, ...(song.anime.altNames || [])];
    const validAnswers =
      precision === 'franchise' && franchise
        ? ([...baseAnswers, franchise] as string[])
        : (baseAnswers.filter(Boolean) as string[]);

    return {
      id: song.id,
      anime: song.anime.name,
      franchise,
      validAnswers,
      title: song.title,
      artist: song.artist,
      typeLabel: formatSongTypeLabel(song.songType, song.sequence),
      difficulty: song.difficulty.toLowerCase(),
      videoKey: song.videoKey,
      videoStartTime: this.pickStartTime(song.duration, guessDuration, songStartMode),
      guessDuration,
      cover: song.anime.coverImage,
      animeId: song.anime.id,
      year: song.anime.seasonYear,
      season: song.anime.season,
      format: song.anime.format,
      episodeRange: song.episodeRange,
      coverColor: song.anime.coverColor,
      siteUrl: song.anime.siteUrl || `https://anilist.co/anime/${song.anime.id}`,
      tags: song.anime.franchise?.genres || [],
      choices,
      duo,
    };
  }

  private pickStartTime(
    totalDuration: number | null,
    guessDuration: number,
    songStartMode: SongStartMode,
  ): number {
    if (normalizeSongStartMode(songStartMode) === 'beginning') return 0;

    const total = totalDuration || 0;
    const revealTime = GAME_CONFIG.TIMERS.GUESS_REVEAL / 1000;
    const safetyMargin = 2;
    const maxStart = total - (guessDuration + revealTime + safetyMargin);
    return maxStart > 1 ? Math.floor(Math.random() * maxStart) : 0;
  }
}
