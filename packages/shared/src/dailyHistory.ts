export interface DailyHeardRoundInput {
  id: string;
  position: number;
  voided: boolean;
  songId: number | null;
}

export interface DailyHeardAnswerInput {
  roundId: string;
  isCorrect: boolean;
}

export interface DailyHeardSong {
  songId: number;
  correct: boolean;
}

/**
 * Song-history rows for a daily run: songs whose clip actually started
 * (`position <= currentRound`), not forfeited leftovers and not voided rows.
 * Replaying the same catalogue id in one day still yields one update (correct if any hit).
 */
export function dailyHeardSongs(input: {
  currentRound: number;
  rounds: DailyHeardRoundInput[];
  answers: DailyHeardAnswerInput[];
}): DailyHeardSong[] {
  const byRound = new Map(input.answers.map((answer) => [answer.roundId, answer]));
  const bySong = new Map<number, boolean>();
  for (const round of input.rounds) {
    if (round.voided || round.songId == null || round.songId <= 0) continue;
    if (round.position > input.currentRound) continue;
    const correct = byRound.get(round.id)?.isCorrect === true;
    bySong.set(round.songId, bySong.get(round.songId) === true || correct);
  }
  return [...bySong.entries()].map(([songId, correct]) => ({ songId, correct }));
}
