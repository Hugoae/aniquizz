import {
  normalizePrecision,
  normalizeTimeBudgetSeconds,
  normalizeVideoMode,
  timeAttackMedal,
  timeAttackNextMedalGoal,
  timeAttackTaxMs,
  TIME_ATTACK_REVEAL_SECONDS,
  type GameSyncState,
  type RaceBoardEntry,
  type RaceBoardPayload,
  type RoundRevealPayload,
  type RoundStartPayload,
  type TimeAttackNextMedal,
} from '@aniquizz/shared';
import { toPlaybackUrl } from '../../../lib/mediaPlaybackUrl';
import { normalizeSongDifficulty } from './matchEngineFinish';
import { toRevealSong } from './matchEngineReveal';
import { START_BUFFER_MS } from './matchEngineTimers';
import type { RaceEngine } from './RaceEngine';
import type { RaceLane } from './RaceLane';
import type { PlaylistItem } from './types';

// Server-authoritative payloads for the versus race. Everything is built per lane
// so a player only ever receives their own run plus the public board.

export function buildRaceSyncState(engine: RaceEngine, userId?: string): GameSyncState {
  const lane = userId ? engine.lanes.get(userId) : undefined;
  const item = lane && lane.index >= 0 ? engine.playlist[lane.index] : undefined;
  const base: GameSyncState = {
    status: engine.room.status,
    currentRound: lane ? Math.max(lane.index + 1, engine.phase === 'ready' ? 1 : 0) : 0,
    totalRounds: engine.playlist.length,
    players:
      userId && lane
        ? engine.room.toPublicPlayersFor(userId, lane.phase === 'reveal')
        : engine.room.toPublicPlayers(false),
    phase: syncPhase(engine, lane),
    round: null,
    reveal: null,
    ready: null,
    introFirstVideo:
      engine.phase === 'intro'
        ? engine.playlist[0]
          ? toPlaybackUrl(engine.playlist[0].videoKey)
          : null
        : undefined,
    raceBoard: boardPayload(engine),
  };
  if (lane) {
    Object.assign(base, {
      remainingMs: lane.remainingMs(),
      foundCount: lane.found,
      ...laneCue(engine, lane),
    });
    if (lane.isDone) base.laneDone = true;
  }

  if (engine.room.status === 'finished' && engine.finishedPayload) {
    base.victoryData = engine.finishedPayload.victoryData;
    base.roundHistoryByUserId = engine.finishedPayload.roundHistoryByUserId;
    base.matchSettings = engine.finishedPayload.matchSettings;
    return base;
  }
  if (engine.phase === 'ready' && engine.playlist[0] && engine.readyStartsAt) {
    base.ready = {
      serverNow: Date.now(),
      startsAt: engine.readyStartsAt,
      durationSeconds: engine.playlist[0].guessDuration,
    };
  } else if (lane && item && lane.phase === 'guessing') {
    base.round = buildRoundStart(engine, lane, item);
  } else if (lane && item && lane.phase === 'reveal') {
    base.reveal = buildReveal(engine, lane, item, false);
  }
  return base;
}

function syncPhase(engine: RaceEngine, lane: RaceLane | undefined): GameSyncState['phase'] {
  if (engine.phase === 'intro' || engine.phase === 'ready') return engine.phase;
  if (lane?.phase === 'guessing' || lane?.phase === 'reveal') return lane.phase;
  return null;
}

export function buildRoundStart(
  engine: RaceEngine,
  lane: RaceLane,
  item: PlaylistItem,
): RoundStartPayload {
  return {
    round: lane.index + 1,
    totalRounds: engine.playlist.length,
    videoKey: toPlaybackUrl(item.videoKey),
    videoStartTime: item.videoStartTime,
    startBuffer: START_BUFFER_MS,
    serverNow: Date.now(),
    endsAt: lane.clock.endsAt,
    durationSeconds: item.guessDuration,
    choices: item.choices,
    peekWindow: lane.peekWindow ?? undefined,
    videoMode: normalizeVideoMode(engine.room.settings.videoMode),
    remainingMs: lane.remainingMs(),
    foundCount: lane.found,
    ...laneCue(engine, lane),
  };
}

export function buildReveal(
  engine: RaceEngine,
  lane: RaceLane,
  item: PlaylistItem,
  skipped: boolean,
): RoundRevealPayload {
  const next = engine.playlist[lane.index + 1];
  return {
    round: lane.index + 1,
    ...(skipped ? { skipped: true } : {}),
    song: toRevealSong(item),
    // Only this lane's own answer is revealed: opponents' guesses stay private.
    players: engine.room.toPublicPlayersFor(lane.userId, true),
    nextVideo: next ? toPlaybackUrl(next.videoKey) : null,
    nextVideoStartTime: next?.videoStartTime ?? null,
    serverNow: Date.now(),
    endsAt: lane.clock.endsAt,
    durationSeconds: TIME_ATTACK_REVEAL_SECONDS,
    remainingMs: lane.remainingMs(),
    foundCount: lane.found,
    ...laneCue(engine, lane),
  };
}

/** Same inputs as the lane's final medal: its own heard songs, not the lobby filter. */
export function laneCue(
  engine: RaceEngine,
  lane: RaceLane,
): {
  nextSkipTaxMs: number;
  nextMedal: TimeAttackNextMedal | null;
} {
  const heard = new Set(lane.heardSongIds(engine.playlist));
  const current = engine.playlist[lane.index];
  if (current) heard.add(current.id);
  const difficulties = engine.playlist
    .filter((item) => heard.has(item.id))
    .map((item) => normalizeSongDifficulty(item.difficulty));
  const budget = normalizeTimeBudgetSeconds(engine.room.settings.timeBudgetSeconds);
  const precision = normalizePrecision(engine.room.settings.precision);
  const medal = timeAttackMedal(lane.found, budget, difficulties, precision);
  const goal = timeAttackNextMedalGoal(lane.found, budget, difficulties, medal, precision);
  return {
    nextSkipTaxMs: timeAttackTaxMs('skip', lane.budget.skips, engine.punitiveSkip()),
    nextMedal: goal ? { tier: goal.tier, pointsNeeded: goal.pointsNeeded } : null,
  };
}

export function boardPayload(engine: RaceEngine): RaceBoardPayload {
  const entries: RaceBoardEntry[] = [];
  for (const lane of engine.lanes.values()) {
    if (lane.removed) continue;
    entries.push({
      userId: lane.userId,
      foundCount: lane.found,
      heardCount: lane.heardCount(),
      skips: lane.skips(),
      remainingMs: lane.remainingMs(),
      running: lane.budget.isRunning,
      finished: lane.isDone,
      streak: engine.room.players.get(lane.userId)?.streak ?? 0,
    });
  }
  return { serverNow: Date.now(), entries };
}
