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

export interface BuiltPlaylist {
  playlist: PlaylistItem[];
  fallbackUsed: boolean;
}

/**
 * Builds the full playlist for a match at start time:
 * resolves the Watched pool, selects songs, and pre-generates every round's
 * QCM/duo choices so the round loop never touches the DB.
 */
export class PlaylistBuilder {
  async build(settings: RoomSettings, players: RoomPlayer[]): Promise<BuiltPlaylist> {
    const isWatchedMode = settings.soundSelection === 'watched';
    const watchedIds = isWatchedMode ? await this.resolveWatchedIds(settings, players) : undefined;

    const filters: SongFilters = {
      difficulty: settings.difficulty,
      types: settings.soundTypes,
      playlist: settings.playlist,
      decade: settings.decade,
      watchedIds,
    };

    const { songs, fallbackUsed } = await getRandomSongs(settings.soundCount || 10, filters);
    if (!songs.length) {
      return { playlist: [], fallbackUsed };
    }

    const precision: Precision = settings.precision === 'exact' ? 'exact' : 'franchise';
    // Typing-only rooms never expose QCM/duo choices — don't even build them, so
    // the answer options never reach the client and can't be abused.
    const needsChoices = (settings.responseType ?? 'mix') !== 'typing';
    const candidatePool = needsChoices
      ? await getChoiceCandidates(precision, {
          playlist: settings.playlist,
          decade: settings.decade,
        })
      : [];

    const guessDuration = settings.guessDuration || 20;
    const playlist = songs.map((song) =>
      this.toPlaylistItem(song, precision, candidatePool, guessDuration, needsChoices),
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

    return {
      id: song.id,
      anime: song.anime.name,
      franchise,
      validAnswers: [song.anime.name, ...(song.anime.altNames || []), franchise].filter(
        Boolean,
      ) as string[],
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
      siteUrl: song.anime.siteUrl || `https://anilist.co/anime/${song.anime.id}`,
      tags: song.anime.franchise?.genres || [],
      choices,
      duo,
    };
  }

  /** Random offset that leaves room for guess + reveal + safety margin. */
  private pickStartTime(totalDuration: number | null, guessDuration: number): number {
    const total = totalDuration || 0;
    const revealTime = GAME_CONFIG.TIMERS.GUESS_REVEAL / 1000;
    const safetyMargin = 5;
    const maxStart = total - (guessDuration + revealTime + safetyMargin);
    return maxStart > 0 ? Math.floor(Math.random() * maxStart) : 0;
  }

  /** Resolve the union/intersection of players' AniList watched ids. */
  private async resolveWatchedIds(settings: RoomSettings, players: RoomPlayer[]): Promise<number[]> {
    const needProfileLookup = players.filter((p) => !p.anilistUsername).map((p) => p.userId);
    const profileMap = new Map<string, string | null>();
    if (needProfileLookup.length) {
      const profiles = await prisma.profile.findMany({
        where: { id: { in: needProfileLookup } },
        select: { id: true, anilistUsername: true },
      });
      profiles.forEach((p) => profileMap.set(p.id, p.anilistUsername));
    }

    const perPlayerIds: number[][] = [];
    for (const player of players) {
      if (player.watchedIds?.length) {
        perPlayerIds.push(player.watchedIds);
        continue;
      }
      const username = player.anilistUsername || profileMap.get(player.userId) || null;
      if (!username) continue;
      const ids = await getUserAnimeIds(username);
      if (ids.length) perPlayerIds.push(ids);
    }

    if (!perPlayerIds.length) {
      logger.warn('[PlaylistBuilder] Watched mode: no AniList lists resolved.', 'Anilist');
      return [];
    }

    if (settings.watchedMode === 'intersection') {
      if (perPlayerIds.length < players.length) {
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
