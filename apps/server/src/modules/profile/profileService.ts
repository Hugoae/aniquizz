import { prisma, isBotId } from '@aniquizz/database';
import type { PublicProfile, PresenceStatus, FriendSummary } from '@aniquizz/shared';
import {
  canViewAudience,
  mergeProfileHistory,
  normalizeAccountPrivacy,
  PROFILE_HISTORY_TAKE,
  summarizeDailyCareerFromAggregates,
  toDailyHistoryEntry,
  type PrivacyViewerKind,
} from '@aniquizz/shared';
import { logger } from '../../utils/logger';
import { friendsService } from '../friends/friendsService';
import { redactPresence, unavailablePublicProfile } from './privacyRedaction';
import { queryFinishedMatchCareer } from './profileMatchCareer';

const PLAYABLE_SONGS_TTL_MS = 10 * 60 * 1000;
let playableSongsCache: { count: number; at: number } | null = null;

/** Global catalogue denominator — cached to avoid a full count on every profile load. */
const countPlayableSongs = async (): Promise<number> => {
  const now = Date.now();
  if (playableSongsCache && now - playableSongsCache.at < PLAYABLE_SONGS_TTL_MS) {
    return playableSongsCache.count;
  }
  const count = await prisma.song.count({ where: { downloadStatus: 'COMPLETED' } });
  playableSongsCache = { count, at: now };
  return count;
};

