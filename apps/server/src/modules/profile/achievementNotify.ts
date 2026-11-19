import {
  EVOLVING_STEP_POINTS,
  linkedProviderCount,
  modesPlayedFrom,
  STANDARD_MATCH_MODES,
  type AchievementProgress,
} from '@aniquizz/shared';
import { prisma } from '@aniquizz/database';
import { io } from '../../core/Server';
import { logger } from '../../utils/logger';
import { userRoom } from '../friends/friendsPresence';
import { queryFinishedMatchCareer } from './profileMatchCareer';
import { syncProfileAchievements } from './profileAchievements';

const finishedMode = (userId: string, mode: 'STANDARD' | 'TIME_ATTACK' | 'EVOLVING') =>
  prisma.match.count({
    where: { status: 'FINISHED', mode, players: { some: { profileId: userId } } },
  });

async function multiWins(userId: string): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ wins: number }>>`
    SELECT COUNT(*)::int AS wins
    FROM "MatchPlayer" mp
    INNER JOIN "Match" m ON m.id = mp."matchId"
    WHERE mp."profileId" = ${userId}
      AND mp."isWinner" = true
      AND m.status = 'FINISHED'
      AND (
        SELECT COUNT(*)::int FROM "MatchPlayer" other WHERE other."matchId" = m.id
      ) > 1
  `;
  return rows[0]?.wins ?? 0;
}

/** Counters behind the success catalogue. Used when a match or a profile action just landed. */
export async function loadAchievementProgress(userId: string): Promise<{
  progress: AchievementProgress;
  xp: number;
  level: number;
} | null> {
  const [
    profile,
    songsHeard,
    songsFound,
    dailyStats,
    medals,
    platinums,
    friends,
    likes,
    standardMatches,
    chronoMatches,
    evolvingMatches,
    evolvingSnaps,
    wins,
    catalogueSize,
    career,
  ] = await Promise.all([
    prisma.profile.findUnique({
      where: { id: userId },
      select: {
        xp: true,
        level: true,
        avatar: true,
        anilistUsername: true,
        malUsername: true,
        gamesPlayed: true,
        gamesWon: true,
        correctGuesses: true,
        maxStreak: true,
      },
    }),
    prisma.songHistory.count({
      where: { profileId: userId, song: { downloadStatus: 'COMPLETED' } },
    }),
    prisma.songHistory.count({
      where: {
        profileId: userId,
        correctCount: { gt: 0 },
        song: { downloadStatus: 'COMPLETED' },
      },
    }),
    prisma.dailyPlayerStats.findUnique({
      where: { profileId: userId },
      select: { completions: true, longestStreak: true, perfectDays: true },
    }),
    prisma.matchPlayer.count({ where: { profileId: userId, soloMedal: { not: null } } }),
    prisma.matchPlayer.count({ where: { profileId: userId, soloMedal: 'PLATINUM' } }),
    prisma.friendship.count({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
    }),
    prisma.songLike.count({ where: { profileId: userId } }),
    prisma.match.count({
      where: {
        status: 'FINISHED',
        mode: { in: [...STANDARD_MATCH_MODES] },
        players: { some: { profileId: userId } },
      },
    }),
    finishedMode(userId, 'TIME_ATTACK'),
    finishedMode(userId, 'EVOLVING'),
    prisma.roundAnswer.count({
      where: {
        isCorrect: true,
        pointsAwarded: EVOLVING_STEP_POINTS[0],
        matchPlayer: { profileId: userId, match: { mode: 'EVOLVING', status: 'FINISHED' } },
      },
    }),
    multiWins(userId),
    prisma.song.count({ where: { downloadStatus: 'COMPLETED' } }),
    queryFinishedMatchCareer(userId),
  ]);
  if (!profile) return null;

  const progress: AchievementProgress = {
    gamesPlayed: profile.gamesPlayed,
    gamesWon: profile.gamesWon,
    correctGuesses: profile.correctGuesses,
    maxStreak: profile.maxStreak,
    dailyCompletions: dailyStats?.completions ?? 0,
    dailyLongestStreak: dailyStats?.longestStreak ?? 0,
    dailyPerfectDays: dailyStats?.perfectDays ?? 0,
    songsHeard,
    songsFound,
    medals,
    platinums,
    friends,
    likes,
    standardMatches,
    chronoMatches,
    evolvingMatches,
    evolvingSnaps,
    multiMatches: career.multiCount,
    multiWins: wins,
    modesPlayed: 0,
    customAvatar: profile.avatar.includes('/avatar.jpg') ? 1 : 0,
    linkedList: linkedProviderCount(profile.anilistUsername, profile.malUsername),
    catalogueSize,
  };
  progress.modesPlayed = modesPlayedFrom(progress);
  return { progress, xp: profile.xp, level: profile.level };
}

/**
 * Grant anything the counters now meet and tell the player's open sockets.
 * The end screen and the lobby both hear this. Failures stay off the game path.
 */
export async function notifyProfileAchievements(userId: string): Promise<void> {
  try {
    const loaded = await loadAchievementProgress(userId);
    if (!loaded) return;
    const result = await syncProfileAchievements(userId, loaded.progress, loaded.xp, loaded.level);
    const xpGained = result.xp - loaded.xp;
    if (result.newlyUnlocked.length === 0 && xpGained <= 0) return;
    io.to(userRoom(userId)).emit('achievements:unlocked', {
      ids: result.newlyUnlocked,
      xpGained: Math.max(0, xpGained),
      xp: result.xp,
      level: result.level,
    });
  } catch (error) {
    logger.error('Achievement sync failed', 'Profile', error);
  }
}
