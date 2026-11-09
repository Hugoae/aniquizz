import { randomUUID } from 'crypto';
import {
  prisma,
  Prisma,
  type AnswerType as PrismaAnswerType,
  type StoredPrecision,
  type StoredResponseType,
  type StoredSoloMedal,
} from '@aniquizz/database';
import type { AnswerType } from '@aniquizz/shared';
import { logger } from '../../../utils/logger';
import type { PersistMatchInput, PersistPlayerInput } from './MatchRepository';

export interface ActivityOpenInput {
  startedAt: Date;
  totalRounds: number;
  speedBonusEnabled: boolean;
  timeAttack?: boolean;
  responseType: PersistMatchInput['responseType'];
  precision: PersistMatchInput['precision'];
  playlistId?: string | null;
  decadePlaylistId?: string | null;
}

export type CloseActivityResult = 'closed' | 'missing' | 'failed';

const toPrismaGameMode = (input: { speedBonusEnabled: boolean; timeAttack?: boolean }) => {
  if (input.timeAttack) return 'TIME_ATTACK' as const;
  return input.speedBonusEnabled ? 'SPRINT' : 'STANDARD';
};

const isUniqueConflict = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

export interface ActivityMappers {
  responseType: (responseType: PersistMatchInput['responseType']) => StoredResponseType;
  precision: (precision: PersistMatchInput['precision']) => StoredPrecision;
  soloMedal: (medal: PersistPlayerInput['soloMedal']) => StoredSoloMedal | null;
  answerType: (answerType: AnswerType) => PrismaAnswerType;
}

/**
 * Opens the match row before the first title. Rounds written afterwards survive
 * a restart or a quit, because they no longer wait for the finish transaction.
 */
export async function openActivityMatch(
  input: ActivityOpenInput,
  map: Pick<ActivityMappers, 'responseType' | 'precision'>,
): Promise<string | null> {
  try {
    const row = await prisma.match.create({
      data: {
        mode: toPrismaGameMode(input),
        status: 'IN_PROGRESS',
        totalRounds: Math.max(1, input.totalRounds),
        startedAt: input.startedAt,
        responseType: map.responseType(input.responseType),
        precision: map.precision(input.precision),
        playlistId: input.playlistId ?? undefined,
        decadePlaylistId: input.decadePlaylistId ?? undefined,
      },
      select: { id: true },
    });
    return row.id;
  } catch (error) {
    logger.error('[MatchRepository] Failed to open activity match', 'Scoring', error);
    return null;
  }
}

/** One row per title that actually started. A second lane on the same index is a no-op. */
export async function recordPlayedRound(
  matchId: string,
  roundNumber: number,
  songId: number,
): Promise<void> {
  try {
    await prisma.matchRound.create({
      data: { matchId, roundNumber, songId },
    });
  } catch (error) {
    if (isUniqueConflict(error)) return;
    logger.error('[MatchRepository] Failed to record a played round', 'Scoring', error);
  }
}

/**
 * Keeps every round already written. The match is not deleted: a title that
 * lands a moment later still has a row to attach to, and the tops still count it.
 */
export async function abandonActivityMatch(matchId: string): Promise<void> {
  try {
    await prisma.match.update({
      where: { id: matchId },
      data: { status: 'ABANDONED', endedAt: new Date() },
    });
  } catch (error) {
    logger.error('[MatchRepository] Failed to abandon activity match', 'Scoring', error);
  }
}

/**
 * Closes a match that was opened at start. Rounds already stored are reused
 * (`skipDuplicates`) so a finished match is not counted twice.
 * `missing` means the opener never landed, so the caller may insert a new match.
 * `failed` means the row exists and a second insert would double-count.
 */
export async function finishOpenedActivityMatch(
  matchId: string,
  input: PersistMatchInput,
  players: PersistPlayerInput[],
  map: ActivityMappers,
): Promise<CloseActivityResult> {
  const existing = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true },
  });
  if (!existing) return 'missing';

  const matchPlayerIdByUser = new Map<string, string>();
  players.forEach((player) => matchPlayerIdByUser.set(player.userId, randomUUID()));

  try {
    await prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: matchId },
        data: {
          mode: toPrismaGameMode(input),
          status: 'FINISHED',
          totalRounds: input.totalRounds,
          startedAt: input.startedAt,
          endedAt: input.endedAt,
          responseType: map.responseType(input.responseType),
          precision: map.precision(input.precision),
          playlistId: input.playlistId ?? null,
          decadePlaylistId: input.decadePlaylistId ?? null,
        },
      });

      const missing = input.rounds.map((round) => ({
        id: randomUUID(),
        matchId,
        roundNumber: round.roundNumber,
        songId: round.songId,
      }));
      if (missing.length) {
        await tx.matchRound.createMany({ data: missing, skipDuplicates: true });
      }

      const storedRounds = await tx.matchRound.findMany({
        where: { matchId },
        select: { id: true, roundNumber: true },
      });
      const roundIdByNumber = new Map(storedRounds.map((round) => [round.roundNumber, round.id]));

      await tx.matchPlayer.createMany({
        data: players.map((player) => ({
          id: matchPlayerIdByUser.get(player.userId)!,
          matchId,
          profileId: player.userId,
          score: player.score,
          rank: player.rank,
          isWinner: player.isWinner,
          correctCount: player.correctCount,
          xpEarned: player.xpEarned,
          soloMedal: map.soloMedal(player.soloMedal),
        })),
      });

      const answerRows: Prisma.RoundAnswerCreateManyInput[] = [];
      for (const round of input.rounds) {
        const roundId = roundIdByNumber.get(round.roundNumber);
        if (!roundId) continue;
        for (const answer of round.answers) {
          const matchPlayerId = matchPlayerIdByUser.get(answer.userId);
          if (!matchPlayerId) continue;
          answerRows.push({
            id: randomUUID(),
            roundId,
            matchPlayerId,
            answer: answer.answer,
            isCorrect: answer.isCorrect,
            answerType: map.answerType(answer.answerType),
            timeMs: answer.timeMs,
            pointsAwarded: answer.pointsAwarded,
          });
        }
      }
      if (answerRows.length) await tx.roundAnswer.createMany({ data: answerRows });
    });
  } catch (error) {
    logger.error('[MatchRepository] Failed to close activity match', 'Scoring', error);
    return 'failed';
  }

  return 'closed';
}
