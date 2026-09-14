import {
  DAILY_GUESS_MS,
  DAILY_GUESS_WALL_MS,
  DAILY_REVEAL_MS,
  DAILY_ROUND_COUNT,
  DAILY_RULES_VERSION,
  clampDailyResponseMs,
  dailyCalendarDate,
  dailyPlayTracks,
  dailyResetsAt,
  dailyRoundTimeMs,
  dailyTrackStates,
  dailyXp,
  isDailyQcmCorrect,
  offeredDailyChoice,
  summarizeDailyRounds,
  type DailyAttemptState,
  type DailyLeaderboardEntry,
  type DailyLeaderboardResponse,
  type DailyPlayerStatusKind,
  type DailyResultDto,
  type DailyRevealDto,
  type DailyRoundSnapshot,
  type DailySafeRoundDto,
  type DailyStreakDto,
  type DailyTodayResponse,
  type DailyTrackState,
  type RevealSong,
} from '@aniquizz/shared';
import { toPlaybackUrl } from '../../lib/mediaPlaybackUrl';
import { parseDailySnapshot } from './dailySnapshot';

export interface DailyRoundRow {
  id: string;
  position: number;
  voided: boolean;
  snapshot: unknown;
  choices: string[];
  videoStartTime: number;
  /** Catalogue FK; may be null if the song was detached. Snapshot still has `id`. */
  songId?: number | null;
}

export interface DailyAnswerRow {
  roundId: string;
  selectedLabel: string | null;
  isCorrect: boolean;
  responseMs: number;
}

export const snapshotOf = (round: DailyRoundRow): DailyRoundSnapshot =>
  parseDailySnapshot(round.snapshot);

export const catalogueSongId = (round: DailyRoundRow): number | null => {
  if (round.songId != null && round.songId > 0) return round.songId;
  try {
    const id = snapshotOf(round).id;
    return id > 0 ? id : null;
  } catch {
    return null;
  }
};

export const toRevealSong = (snapshot: DailyRoundSnapshot): RevealSong => ({
  id: snapshot.id,
  anime: snapshot.anime,
  title: snapshot.title,
  artist: snapshot.artist,
  type: snapshot.typeLabel,
  difficulty: snapshot.difficulty,
  cover: snapshot.cover,
  franchise: snapshot.franchise,
  year: snapshot.year,
  season: snapshot.season,
  format: snapshot.format,
  episodeRange: snapshot.episodeRange,
  coverColor: snapshot.coverColor,
  siteUrl: snapshot.siteUrl,
  tags: snapshot.tags,
  animeId: snapshot.animeId,
  videoKey: toPlaybackUrl(snapshot.videoKey),
  videoStartTime: 0,
});

export const activeDifficulties = (rounds: DailyRoundRow[]): string[] =>
  rounds.filter((round) => !round.voided).map((round) => snapshotOf(round).difficulty);

export const computeAttemptTotals = (rounds: DailyRoundRow[], answers: DailyAnswerRow[]) => {
  const byRound = new Map(answers.map((answer) => [answer.roundId, answer]));
  const scored = rounds.map((round) => {
    const answer = byRound.get(round.id);
    return {
      voided: round.voided,
      correct: round.voided ? null : (answer?.isCorrect ?? false),
      answered: Boolean(answer),
      responseMs: answer?.responseMs ?? null,
    };
  });
  const summary = summarizeDailyRounds(scored);
  const totalResponseMs = rounds.reduce((sum, round) => {
    if (round.voided) return sum;
    const answer = byRound.get(round.id);
    return (
      sum +
      dailyRoundTimeMs({
        answered: Boolean(answer),
        responseMs: answer?.responseMs ?? null,
        guessMs: DAILY_GUESS_MS,
      })
    );
  }, 0);
  return {
    ...summary,
    totalResponseMs,
  };
};

