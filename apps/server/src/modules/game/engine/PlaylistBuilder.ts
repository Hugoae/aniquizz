import { prisma } from '@aniquizz/database';
import {
  GAME_CONFIG,
  buildChoices,
  buildDuo,
  formatSongTypeLabel,
  shuffleArray,
  type Precision,
  type RoomSettings,
} from '@aniquizz/shared';
import { logger } from '../../../utils/logger';
import { getUserAnimeIds } from '../../anilist/anilistService';
import { getChoiceCandidates, getRandomSongs, type SelectedSong, type SongFilters } from '../gameService';
import type { PlaylistItem, RoomPlayer } from './types';

export type PlaylistAbortReason = 'watched_empty' | 'no_songs';

export interface BuiltPlaylist {
  playlist: PlaylistItem[];
  fallbackUsed: boolean;
  /** Set when the build failed for a known reason (empty playlist). */
  abortReason?: PlaylistAbortReason;
}

/**
 * Builds the full playlist for a match at start time:
 * resolves the Watched pool, selects songs, and pre-generates every round's
 * QCM/duo choices so the round loop never touches the DB.
 */
export class PlaylistBuilder {
  async build(settings: RoomSettings, players: RoomPlayer[]): Promise<BuiltPlaylist> {
    const isWatchedMode = settings.soundSelection === 'watched';
    let watchedIds: number[] | undefined;

    if (isWatchedMode) {
      watchedIds = await this.resolveWatchedIds(settings, players);
      // Never silently fall back to the global pool when Watched was requested but
      // no AniList lists could be resolved (missing link, empty list, intersection fail).
      if (!watchedIds.length) {
        return { playlist: [], fallbackUsed: false, abortReason: 'watched_empty' };
      }
    }

    const filters: SongFilters = {
      difficulty: settings.difficulty,
      types: settings.soundTypes,
      watchedIds,
    };

    const precision: Precision = settings.precision === 'exact' ? 'exact' : 'franchise';
    // Typing-only rooms never expose QCM/duo choices — don't even build them, so
    // the answer options never reach the client and can't be abused.
    const needsChoices = (settings.responseType ?? 'mix') !== 'typing';

    // Song selection and the QCM candidate pool are independent — run them in
    // parallel so a cold candidate cache (full anime scan) overlaps the song
    // cascade instead of adding to it.
    const startedAt = Date.now();
    const [songsResult, candidatePool] = await Promise.all([
      getRandomSongs(settings.soundCount || 10, filters),
      needsChoices ? getChoiceCandidates(precision) : Promise.resolve<string[]>([]),
    ]);
    const { songs, fallbackUsed } = songsResult;

    if (!songs.length) {
      return { playlist: [], fallbackUsed, abortReason: 'no_songs' };
    }

    const guessDuration = settings.guessDuration || 20;
    const playlist = songs.map((song) =>
      this.toPlaylistItem(song, precision, candidatePool, guessDuration, needsChoices),
    );

    logger.info(
      `[PlaylistBuilder] Built ${playlist.length} rounds in ${Date.now() - startedAt}ms ` +
        `(precision=${precision}, choices=${needsChoices}, watched=${isWatchedMode}, fallback=${fallbackUsed}).`,
      'Playlist',
    );

    return { playlist, fallbackUsed };
  }

  private toPlaylistItem(
    song: SelectedSong,
    precision: Precision,
    candidatePool: string[],
    guessDuration: number,
    needsChoices: boolean,
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
      videoStartTime: this.pickStartTime(song.duration, guessDuration),
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

  /**
   * Random offset into the clip. We reserve the whole guess + reveal window so
   * the video never runs out (and freezes on its last frame) during the reveal.
   * The safety margin is kept small (2s) so the random range stays as wide as
   * possible; only genuinely short songs (< ~guess + reveal) fall back to 0.
   */
  private pickStartTime(totalDuration: number | null, guessDuration: number): number {
    const total = totalDuration || 0;
    const revealTime = GAME_CONFIG.TIMERS.GUESS_REVEAL / 1000;
    const safetyMargin = 2;
    const maxStart = total - (guessDuration + revealTime + safetyMargin);
    return maxStart > 1 ? Math.floor(Math.random() * maxStart) : 0;
  }

  /** Resolve the union/intersection of players' AniList watched ids. */
  private async resolveWatchedIds(settings: RoomSettings, players: RoomPlayer[]): Promise<number[]> {
    // Bots have no AniList list and must not count toward the intersection quorum.
    const humanPlayers = players.filter((p) => !p.isBot);

    const needProfileLookup = humanPlayers.filter((p) => !p.anilistUsername).map((p) => p.userId);
    const profileMap = new Map<string, string | null>();
    if (needProfileLookup.length) {
      const profiles = await prisma.profile.findMany({
        where: { id: { in: needProfileLookup } },
        select: { id: true, anilistUsername: true },
      });
      profiles.forEach((p) => profileMap.set(p.id, p.anilistUsername));
    }

    // Resolve every human's list in parallel — a late joiner may not be warmed,
    // and sequential fetches would add up over a large lobby.
    const resolved = await Promise.all(
      humanPlayers.map(async (player) => {
        // Always resolve from the server-owned AniList username — never trust client-
        // supplied id lists (removed `player_watched_ids` socket event in Phase 9).
        const username = player.anilistUsername || profileMap.get(player.userId) || null;
        if (!username) return [] as number[];
        return getUserAnimeIds(username);
      }),
    );
    const perPlayerIds = resolved.filter((ids) => ids.length > 0);

    if (!perPlayerIds.length) {
      logger.warn('[PlaylistBuilder] Watched mode: no AniList lists resolved.', 'Anilist');
      return [];
    }

    if (settings.watchedMode === 'intersection') {
      if (perPlayerIds.length < humanPlayers.length) {
        logger.warn('[PlaylistBuilder] Intersection impossible (a player has no list).', 'Anilist');
        return [];
      }
      return perPlayerIds.reduce((acc, cur) => acc.filter((id) => cur.includes(id)), perPlayerIds[0]);
    }

    const union = new Set<number>();
    perPlayerIds.flat().forEach((id) => union.add(id));
    return Array.from(union);
  }
}
