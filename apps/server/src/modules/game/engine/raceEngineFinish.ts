import {
  computeRaceWinners,
  matchPlaylistPersistence,
  normalizePrecision,
  normalizeTimeBudgetSeconds,
  pickMatchSettings,
  rankRaceStandings,
  timeAttackMedal,
  type GameOverPayload,
  type RaceStandingEntry,
  type RoundHistoryEntry,
  type VictoryData,
} from '@aniquizz/shared';
import { logger } from '../../../utils/logger';
import {
  computeMatchXp,
  normalizeSongDifficulty,
  snapshotPlayers,
  type MatchXpOutcome,
} from './matchEngineFinish';
import { buildRoundHistoryByUser } from './matchEngineReveal';
import type { RaceEngine } from './RaceEngine';
import type { RaceLane } from './RaceLane';
import type { RecordedRound } from './types';

/** Merges every lane's rounds by title index so one row per round is persisted. */
function mergeLaneRounds(engine: RaceEngine): RecordedRound[] {
  const byRound = new Map<number, RecordedRound>();
  for (const lane of engine.lanes.values()) {
    for (const round of lane.rounds) {
      const merged = byRound.get(round.roundNumber) ?? {
        roundNumber: round.roundNumber,
        songId: round.songId,
        answers: [],
      };
      merged.answers.push(...round.answers);
      byRound.set(round.roundNumber, merged);
    }
  }
  return [...byRound.values()].sort((a, b) => a.roundNumber - b.roundNumber);
}

/**
 * Ends a versus race once every lane is done. Every lane, bots included, is
 * ranked for the displayed standings (most found, then fewest songs heard).
 * The win itself is recomputed on humans only, so a bot cannot take a podium
 * place. Mirrors `finishMatch` for persistence.
 */