export const toResultDto = (input: {
  rounds: DailyRoundRow[];
  answers: DailyAnswerRow[];
  xpAwarded: number;
  completedAt: Date;
  streak: number;
}): DailyResultDto => {
  const totals = computeAttemptTotals(input.rounds, input.answers);
  const tracks = dailyTrackStates(
    input.rounds.map((round) => {
      const answer = input.answers.find((row) => row.roundId === round.id);
      return {
        position: round.position,
        voided: round.voided,
        correct: answer?.isCorrect ?? false,
      };
    }),
  );
  const recap = [...input.rounds]
    .sort((a, b) => a.position - b.position)
    .map((round) => {
      const snapshot = snapshotOf(round);
      const answer = input.answers.find((row) => row.roundId === round.id);
      return {
        position: round.position,
        songId: snapshot.id,
        anime: snapshot.anime,
        title: snapshot.title,
        artist: snapshot.artist,
        typeLabel: snapshot.typeLabel,
        isCorrect: round.voided ? null : (answer?.isCorrect ?? false),
        voided: round.voided,
        selectedLabel: round.voided ? null : (answer?.selectedLabel ?? null),
      };
    });
  return {
    correctCount: totals.correctCount,
    activeRoundCount: totals.activeRoundCount,
    totalResponseMs: totals.totalResponseMs,
    xpAwarded: input.xpAwarded,
    completedAt: input.completedAt.toISOString(),
    tracks,
    difficulties: activeDifficulties(input.rounds),
    streak: input.streak,
    recap,
  };
};

export const toSafeRound = (input: {
  attemptId: string;
  round: DailyRoundRow;
  total: number;
  roundStartedAt: Date;
  revealUntil: Date | null;
  phase: 'guessing' | 'reveal';
  reveal: DailyRevealDto | null;
}): DailySafeRoundDto => {
  const snapshot = snapshotOf(input.round);
  return {
    attemptId: input.attemptId,
    roundId: input.round.id,
    position: input.round.position,
    total: input.total,
    videoKey: toPlaybackUrl(snapshot.videoKey),
    videoStartTime: snapshot.videoStartTime,
    choices: snapshot.choices,
    roundStartedAt: input.roundStartedAt.toISOString(),
    roundEndsAt: new Date(input.roundStartedAt.getTime() + DAILY_GUESS_WALL_MS).toISOString(),
    revealEndsAt: input.revealUntil?.toISOString() ?? null,
    phase: input.phase,
    reveal: input.reveal,
  };
};

export const tracksForAttempt = (
  rounds: DailyRoundRow[],
  answers: DailyAnswerRow[],
): DailyTrackState[] =>
  dailyTrackStates(
    rounds.map((round) => {
      const answer = answers.find((item) => item.roundId === round.id);
      return { position: round.position, voided: round.voided, correct: answer?.isCorrect ?? null };
    }),
  );

export const toRevealDto = (input: {
  round: DailyRoundRow;
  answer: DailyAnswerRow | undefined;
  rounds: DailyRoundRow[];
  answers: DailyAnswerRow[];
  revealUntil: Date;
  finished: boolean;
}): DailyRevealDto => {
  const snapshot = snapshotOf(input.round);
  return {
    position: input.round.position,
    selectedLabel: input.answer?.selectedLabel ?? null,
    isCorrect: input.answer?.isCorrect ?? false,
    responseMs: input.answer?.responseMs ?? DAILY_GUESS_MS,
    correctLabel: snapshot.anime,
    song: toRevealSong(snapshot),
    tracks: tracksForAttempt(input.rounds, input.answers),
    revealEndsAt: input.revealUntil.toISOString(),
    finished: input.finished,
  };
};

export const publicToday = (input: {
  challengeId: string | null;
  challengeDate: string;
  challengeNumber: number | null;
  now: Date;
  available: boolean;
}): DailyTodayResponse => ({
  challengeId: input.challengeId,
  challengeDate: input.challengeDate,
  challengeNumber: input.challengeNumber,
  resetsAt: dailyResetsAt(input.now).toISOString(),
  rulesVersion: DAILY_RULES_VERSION,
  roundCount: DAILY_ROUND_COUNT,
  guessSeconds: DAILY_GUESS_MS / 1000,
  revealSeconds: DAILY_REVEAL_MS / 1000,
  available: input.available,
  status: 'guest',
  streak: null,
  result: null,
  openAttemptId: null,
});

export const statusFromAttempt = (
  state: DailyAttemptState | null,
  available: boolean,
): DailyPlayerStatusKind => {
  if (!available) return 'unavailable';
  if (!state) return 'available';
  if (state === 'in_progress') return 'in_progress';
  return 'completed';
};

export {
  dailyCalendarDate,
  clampDailyResponseMs,
  offeredDailyChoice,
  isDailyQcmCorrect,
  dailyXp,
  dailyPlayTracks,
};
export type { DailyStreakDto, DailyLeaderboardEntry, DailyLeaderboardResponse, DailyTrackState };
