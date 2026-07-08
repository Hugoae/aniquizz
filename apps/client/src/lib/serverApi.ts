import { env } from './env';

const IS_PROD = import.meta.env.MODE === 'production';

export const API_BASE = IS_PROD
  ? env.VITE_SERVER_URL || 'https://aniquizz-server.onrender.com'
  : 'http://localhost:3001';

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

export interface LeaderboardResponse {
  level: LevelLeaderboardEntry[];
  competitive: CompetitiveLeaderboardEntry[];
}

export async function fetchLeaderboard(): Promise<LeaderboardResponse> {
  const res = await fetch(`${API_BASE}/leaderboard`);
  if (!res.ok) {
    throw new Error('Impossible de charger le classement.');
  }
  return res.json() as Promise<LeaderboardResponse>;
}
