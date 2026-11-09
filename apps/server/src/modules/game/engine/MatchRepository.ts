import { randomUUID } from 'crypto';
import {
  AnswerType as PrismaAnswerType,
  Prisma,
  StoredPrecision,
  StoredResponseType,
  StoredSoloMedal,
} from '@prisma/client';
import { prisma, isBotId } from '@aniquizz/database';
import type { AnswerType, Precision } from '@aniquizz/shared';
import type { MedalTier } from '@aniquizz/shared';
import { logger } from '../../../utils/logger';
import { recordHeardSongs } from '../../catalogue/songHistoryService';
import {
  abandonActivityMatch,
  finishOpenedActivityMatch,
  openActivityMatch,
  recordPlayedRound,
  type ActivityMappers,
  type ActivityOpenInput,
} from './matchActivityStore';
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
  /** Versus lanes hear different clips; overrides the match-wide `songIds` for this player. */
  heardSongIds?: number[];
}

/** Prior XP state read before a match's XP is computed. */
export interface XpState {
  xp: number;
  currentWinStreak: number;
}

export interface PersistMatchInput {
  speedBonusEnabled: boolean;
  timeAttack?: boolean;
  totalRounds: number;
  startedAt: Date;
  endedAt: Date;
  responseType: 'typing' | 'qcm' | 'mix';
  precision: Precision;
  players: PersistPlayerInput[];
  rounds: RecordedRound[];
  /** Catalogue ids whose clip started (song history). Not leftover playlist rows. */
  songIds: number[];
  playlistId?: string | null;
  decadePlaylistId?: string | null;
  /**
   * Set when the match row was opened at the first title. Finish updates that
   * row instead of inserting a second one (which would double-count the tops).
   */
  activityMatchId?: string | null;
}

const toPrismaGameMode = (input: { speedBonusEnabled: boolean; timeAttack?: boolean }) => {
  if (input.timeAttack) return 'TIME_ATTACK' as const;
  return input.speedBonusEnabled ? 'SPRINT' : 'STANDARD';
};

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

const toStoredPrecision = (precision: Precision): StoredPrecision => {
  switch (precision) {
    case 'anime':
      return StoredPrecision.ANIME;
    case 'artist':
      return StoredPrecision.ARTIST;
    default:
      return StoredPrecision.FRANCHISE;
  }
};

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

const activityMappers: ActivityMappers = {
  responseType: toStoredResponseType,
  precision: toStoredPrecision,
  soloMedal: toStoredSoloMedal,
  answerType: toPrismaAnswerType,
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

  /** Creates the row the tops read from, before any title starts. */
  openActivityMatch(input: ActivityOpenInput): Promise<string | null> {
    return openActivityMatch(input, activityMappers);
  }

  /** Inserts the title that just started. Unique per match and round index. */
  recordPlayedRound(matchId: string, roundNumber: number, songId: number): Promise<void> {
    return recordPlayedRound(matchId, roundNumber, songId);
  }

  /** Marks a quit. Rounds already stored stay, so the tops keep them. */
  abandonActivityMatch(matchId: string): Promise<void> {
    return abandonActivityMatch(matchId);
  }

  async persistMatch(input: PersistMatchInput): Promise<void> {
    const humanPlayers = input.players.filter((p) => !isBotId(p.userId));
    if (!humanPlayers.length) {
      if (input.activityMatchId) await this.abandonActivityMatch(input.activityMatchId);
      logger.warn(
        '[MatchRepository] No human players to persist; skipping match persistence.',
        'Scoring',
      );
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
      if (input.activityMatchId) await this.abandonActivityMatch(input.activityMatchId);
      logger.warn(
        '[MatchRepository] No persistable players; skipping match persistence.',
        'Scoring',
      );
      return;
    }

    if (input.activityMatchId) {
      const closed = await finishOpenedActivityMatch(
        input.activityMatchId,
        input,
        players,
        activityMappers,
      );
      if (closed === 'closed') {
        await this.updateAggregates(players, input.songIds, profileById);
        logger.info(
          `[MatchRepository] Match ${input.activityMatchId} persisted (${players.length} players).`,
          'Scoring',
        );
      }
      // `failed` must not insert a second match: the rounds are already stored.
      if (closed !== 'missing') return;
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
            mode: toPrismaGameMode(input),
            status: 'FINISHED',
            totalRounds: input.totalRounds,
            startedAt: input.startedAt,
            endedAt: input.endedAt,
            responseType: toStoredResponseType(input.responseType),
            precision: toStoredPrecision(input.precision),
            playlistId: input.playlistId ?? undefined,
            decadePlaylistId: input.decadePlaylistId ?? undefined,
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
    logger.info(
      `[MatchRepository] Match ${matchId} persisted (${players.length} players).`,
      'Scoring',
    );
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
      await recordHeardSongs(
        prisma,
        player.userId,
        (player.heardSongIds ?? songIds).map((songId) => ({
          songId,
          correct: correctSet.has(songId),
        })),
      );
    } catch (error) {
      logger.error(
        `[MatchRepository] Aggregate stats failed for ${player.userId}`,
        'Scoring',
        error,
      );
    }
  }
}
