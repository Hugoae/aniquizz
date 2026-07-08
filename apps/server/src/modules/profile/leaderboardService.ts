import { prisma } from '@aniquizz/database';

const BOT_PREFIX = 'bot-';
const LEADERBOARD_SIZE = 50;

const notBot = { NOT: { id: { startsWith: BOT_PREFIX } } } as const;

export interface LevelLeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
}

export interface CompetitiveLeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  avatar: string;
  gamesWon: number;
  gamesPlayed: number;
  winRate: number;
}

export async function getLevelLeaderboard(): Promise<LevelLeaderboardEntry[]> {
  const rows = await prisma.profile.findMany({
    where: { ...notBot, xp: { gt: 0 } },
    orderBy: [{ xp: 'desc' }, { level: 'desc' }, { username: 'asc' }],
    take: LEADERBOARD_SIZE,
    select: { id: true, username: true, avatar: true, level: true, xp: true },
  });

  return rows.map((row, index) => ({
    rank: index + 1,
    id: row.id,
    username: row.username,
    avatar: row.avatar,
    level: row.level,
    xp: row.xp,
  }));
}

export async function getCompetitiveLeaderboard(): Promise<CompetitiveLeaderboardEntry[]> {
  const rows = await prisma.profile.findMany({
    where: { ...notBot, gamesPlayed: { gt: 0 } },
    orderBy: [{ gamesWon: 'desc' }, { gamesPlayed: 'desc' }, { username: 'asc' }],
    take: LEADERBOARD_SIZE,
    select: {
      id: true,
      username: true,
      avatar: true,
      gamesWon: true,
      gamesPlayed: true,
    },
  });

  return rows.map((row, index) => ({
    rank: index + 1,
    id: row.id,
    username: row.username,
    avatar: row.avatar,
    gamesWon: row.gamesWon,
    gamesPlayed: row.gamesPlayed,
    winRate: row.gamesPlayed > 0 ? Math.round((row.gamesWon / row.gamesPlayed) * 100) : 0,
  }));
}

export async function getLeaderboardPayload() {
  const [level, competitive] = await Promise.all([getLevelLeaderboard(), getCompetitiveLeaderboard()]);
  return { level, competitive };
}
