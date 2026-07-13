import { randomUUID } from 'crypto';
import { AnswerType as PrismaAnswerType, Prisma, StoredPrecision, StoredResponseType, StoredSoloMedal } from '@prisma/client';
import { prisma, isBotId } from '@aniquizz/database';
import type { AnswerType } from '@aniquizz/shared';
import type { MedalTier } from '@aniquizz/shared';
import { logger } from '../../../utils/logger';
import type { RecordedRound } from './types';

export interface PersistPlayerInput {
  userId: string;
  score: number;
  rank: number;
  isWinner: boolean;
  correctCount: number;
  totalCount: number;
  maxStreak: number;
  xpEarned: number;
  /** New derived level (from lifetime XP). Undefined = don't touch xp/level. */
  newLevel?: number;
  /** New consecutive-win counter (win +1, loss 0). Undefined = don't touch. */
  newWinStreak?: number;
  correctSongIds: number[];
  /** Solo medal snapshot (null in multiplayer or no medal earned). */
  soloMedal: MedalTier;
}

/** Prior XP state read before a match's XP is computed. */
export interface XpState {
  xp: number;
  currentWinStreak: number;
}

export interface PersistMatchInput {
  gameType: 'standard' | 'sprint';
  totalRounds: number;
  startedAt: Date;
  endedAt: Date;
  responseType: 'typing' | 'qcm' | 'mix';
  precision: 'anime' | 'franchise';
  players: PersistPlayerInput[];
  rounds: RecordedRound[];
  songIds: number[];
}

const toPrismaGameMode = (gameType: 'standard' | 'sprint') =>
  gameType === 'sprint' ? 'SPRINT' : 'STANDARD';

const toStoredResponseType = (responseType: 'typing' | 'qcm' | 'mix'): StoredResponseType => {
  switch (responseType) {
    case 'typing':
      return StoredResponseType.TYPING;
    case 'qcm':
      return StoredResponseType.QCM;
    default:
      return StoredResponseType.MIX;
  }
};

const toStoredPrecision = (precision: 'anime' | 'franchise'): StoredPrecision =>
  precision === 'anime' ? StoredPrecision.ANIME : StoredPrecision.FRANCHISE;

const toStoredSoloMedal = (medal: MedalTier): StoredSoloMedal | null => {
  if (!medal) return null;
  switch (medal) {
    case 'bronze':
      return StoredSoloMedal.BRONZE;
    case 'silver':
      return StoredSoloMedal.SILVER;
    case 'gold':
      return StoredSoloMedal.GOLD;
    case 'platinum':
      return StoredSoloMedal.PLATINUM;
    default:
      return null;
  }
};

const toPrismaAnswerType = (t: AnswerType): PrismaAnswerType => {
  switch (t) {
    case 'typing':
      return PrismaAnswerType.TYPING;
    case 'qcm':
      return PrismaAnswerType.QCM;
    case 'duo':
      return PrismaAnswerType.DUO;
    default:
      return PrismaAnswerType.TYPING;
  }
};

/**
 * Persists a finished match: Match / MatchPlayer / MatchRound / RoundAnswer are
 * written atomically; Profile aggregate stats and SongHistory are updated
 * best-effort afterwards (a stats hiccup must not lose match history).
 */
export class MatchRepository {
  /**
   * Reads the prior XP / win-streak of the given profiles so the engine can
   * compute match XP and detect level-ups. Only returns rows that exist
   * (guests without a Profile are naturally excluded).
   */
  async getXpState(userIds: string[]): Promise<Map<string, XpState>> {
    const humanIds = userIds.filter((id) => !isBotId(id));
    if (!humanIds.length) return new Map();
    try {
      const rows = await prisma.profile.findMany({
        where: { id: { in: humanIds } },
        select: { id: true, xp: true, currentWinStreak: true },
      });
      return new Map(rows.map((r) => [r.id, { xp: r.xp, currentWinStreak: r.currentWinStreak }]));
    } catch (e) {
      logger.error('[MatchRepository] Failed to read XP state', 'Scoring', e);
      return new Map();
    }
  }