/** Full stats + identity for a user; shared by the personal and public profile. */
const computeRichStats = async (userId: string, opts?: { includeHistory?: boolean }) => {
  if (isBotId(userId)) throw new Error('Profil introuvable.');
  const includeHistory = opts?.includeHistory !== false;
  try {
    // Single DB round-trip wave: none of these depend on each other, so we
    // issue every profile query at once instead of two sequential batches.
    const [
      totalSongs,
      discoveredSongs,
      profile,
      best,
      historyRows,
      dailyHistoryRows,
      dailyStats,
      dailyCareerAgg,
      scoreAgg,
      timeAgg,
      roundsPlayed,
      finishedCareer,
    ] = await Promise.all([
      countPlayableSongs(),
      prisma.songHistory.count({
        where: { profileId: userId, song: { downloadStatus: 'COMPLETED' } },
      }),
      prisma.profile.findUnique({
        where: { id: userId },
        select: {
          username: true,
          avatar: true,
          role: true,
          lastSeenAt: true,
          createdAt: true,
          xp: true,
          level: true,
          gamesPlayed: true,
          gamesWon: true,
          totalGuesses: true,
          correctGuesses: true,
          maxStreak: true,
        },
      }),
      prisma.matchPlayer.aggregate({
        where: { profileId: userId },
        _max: { score: true },
      }),
      includeHistory
        ? prisma.matchPlayer.findMany({
            where: { profileId: userId, match: { status: 'FINISHED' } },
            select: {
              score: true,
              rank: true,
              isWinner: true,
              correctCount: true,
              xpEarned: true,
              answers: { select: { answerType: true } },
              match: {
                select: {
                  id: true,
                  mode: true,
                  totalRounds: true,
                  startedAt: true,
                  endedAt: true,
                  _count: { select: { players: true } },
                },
              },
            },
            orderBy: { match: { startedAt: 'desc' } },
            take: PROFILE_HISTORY_TAKE,
          })
        : Promise.resolve([]),
      includeHistory
        ? prisma.dailyAttempt.findMany({
            where: { profileId: userId, state: { in: ['COMPLETED', 'FORFEITED', 'EXPIRED'] } },
            select: {
              id: true,
              completedAt: true,
              startedAt: true,
              correctCount: true,
              activeRoundCount: true,
              xpAwarded: true,
              won: true,
              totalResponseMs: true,
              rank: true,
              challenge: { select: { challengeNumber: true } },
            },
            orderBy: { completedAt: 'desc' },
            take: PROFILE_HISTORY_TAKE,
          })
        : Promise.resolve([]),
      prisma.dailyPlayerStats.findUnique({
        where: { profileId: userId },
        select: {
          completions: true,
          wins: true,
          currentStreak: true,
          longestStreak: true,
          perfectDays: true,
        },
      }),
      prisma.dailyAttempt.aggregate({
        where: { profileId: userId, state: { in: ['COMPLETED', 'FORFEITED', 'EXPIRED'] } },
        _count: { _all: true },
        _sum: { correctCount: true, totalResponseMs: true },
        _avg: { rank: true },
        _min: { rank: true, totalResponseMs: true },
      }),
      // Cumulative score/XP + answer time (avg & min) + rounds + multi/solo split + playtime.
      prisma.matchPlayer.aggregate({
        where: { profileId: userId },
        _sum: { score: true, xpEarned: true },
      }),
      prisma.roundAnswer.aggregate({
        where: { matchPlayer: { profileId: userId }, timeMs: { not: null } },
        _avg: { timeMs: true },
        _min: { timeMs: true },
      }),
      prisma.roundAnswer.count({ where: { matchPlayer: { profileId: userId } } }),
      queryFinishedMatchCareer(userId),
    ]);

    const progressPercent = totalSongs > 0 ? Math.round((discoveredSongs / totalSongs) * 100) : 0;

    if (!profile) throw new Error('Profil introuvable');

    // Pre-game answer style, inferred from the answers actually recorded.
    // Only a pure TYPING/QCM match maps to that mode; anything else — including
    // Duo rounds (which only occur inside a Mix game) — is "Mix".
    const resolveAnswerMode = (types: string[]): string | null => {
      const distinct = new Set(types);
      if (distinct.size === 0) return null;
      if (distinct.size === 1 && distinct.has('TYPING')) return 'Typing';
      if (distinct.size === 1 && distinct.has('QCM')) return 'QCM';
      return 'Mix';
    };

    const matchHistory = historyRows.map((row) => {
      const m = row.match;
      const start = m.startedAt;
      const end = m.endedAt;
      return {
        id: m.id,
        playedAt: (end ?? start).toISOString(),
        mode: m.mode as string,
        kind: 'match' as const,
        answerMode: resolveAnswerMode(row.answers.map((a) => a.answerType)),
        totalRounds: m.totalRounds,
        score: row.score,
        rank: row.rank,
        isWinner: row.isWinner,
        correctCount: row.correctCount,
        xpEarned: row.xpEarned,
        playerCount: m._count.players,
        durationMs: end ? end.getTime() - start.getTime() : null,
      };
    });
    const dailyHistory = dailyHistoryRows.map((row) =>
      toDailyHistoryEntry({
        id: row.id,
        playedAt: row.completedAt ?? row.startedAt,
        challengeNumber: row.challenge.challengeNumber,
        correctCount: row.correctCount,
        activeRoundCount: row.activeRoundCount,
        xpAwarded: row.xpAwarded,
        won: row.won,
        totalResponseMs: row.totalResponseMs,
        rank: row.rank,
      }),
    );
    const history = mergeProfileHistory(matchHistory, dailyHistory);
    const dailyCareer = summarizeDailyCareerFromAggregates({
      count: dailyCareerAgg._count._all,
      totalCorrect: dailyCareerAgg._sum.correctCount ?? 0,
      totalMs: dailyCareerAgg._sum.totalResponseMs ?? 0,
      avgRank: dailyCareerAgg._avg.rank == null ? null : Number(dailyCareerAgg._avg.rank),
      bestRank: dailyCareerAgg._min.rank,
      bestTimeMs: dailyCareerAgg._min.totalResponseMs,
    });

    const { multiCount, soloCount, playtimeMs } = finishedCareer;

    const winRate =
      profile.gamesPlayed > 0 ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100) : 0;

    const accuracy =
      profile.totalGuesses > 0
        ? Math.round((profile.correctGuesses / profile.totalGuesses) * 100)
        : 0;

    return {
      username: profile.username,
      avatar: profile.avatar,
      role: profile.role,
      lastSeenAt: profile.lastSeenAt ? profile.lastSeenAt.toISOString() : null,
      totalSongs,
      discoveredSongs,
      progressPercent,
      createdAt: profile.createdAt.toISOString(),
      xp: profile.xp,
      level: profile.level,
      bestScore: best._max.score ?? 0,
      scoreTotal: scoreAgg._sum.score ?? 0,
      avgXpPerGame:
        profile.gamesPlayed > 0
          ? Math.round((scoreAgg._sum.xpEarned ?? 0) / profile.gamesPlayed)
          : 0,
      avgAnswerMs: timeAgg._avg.timeMs ?? null,
      fastestAnswerMs: timeAgg._min.timeMs ?? null,
      roundsPlayed,
      multiCount,
      soloCount,
      playtimeMs,
      history,
      historyRedacted: !includeHistory,
      stats: {
        gamesPlayed: profile.gamesPlayed,
        gamesWon: profile.gamesWon,
        totalGuesses: profile.totalGuesses,
        correctGuesses: profile.correctGuesses,
        maxStreak: profile.maxStreak,
        winRate,
        accuracy,
        dailyCompletions: dailyStats?.completions ?? 0,
        dailyWins: dailyStats?.wins ?? 0,
        dailyStreak: dailyStats?.currentStreak ?? 0,
        dailyLongestStreak: dailyStats?.longestStreak ?? 0,
        dailyPerfectDays: dailyStats?.perfectDays ?? 0,
        dailyTotalCorrect: dailyCareer.dailyTotalCorrect,
        dailyTotalResponseMs: dailyCareer.dailyTotalResponseMs,
        dailyAvgRank: dailyCareer.dailyAvgRank,
        dailyBestRank: dailyCareer.dailyBestRank,
        dailyAvgTimeMs: dailyCareer.dailyAvgTimeMs,
        dailyBestTimeMs: dailyCareer.dailyBestTimeMs,
      },
    };
  } catch (error) {
    logger.error('Erreur calcul stats profil', 'ProfileService', error);
    throw error;
  }
};

