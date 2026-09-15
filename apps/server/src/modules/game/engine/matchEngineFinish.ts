import {
  computeVictory,
  computeCompetitionRanks,
  levelFromXp,
  xpForMatch,
  normalizePrecision,
  pickMatchSettings,
  matchPlaylistPersistence,
  type CorrectByDifficulty,
  type ResponseType,
  type SongDifficulty,
  type VictoryData,
  type GameOverPayload,
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

export type MatchXpOutcome = {
  earned: number;
  oldLevel: number;
  newLevel: number;
  newXp: number;
  newWinStreak: number;
};

/**
 * Per-player match XP + level transitions. Bots and guests (no Profile) are
 * excluded. Best-effort: on any failure the match still ends (players simply
 * earn no XP this round).
 */
export async function computeMatchXp(
  host: MatchEngineHost,
  winnerIds: string[],
  rankByUser: Map<string, number>,
  playerCount: number,
): Promise<Map<string, MatchXpOutcome>> {
  const outcomes = new Map<string, MatchXpOutcome>();
  const humans = [...host.room.players.values()].filter((p) => !p.isBot);
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
  host.phase = null;
  host.clock.clear();
  host.room.status = 'finished';

  const settings = host.room.settings;
  const responseType = (settings.responseType ?? 'mix') as ResponseType;
  const songDifficulties = host.playlist.map((s) => normalizeSongDifficulty(s.difficulty));
  const competitors = [...host.room.players.values()].filter((p) => !p.isBot);
  const result = computeVictory({
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
    songDifficulties,
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

  const xpByUser = await computeMatchXp(host, result.winnerIds, rankByUser, rankings.length);
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

  const roundHistoryByUserId = buildRoundHistoryByUser(host.playlist, host.recordedRounds, [
    ...host.room.players.keys(),
  ]);
  const matchSettings = pickMatchSettings(host.room.settings);
  host.finishedVictoryData = victoryData;
  host.finishedRoundHistoryByUserId = roundHistoryByUserId;
  host.finishedMatchSettings = matchSettings;

  logger.info(
    `[MatchEngine ${host.room.id}] Match over. Winners: ${result.winnerIds.length || 'none'}.`,
    'Game',
  );

  const gameOverPayload: GameOverPayload = { victoryData, roundHistoryByUserId, matchSettings };
  host.channel.emit('game_over', gameOverPayload);

  for (const p of host.room.players.values()) {
    const outcome = xpByUser.get(p.userId);
    if (outcome && outcome.newLevel > outcome.oldLevel && p.socketId) {
      host.room.io.to(p.socketId).emit('level_up', {
        oldLevel: outcome.oldLevel,
        newLevel: outcome.newLevel,
        xp: outcome.newXp,
      });
    }
  }

  void host.deps.repo
    .persistMatch({
      gameType: host.room.settings.gameType === 'sprint' ? 'sprint' : 'standard',
      totalRounds: host.playlist.length,
      startedAt: host.startedAt,
      endedAt: new Date(),
      responseType: (host.room.settings.responseType ?? 'mix') as 'typing' | 'qcm' | 'mix',
      precision: normalizePrecision(host.room.settings.precision),
      players: [...host.room.players.values()]
        .filter((p) => !p.isBot)
        .map((p) => {
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
      rounds: host.recordedRounds,
      songIds: host.heardSongIds(),
      ...matchPlaylistPersistence(host.room.settings),
    })
    .catch((e) => logger.error(`[MatchEngine ${host.room.id}] persistMatch failed`, 'Scoring', e));
}
