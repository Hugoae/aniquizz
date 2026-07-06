import { randomUUID } from 'crypto';
import { AnswerType as PrismaAnswerType, Prisma } from '@prisma/client';
import { prisma } from '@aniquizz/database';
import type { AnswerType } from '@aniquizz/shared';
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
  correctSongIds: number[];
}

export interface PersistMatchInput {
  totalRounds: number;
  startedAt: Date;
  endedAt: Date;
  players: PersistPlayerInput[];
  rounds: RecordedRound[];
  songIds: number[];
}

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
  async persistMatch(input: PersistMatchInput): Promise<void> {
    // Only persist for players that actually have a Profile row.
    const existing = await prisma.profile.findMany({
      where: { id: { in: input.players.map((p) => p.userId) } },
      select: { id: true, maxStreak: true },
    });
    const profileById = new Map(existing.map((p) => [p.id, p]));
    const players = input.players.filter((p) => profileById.has(p.userId));

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
            mode: 'STANDARD',
            status: 'FINISHED',
            totalRounds: input.totalRounds,
            startedAt: input.startedAt,
            endedAt: input.endedAt,
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
    for (const player of players) {
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
          },
        });

        const correctSet = new Set(player.correctSongIds);
        for (const songId of songIds) {
          const wasCorrect = correctSet.has(songId);
          await prisma.songHistory
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
        }
      } catch (error) {
        logger.error(`[MatchRepository] Aggregate stats failed for ${player.userId}`, 'Scoring', error);
      }
    }
  }
}
