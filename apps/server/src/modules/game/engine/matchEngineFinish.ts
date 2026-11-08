import {
  computeVictory,
  computeCompetitionRanks,
  isSpeedBonusEnabled,
  isTimeAttackSettings,
  levelFromXp,
  xpForMatch,
  normalizePrecision,
  normalizeTimeBudgetSeconds,
  pickMatchSettings,
  matchPlaylistPersistence,
  timeAttackMedal,
  timeAttackMedalTargets,
  type CorrectByDifficulty,
  type ResponseType,
  type SongDifficulty,
  type VictoryData,
  type GameOverPayload,
  type VictoryResult,
} from '@aniquizz/shared';
import { logger } from '../../../utils/logger';
import { buildRoundHistoryByUser } from './matchEngineReveal';
import type { MatchEngineHost } from './matchEngineHost';

export function normalizeSongDifficulty(raw: string): SongDifficulty {
  switch ((raw ?? '').toLowerCase()) {
    case 'easy':
      return 'easy';
    case 'hard':
      return 'hard';
    default:
      return 'medium';
  }
}

export function tallyCorrectByDifficulty(
  correctSongIds: Set<number>,
  difficultyBySong: Map<number, SongDifficulty>,
): CorrectByDifficulty {
  const tally: CorrectByDifficulty = { easy: 0, medium: 0, hard: 0 };
  for (const songId of correctSongIds) {
    const diff = difficultyBySong.get(songId);
    if (diff) tally[diff] += 1;
  }
  return tally;
}

function soloDifficultyLabel(difficulties: string[]): string {
  const set = new Set(difficulties.map((d) => d.toLowerCase()));
  if (set.size > 1) return 'Mixte';
  if (set.has('easy')) return 'Facile';
  if (set.has('hard')) return 'Difficile';
  if (set.has('medium')) return 'Moyen';
  return 'Normal';
}

function computeTimeAttackVictory(
  host: MatchEngineHost,
  players: FinishPlayerSnapshot[],
): VictoryResult {
  const settings = host.room.settings;
  const precision = normalizePrecision(settings.precision);
  const budget = normalizeTimeBudgetSeconds(settings.timeBudgetSeconds);
  const heardIds = new Set(host.recordedRounds.map((round) => round.songId));
  const songDifficulties = host.playlist
    .filter((item) => heardIds.has(item.id))
    .map((item) => normalizeSongDifficulty(item.difficulty));
  const competitors = players
    .filter((p) => !p.isBot)
    .map((p) => ({
      userId: p.userId,
      score: p.score,
      correctCount: p.matchCorrectCount,
      totalCount: p.matchTotalCount,
    }));
  const rankings = [...competitors].sort((a, b) => b.score - a.score);
  const found = rankings[0]?.score ?? 0;
  const targets = timeAttackMedalTargets(budget, songDifficulties, precision);
  const soloMedal = timeAttackMedal(found, budget, songDifficulties, precision);
  const winnerIds = soloMedal && rankings[0] ? [rankings[0].userId] : [];
  return {
    winnerIds,
    rankings,
    maxPossibleScore: targets.platinum,
    soloTargetRatio: targets.bronze / Math.max(1, targets.platinum),
    soloMedal,
    soloDifficultyLabel: soloDifficultyLabel(settings.difficulty ?? []),
    multiWinnerCount: 1,
  };
}

export type MatchXpOutcome = {
  earned: number;
  oldLevel: number;
  newLevel: number;
  newXp: number;
  newWinStreak: number;
};

/** Score fields copied before the first await so a relaunch cannot wipe them. */
export interface FinishPlayerSnapshot {
  userId: string;
  isBot: boolean;
  socketId: string | null;
  score: number;
  matchCorrectCount: number;
  matchTotalCount: number;
  maxStreak: number;
  correctSongIds: Set<number>;
}

export function snapshotPlayers(host: Pick<MatchEngineHost, 'room'>): FinishPlayerSnapshot[] {
  return [...host.room.players.values()].map((player) => ({
    userId: player.userId,
    isBot: player.isBot === true,
    socketId: player.socketId,
    score: player.score,
    matchCorrectCount: player.matchCorrectCount,
    matchTotalCount: player.matchTotalCount,
    maxStreak: player.maxStreak,
    correctSongIds: new Set(player.correctSongIds),
  }));
}

/**
 * Per-player match XP + level transitions. Bots and guests (no Profile) are
 * excluded. Best-effort: on any failure the match still ends (players simply
 * earn no XP this round).
 */
export async function computeMatchXp(
  host: Pick<MatchEngineHost, 'deps' | 'playlist' | 'room'>,
  players: FinishPlayerSnapshot[],
  winnerIds: string[],
  rankByUser: Map<string, number>,
  playerCount: number,
): Promise<Map<string, MatchXpOutcome>> {
  const outcomes = new Map<string, MatchXpOutcome>();
  const humans = players.filter((p) => !p.isBot);
  if (!humans.length) return outcomes;

  const difficultyBySong = new Map<number, SongDifficulty>(
    host.playlist.map((s) => [s.id, normalizeSongDifficulty(s.difficulty)]),
  );

  try {
    const priors = await host.deps.repo.getXpState(humans.map((p) => p.userId));
    for (const player of humans) {
      const prior = priors.get(player.userId);
      if (!prior) continue;

      const isWinner = winnerIds.includes(player.userId);
      const newWinStreak = isWinner ? prior.currentWinStreak + 1 : 0;
      const earned = xpForMatch({
        correctByDifficulty: tallyCorrectByDifficulty(player.correctSongIds, difficultyBySong),
        roundsPlayed: player.matchTotalCount,
        score: player.score,
        isWinner,
        rank: rankByUser.get(player.userId) ?? playerCount,
        playerCount,
        isSolo: host.room.isSolo,
        winStreak: newWinStreak,
      });

      const oldLevel = levelFromXp(prior.xp);
      const newXp = prior.xp + earned;
      outcomes.set(player.userId, {
        earned,
        oldLevel,
        newLevel: levelFromXp(newXp),
        newXp,
        newWinStreak,
      });
    }
  } catch (e) {
    logger.error(`[MatchEngine ${host.room.id}] XP computation failed`, 'Scoring', e);
  }

  return outcomes;
}

