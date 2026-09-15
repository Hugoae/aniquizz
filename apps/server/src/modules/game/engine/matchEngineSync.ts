import {
  GAME_CONFIG,
  matchHeardSongIds,
  type GameReadyPayload,
  type GameSyncState,
  type RoundRevealPayload,
  type RoundStartPayload,
} from '@aniquizz/shared';
import { toPlaybackUrl } from '../../../lib/mediaPlaybackUrl';
import { toRevealSong } from './matchEngineReveal';
import type { MatchEngineHost } from './matchEngineHost';
import type { AdminMatchProgress } from './types';

export function heardSongIds(host: MatchEngineHost): number[] {
  const inProgress =
    !host.isRoundEnded &&
    (host.phase === 'guessing' || host.phase === 'reveal') &&
    host.currentRoundIndex >= 0 &&
    host.currentRoundIndex < host.playlist.length
      ? host.playlist[host.currentRoundIndex].id
      : null;
  return matchHeardSongIds({
    recordedSongIds: host.recordedRounds.map((round) => round.songId),
    inProgressSongId: inProgress,
  });
}

export function buildMatchSyncState(host: MatchEngineHost): GameSyncState {
  const item = host.currentRoundIndex >= 0 ? host.playlist[host.currentRoundIndex] : null;
  const base: GameSyncState = {
    status: host.room.status,
    currentRound:
      host.currentRoundIndex >= 0 ? host.currentRoundIndex + 1 : host.phase === 'ready' ? 1 : 0,
    totalRounds: host.playlist.length,
    players: host.room.toPublicPlayers(host.phase === 'reveal'),
    phase: host.phase,
    round: null as RoundStartPayload | null,
    reveal: null as RoundRevealPayload | null,
    ready: null as GameReadyPayload | null,
    introFirstVideo:
      host.phase === 'intro'
        ? host.playlist[0]
          ? toPlaybackUrl(host.playlist[0].videoKey)
          : null
        : undefined,
  };

  if (host.room.status === 'finished' && host.finishedVictoryData) {
    base.victoryData = host.finishedVictoryData;
    base.roundHistoryByUserId = host.finishedRoundHistoryByUserId ?? undefined;
    base.matchSettings = host.finishedMatchSettings ?? undefined;
    return base;
  }

  if (host.phase === 'ready' && host.playlist[0] && host.readyStartsAt) {
    base.ready = {
      serverNow: Date.now(),
      startsAt: host.readyStartsAt,
      durationSeconds: host.playlist[0].guessDuration,
    };
  } else if (host.phase === 'guessing' && item) {
    base.round = host.buildRoundStartPayload(item);
  } else if (host.phase === 'reveal' && item) {
    const nextItem = host.playlist[host.currentRoundIndex + 1];
    base.reveal = {
      round: host.currentRoundIndex + 1,
      song: toRevealSong(item),
      players: host.room.toPublicPlayers(true),
      nextVideo: nextItem ? toPlaybackUrl(nextItem.videoKey) : null,
      nextVideoStartTime: nextItem?.videoStartTime ?? null,
      serverNow: Date.now(),
      endsAt: host.clock.endsAt,
      durationSeconds: Math.max(1, Math.round(GAME_CONFIG.TIMERS.GUESS_REVEAL / 1000)),
    };
  }

  return base;
}

/** Admin-only live progress snapshot (may reveal the current anime/title). */
export function buildAdminProgress(host: MatchEngineHost): AdminMatchProgress {
  const item = host.currentRoundIndex >= 0 ? host.playlist[host.currentRoundIndex] : null;
  return {
    currentRound: Math.max(0, host.currentRoundIndex + 1),
    totalRounds: host.playlist.length,
    phase: host.phase,
    anime: item?.anime ?? null,
    title: item?.title ?? null,
    artist: item?.artist ?? null,
    typeLabel: item?.typeLabel ?? null,
    videoKey: item?.videoKey ?? null,
    videoStartTime: item?.videoStartTime ?? null,
    cover: item?.cover ?? null,
    endsAt: host.clock.endsAt || null,
  };
}
