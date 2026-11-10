/**
 * Apply a daily write to the in-memory attempt the handler already loaded.
 * The response is built from this object, so the play path does not re-join
 * the challenge after every answer.
 */

export interface DailyMemoryAnswer {
  id: string;
  attemptId: string;
  roundId: string;
  selectedLabel: string | null;
  isCorrect: boolean;
  responseMs: number;
  answeredAt: Date;
}

export function noteDailyAnswer(
  attempt: { id: string; answers: DailyMemoryAnswer[] },
  row: {
    id?: string;
    roundId: string;
    selectedLabel: string | null;
    isCorrect: boolean;
    responseMs: number;
    answeredAt: Date;
  },
): void {
  if (attempt.answers.some((item) => item.roundId === row.roundId)) return;
  attempt.answers.push({
    id: row.id ?? `mem-${row.roundId}`,
    attemptId: attempt.id,
    roundId: row.roundId,
    selectedLabel: row.selectedLabel,
    isCorrect: row.isCorrect,
    responseMs: row.responseMs,
    answeredAt: row.answeredAt,
  });
}

export function noteDailyClock(
  attempt: {
    currentRound: number;
    currentRoundStartedAt: Date | null;
    revealUntil: Date | null;
  },
  patch: {
    currentRound?: number;
    currentRoundStartedAt?: Date | null;
    revealUntil?: Date | null;
  },
): void {
  if (patch.currentRound != null) attempt.currentRound = patch.currentRound;
  if (patch.currentRoundStartedAt !== undefined) {
    attempt.currentRoundStartedAt = patch.currentRoundStartedAt;
  }
  if (patch.revealUntil !== undefined) attempt.revealUntil = patch.revealUntil;
}