export async function finishMatch(host: MatchEngineHost): Promise<void> {
  if (host.finishStarted) return;
  host.finishStarted = true;
  host.finishing = true;
  try {
    host.phase = null;
    host.clock.clear();
    host.budget.clear();
    host.room.status = 'finished';
    // Starts the finished-room idle clock (see roomIdlePolicy).
    host.room.touch();

    const players = snapshotPlayers(host);
    const recordedRounds = [...host.recordedRounds];
    const songIds = host.heardSongIds();
    const settings = host.room.settings;
    const responseType = (settings.responseType ?? 'mix') as ResponseType;
    const competitors = players.filter((p) => !p.isBot);
    const result = isTimeAttackSettings(settings)
      ? computeTimeAttackVictory(host, players)
      : computeVictory({
          players: competitors.map((p) => ({
            userId: p.userId,
            score: p.score,
            correctCount: p.matchCorrectCount,
            totalCount: p.matchTotalCount,
          })),
          totalRounds: host.playlist.length,
          responseType,
          isSolo: host.room.isSolo,
          difficulties: settings.difficulty ?? [],
          songDifficulties: host.playlist.map((s) => normalizeSongDifficulty(s.difficulty)),
          precision: normalizePrecision(settings.precision),
        });

    const rankByUser = computeCompetitionRanks(
      result.rankings.map((r) => ({ id: r.userId, score: r.score })),
    );
    const publicPlayers = host.room.toPublicPlayers(true);
    const rankings = [...publicPlayers].sort((a, b) => b.score - a.score);
    const winner =
      result.winnerIds.length > 0
        ? (rankings.find((p) => String(p.id) === result.winnerIds[0]) ?? null)
        : null;

    const roundHistoryByUserId = buildRoundHistoryByUser(
      host.playlist,
      recordedRounds,
      players.map((p) => p.userId),
    );
    const matchSettings = pickMatchSettings(host.room.settings);

    const unsavedTest = settings.testMatch === true;
    const xpByUser = unsavedTest
      ? new Map<string, MatchXpOutcome>()
      : await computeMatchXp(host, players, result.winnerIds, rankByUser, rankings.length);
    for (const rp of rankings) {
      const outcome = xpByUser.get(String(rp.id));
      if (outcome) rp.xpEarned = outcome.earned;
    }

    const victoryData: VictoryData = {
      winner,
      winnerIds: result.winnerIds,
      rankings,
      totalMaxScore: result.maxPossibleScore,
      soloTargetRatio: result.soloTargetRatio,
      soloMedal: result.soloMedal,
      soloDifficulty: result.soloDifficultyLabel,
      multiWinnerCount: result.multiWinnerCount,
    };

    host.finishedVictoryData = victoryData;
    host.finishedRoundHistoryByUserId = roundHistoryByUserId;
    host.finishedMatchSettings = matchSettings;

    logger.info(
      `[MatchEngine ${host.room.id}] Match over. Winners: ${result.winnerIds.length || 'none'}.`,
      'Game',
    );

    const gameOverPayload: GameOverPayload = { victoryData, roundHistoryByUserId, matchSettings };
    host.channel.emit('game_over', gameOverPayload);

    for (const player of players) {
      const outcome = xpByUser.get(player.userId);
      if (outcome && outcome.newLevel > outcome.oldLevel && player.socketId) {
        host.room.io.to(player.socketId).emit('level_up', {
          oldLevel: outcome.oldLevel,
          newLevel: outcome.newLevel,
          xp: outcome.newXp,
        });
      }
    }

    if (unsavedTest) {
      logger.info(
        `[MatchEngine ${host.room.id}] Test match finished; results were not saved.`,
        'Game',
      );
      return;
    }

    void host.deps.repo
      .persistMatch({
        speedBonusEnabled: isSpeedBonusEnabled(settings),
        timeAttack: isTimeAttackSettings(settings),
        totalRounds: recordedRounds.length,
        startedAt: host.startedAt,
        endedAt: new Date(),
        responseType: (settings.responseType ?? 'mix') as 'typing' | 'qcm' | 'mix',
        precision: normalizePrecision(settings.precision),
        players: competitors.map((p) => {
          const outcome = xpByUser.get(p.userId);
          return {
            userId: p.userId,
            score: p.score,
            rank: rankByUser.get(p.userId) ?? 0,
            isWinner: result.winnerIds.includes(p.userId),
            correctCount: p.matchCorrectCount,
            totalCount: p.matchTotalCount,
            maxStreak: p.maxStreak,
            xpEarned: outcome?.earned ?? 0,
            newLevel: outcome?.newLevel,
            newWinStreak: outcome?.newWinStreak,
            correctSongIds: [...p.correctSongIds],
            soloMedal: host.room.isSolo ? result.soloMedal : null,
          };
        }),
        rounds: recordedRounds,
        songIds,
        ...matchPlaylistPersistence(settings),
      })
      .catch((e) =>
        logger.error(`[MatchEngine ${host.room.id}] persistMatch failed`, 'Scoring', e),
      );
  } finally {
    host.finishing = false;
  }
}