  async persistMatch(input: PersistMatchInput): Promise<void> {
    const humanPlayers = input.players.filter((p) => !isBotId(p.userId));
    if (!humanPlayers.length) {
      logger.warn('[MatchRepository] No human players to persist; skipping match persistence.', 'Scoring');
      return;
    }

    // Only persist for players that actually have a Profile row.
    const existing = await prisma.profile.findMany({
      where: { id: { in: humanPlayers.map((p) => p.userId) } },
      select: { id: true, maxStreak: true },
    });
    const profileById = new Map(existing.map((p) => [p.id, p]));
    const players = humanPlayers.filter((p) => profileById.has(p.userId));

    if (!players.length) {
      logger.warn('[MatchRepository] No persistable players; skipping match persistence.', 'Scoring');
      return;
    }

    const matchId = randomUUID();
    const matchPlayerIdByUser = new Map<string, string>();
    players.forEach((p) => matchPlayerIdByUser.set(p.userId, randomUUID()));

    const roundIdByNumber = new Map<number, string>();
    input.rounds.forEach((r) => roundIdByNumber.set(r.roundNumber, randomUUID()));

    const roundRows: Prisma.MatchRoundCreateManyInput[] = input.rounds.map((r) => ({
      id: roundIdByNumber.get(r.roundNumber)!,
      matchId,
      roundNumber: r.roundNumber,
      songId: r.songId,
    }));

    const answerRows: Prisma.RoundAnswerCreateManyInput[] = [];
    for (const round of input.rounds) {
      const roundId = roundIdByNumber.get(round.roundNumber)!;
      for (const ans of round.answers) {
        const matchPlayerId = matchPlayerIdByUser.get(ans.userId);
        if (!matchPlayerId) continue;
        answerRows.push({
          id: randomUUID(),
          roundId,
          matchPlayerId,
          answer: ans.answer,
          isCorrect: ans.isCorrect,
          answerType: toPrismaAnswerType(ans.answerType),
          timeMs: ans.timeMs,
          pointsAwarded: ans.pointsAwarded,
        });
      }
    }

    try {
      await prisma.$transaction([
        prisma.match.create({
          data: {
            id: matchId,
            mode: toPrismaGameMode(input.gameType),
            status: 'FINISHED',
            totalRounds: input.totalRounds,
            startedAt: input.startedAt,
            endedAt: input.endedAt,
            responseType: toStoredResponseType(input.responseType),
            precision: toStoredPrecision(input.precision),
          },
        }),
        prisma.matchPlayer.createMany({
          data: players.map((p) => ({
            id: matchPlayerIdByUser.get(p.userId)!,
            matchId,
            profileId: p.userId,
            score: p.score,
            rank: p.rank,
            isWinner: p.isWinner,
            correctCount: p.correctCount,
            xpEarned: p.xpEarned,
            soloMedal: toStoredSoloMedal(p.soloMedal),
          })),
        }),
        prisma.matchRound.createMany({ data: roundRows }),
        prisma.roundAnswer.createMany({ data: answerRows }),
      ]);
    } catch (e) {
      logger.error('[MatchRepository] Failed to persist match detail', 'Scoring', e);
      return;
    }

    await this.updateAggregates(players, input.songIds, profileById);
    logger.info(`[MatchRepository] Match ${matchId} persisted (${players.length} players).`, 'Scoring');
  }

  private async updateAggregates(
    players: PersistPlayerInput[],
    songIds: number[],
    profileById: Map<string, { maxStreak: number }>,
  ): Promise<void> {
    await Promise.all(
      players.map((player) => this.updatePlayerAggregates(player, songIds, profileById)),
    );
  }

  private async updatePlayerAggregates(
    player: PersistPlayerInput,
    songIds: number[],
    profileById: Map<string, { maxStreak: number }>,
  ): Promise<void> {
    try {
      const prevMaxStreak = profileById.get(player.userId)?.maxStreak ?? 0;
      await prisma.profile.update({
        where: { id: player.userId },
        data: {
          gamesPlayed: { increment: 1 },
          gamesWon: player.isWinner ? { increment: 1 } : undefined,
          totalGuesses: { increment: player.totalCount },
          correctGuesses: { increment: player.correctCount },
          maxStreak: Math.max(prevMaxStreak, player.maxStreak),
          xp: player.xpEarned > 0 ? { increment: player.xpEarned } : undefined,
          level: player.newLevel,
          currentWinStreak: player.newWinStreak,
        },
      });

      const correctSet = new Set(player.correctSongIds);
      await Promise.all(
        songIds.map((songId) => {
          const wasCorrect = correctSet.has(songId);
          return prisma.songHistory
            .upsert({
              where: { profileId_songId: { profileId: player.userId, songId } },
              create: {
                profileId: player.userId,
                songId,
                playCount: 1,
                correctCount: wasCorrect ? 1 : 0,
                lastPlayedAt: new Date(),
              },
              update: {
                playCount: { increment: 1 },
                correctCount: wasCorrect ? { increment: 1 } : undefined,
                lastPlayedAt: new Date(),
              },
            })
            .catch((err: unknown) => {
              const message = err instanceof Error ? err.message : String(err);
              logger.warn(`[MatchRepository] SongHistory upsert failed (${songId}): ${message}`, 'Scoring');
            });
        }),
      );
    } catch (error) {
      logger.error(`[MatchRepository] Aggregate stats failed for ${player.userId}`, 'Scoring', error);
    }
  }
}
