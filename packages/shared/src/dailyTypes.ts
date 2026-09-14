import type { RevealSong } from './game';

export type DailyChallengeLifecycle = 'draft' | 'ready' | 'cancelled';
/** `expired` is leftover from the abandoned 15-minute budget; new runs complete or forfeit. */
export type DailyAttemptState = 'in_progress' | 'completed' | 'forfeited' | 'expired';
export type DailyPlayerStatusKind =
  | 'guest'
  | 'available'
  | 'in_progress'
  | 'completed'
  | 'unavailable';
export type DailyTrackState = 'empty' | 'pending' | 'correct' | 'wrong' | 'voided';

export interface DailyRoundSnapshot {
  id: number;
  anime: string;
  franchise: string | null;
  validAnswers: string[];
  title: string;
  artist: string;
  typeLabel: string;
  difficulty: string;
  videoKey: string;
  videoStartTime: number;
  guessDuration: number;
  cover: string | null;
  animeId: number;
  year: number | null;
  season: string | null;
  format: string | null;
  episodeRange: string | null;
  coverColor: string | null;
  siteUrl: string;
  tags: string[];
  choices: string[];
  songType: 'OP' | 'ED';
  franchiseId: number | null;
  popularity: number;
}

export interface DailyTodayPublic {
  challengeId: string | null;
  challengeDate: string;
  challengeNumber: number | null;
  resetsAt: string;
  rulesVersion: number;
  roundCount: number;
  guessSeconds: number;
  revealSeconds: number;
  available: boolean;
}

export interface DailyStreakDto {
  current: number;
  longest: number;
  completions: number;
  perfectDays: number;
}

export interface DailyRoundRecapDto {
  position: number;
  /** Catalogue song id for likes; null if the row was detached from the catalogue. */
  songId: number | null;
  anime: string;
  title: string;
  artist: string;
  typeLabel: string;
  isCorrect: boolean | null;
  voided: boolean;
  /** Locked QCM label; null when unanswered or voided. */
  selectedLabel: string | null;
}

export interface DailyResultDto {
  correctCount: number;
  activeRoundCount: number;
  totalResponseMs: number;
  xpAwarded: number;
  completedAt: string;
  tracks: DailyTrackState[];
  difficulties: string[];
  streak: number;
  recap: DailyRoundRecapDto[];
}

export interface DailyRevealDto {
  position: number;
  selectedLabel: string | null;
  isCorrect: boolean;
  responseMs: number;
  correctLabel: string;
  song: RevealSong;
  tracks: DailyTrackState[];
  revealEndsAt: string;
  finished: boolean;
  result?: DailyResultDto;
  /** Next playable clip only — no title/anime/choices. Used to warm the buffer. */
  nextVideo: string | null;
  nextVideoStartTime: number | null;
}

export interface DailySafeRoundDto {
  attemptId: string;
  roundId: string;
  position: number;
  total: number;
  videoKey: string;
  videoStartTime: number;
  choices: string[];
  roundStartedAt: string;
  roundEndsAt: string;
  revealEndsAt: string | null;
  phase: 'guessing' | 'reveal';
  reveal: DailyRevealDto | null;
}

export interface DailyTodayResponse extends DailyTodayPublic {
  status: DailyPlayerStatusKind;
  streak: DailyStreakDto | null;
  result: DailyResultDto | null;
  /** Set while `in_progress` so `/daily` can forfeit. Never a playable round. */
  openAttemptId: string | null;
}

export interface DailyLeaderboardEntry {
  rank: number;
  profileId: string;
  username: string;
  avatar: string;
  correctCount: number;
  totalResponseMs: number;
  completedAt: string;
}

export interface DailyLeaderboardResponse {
  challengeDate: string;
  participantCount: number;
  entries: DailyLeaderboardEntry[];
}

export interface DailyRankInput {
  id: string;
  correctCount: number;
  totalResponseMs: number;
  completedAtMs: number;
}