/** Personal profile stats (self view via `profile:get_stats`). */
export const getProfileStats = (userId: string) => computeRichStats(userId);

/** Relationship of a viewer to another profile (drives the public-profile UI). */
const resolveRelation = async (
  viewerId: string,
  targetId: string,
): Promise<PublicProfile['relation']> => {
  if (viewerId === targetId) return 'self';
  const fr = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: viewerId, addresseeId: targetId },
        { requesterId: targetId, addresseeId: viewerId },
      ],
    },
    select: { status: true, requesterId: true },
  });
  if (!fr) return 'none';
  if (fr.status === 'ACCEPTED') return 'friends';
  if (fr.status === 'BLOCKED') return fr.requesterId === viewerId ? 'blocked' : 'none';
  return fr.requesterId === viewerId ? 'outgoing' : 'incoming';
};

const viewerKindFromRelation = (relation: PublicProfile['relation']): PrivacyViewerKind => {
  if (relation === 'self') return 'self';
  if (relation === 'friends') return 'friend';
  if (relation === 'blocked') return 'blocked';
  return 'stranger';
};

/** Public profile card + stats for any user, viewed by `viewerId`. */
export const getPublicProfile = async (
  viewerId: string,
  targetId: string,
  presence: {
    status: PresenceStatus;
    roomId?: string | null;
    roomName?: string | null;
    joinable?: boolean;
  },
  friends: FriendSummary[] = [],
): Promise<PublicProfile> => {
  if (isBotId(targetId)) throw new Error('Profil introuvable.');

  if (viewerId !== targetId && (await friendsService.isBlockedEitherWay(viewerId, targetId))) {
    return unavailablePublicProfile(targetId);
  }

  const [privacyRow, relation] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: targetId },
      select: {
        onlineStatusAudience: true,
        matchHistoryAudience: true,
        showFavoriteSongs: true,
        allowFriendRequests: true,
        lobbyInviteAudience: true,
      },
    }),
    resolveRelation(viewerId, targetId),
  ]);

  if (!privacyRow) return unavailablePublicProfile(targetId);

  const privacy = normalizeAccountPrivacy(privacyRow);
  const viewerKind = viewerKindFromRelation(relation);
  const canHistory = canViewAudience(privacy.matchHistoryAudience, viewerKind);
  const canStatus = canViewAudience(privacy.onlineStatusAudience, viewerKind);

  const rich = await computeRichStats(targetId, { includeHistory: canHistory });
  const pr = redactPresence(
    {
      status: presence.status,
      roomId: presence.roomId,
      roomName: presence.roomName,
      joinable: presence.joinable,
    },
    canStatus,
  );

  return {
    ...rich,
    id: targetId,
    status: pr.status,
    lastSeenAt: canStatus ? rich.lastSeenAt : null,
    friends,
    relation,
    history: canHistory ? rich.history : [],
    historyRedacted: !canHistory,
  };
};