export async function finishRace(engine: RaceEngine): Promise<void> {
  if (engine.finishStarted) return;
  engine.finishStarted = true;
  engine.finishing = true;
  const { room } = engine;
  try {
    engine.phase = null;
    for (const lane of engine.lanes.values()) lane.dispose();
    room.status = 'finished';
    room.touch();

    const settings = room.settings;
    const budget = normalizeTimeBudgetSeconds(settings.timeBudgetSeconds);
    const precision = normalizePrecision(settings.precision);
    const players = snapshotPlayers(engine);
    const competitors = players.filter((p) => !p.isBot);
    const difficultyBySong = new Map(
      engine.playlist.map((item) => [item.id, normalizeSongDifficulty(item.difficulty)]),
    );

    const competingLanes = players
      .map((p) => engine.lanes.get(p.userId))
      .filter((lane): lane is RaceLane => lane !== undefined && !lane.removed);
    const ranked = rankRaceStandings(
      competingLanes.map((lane) => ({
        userId: lane.userId,
        found: lane.found,
        heard: lane.heardCount(),
        remainingMs: lane.remainingMs(),
      })),
    );
    const humanIds = new Set(competitors.map((p) => p.userId));
    const humanRanked = rankRaceStandings(ranked.filter((entry) => humanIds.has(entry.userId)));
    const { winnerIds, winnerCount } = computeRaceWinners(humanRanked);
    const rankByUser = new Map(ranked.map((entry) => [entry.userId, entry.rank]));
    const humanRankByUser = new Map(humanRanked.map((entry) => [entry.userId, entry.rank]));
    const standings: RaceStandingEntry[] = ranked.map((entry) => {
      const lane = engine.lanes.get(entry.userId)!;
      const difficulties = lane
        .heardSongIds(engine.playlist)
        .map((id) => difficultyBySong.get(id) ?? 'medium');
      return {
        userId: entry.userId,
        found: entry.found,
        heard: entry.heard,
        skips: lane.skips(),
        remainingMs: entry.remainingMs,
        rank: entry.rank,
        medal: timeAttackMedal(entry.found, budget, difficulties, precision),
      };
    });

    const orderOf = new Map(ranked.map((entry, index) => [entry.userId, index]));
    const rankings = room
      .toPublicPlayers(true)
      .sort(
        (a, b) =>
          (orderOf.get(String(a.id)) ?? Number.MAX_SAFE_INTEGER) -
            (orderOf.get(String(b.id)) ?? Number.MAX_SAFE_INTEGER) || b.score - a.score,
      );
    const winner = winnerIds[0]
      ? (rankings.find((p) => String(p.id) === winnerIds[0]) ?? null)
      : null;

    const roundHistoryByUserId: Record<string, RoundHistoryEntry[]> = {};
    for (const lane of engine.lanes.values()) {
      Object.assign(
        roundHistoryByUserId,
        buildRoundHistoryByUser(engine.playlist, lane.rounds, [lane.userId]),
      );
    }

    // Placement XP follows the human race: a bot ahead must not drop a player's place.
    const unsavedTest = settings.testMatch === true;
    const xpByUser = unsavedTest
      ? new Map<string, MatchXpOutcome>()
      : await computeMatchXp(engine, players, winnerIds, humanRankByUser, humanRanked.length);
    for (const rp of rankings) {
      const outcome = xpByUser.get(String(rp.id));
      if (outcome) rp.xpEarned = outcome.earned;
    }

    const victoryData: VictoryData = {
      winner,
      winnerIds,
      rankings,
      totalMaxScore: 0,
      soloTargetRatio: 0,
      soloMedal: null,
      soloDifficulty: 'Normal',
      multiWinnerCount: winnerCount,
      race: { standings },
    };
    const payload: GameOverPayload = {
      victoryData,
      roundHistoryByUserId,
      matchSettings: pickMatchSettings(settings),
    };
    engine.finishedPayload = payload;

    logger.info(
      `[RaceEngine ${room.id}] Race over. Winners: ${winnerIds.length || 'none'}.`,
      'Game',
    );
    engine.channel.emit('game_over', payload);

    for (const player of players) {
      const outcome = xpByUser.get(player.userId);
      if (outcome && outcome.newLevel > outcome.oldLevel && player.socketId) {
        room.io.to(player.socketId).emit('level_up', {
          oldLevel: outcome.oldLevel,
          newLevel: outcome.newLevel,
          xp: outcome.newXp,
        });
      }
    }

    if (unsavedTest) {
      logger.info(`[RaceEngine ${room.id}] Test match finished; results were not saved.`, 'Game');
      return;
    }

    const rounds = mergeLaneRounds(engine);
    const allHeard = new Set<number>();
    void engine.deps.repo
      .persistMatch({
        speedBonusEnabled: false,
        timeAttack: true,
        totalRounds: rounds.length,
        startedAt: engine.startedAt,
        endedAt: new Date(),
        responseType: 'typing',
        precision,
        players: competitors.map((p) => {
          const outcome = xpByUser.get(p.userId);
          const heard = engine.lanes.get(p.userId)?.heardSongIds(engine.playlist) ?? [];
          heard.forEach((id) => allHeard.add(id));
          return {
            userId: p.userId,
            score: p.score,
            rank: rankByUser.get(p.userId) ?? 0,
            isWinner: winnerIds.includes(p.userId),
            correctCount: p.matchCorrectCount,
            totalCount: p.matchTotalCount,
            maxStreak: p.maxStreak,
            xpEarned: outcome?.earned ?? 0,
            newLevel: outcome?.newLevel,
            newWinStreak: outcome?.newWinStreak,
            correctSongIds: [...p.correctSongIds],
            // Medals ride on victoryData; the stored solo medal stays solo-only.
            soloMedal: null,
            heardSongIds: heard,
          };
        }),
        rounds,
        songIds: [...allHeard],
        ...matchPlaylistPersistence(settings),
      })
      .catch((e) => logger.error(`[RaceEngine ${room.id}] persistMatch failed`, 'Scoring', e));
  } finally {
    engine.finishing = false;
  }
}
