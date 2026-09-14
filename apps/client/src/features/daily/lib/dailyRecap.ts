import {
  type DailyResultDto,
  type RoundHistoryEntry,
} from '@aniquizz/shared';

/** Map the daily recap onto the solo round-history rows. Daily has no points. */
export function dailyRecapToHistory(result: DailyResultDto): RoundHistoryEntry[] {
  return result.recap.map((round) => {
    const answered = !round.voided && round.selectedLabel != null;
    return {
      round: round.position,
      song: {
        id: round.songId && round.songId > 0 ? round.songId : 0,
        anime: round.anime,
        title: round.title,
        artist: round.artist,
        type: round.typeLabel,
        difficulty: result.difficulties[round.position - 1] ?? 'medium',
        videoKey: '',
        videoStartTime: 0,
      },
      isCorrect: round.isCorrect === true,
      points: 0,
      myAnswer: answered ? round.selectedLabel : null,
      answerType: answered ? 'qcm' : null,
    };
  });
}

export function formatDailyClock(ms: number): string {
  return `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
}

/** French recap display — comma decimal, unit rendered separately. */
export function formatDailyClockValue(ms: number): string {
  return (Math.max(0, ms) / 1000).toFixed(1).replace('.', ',');
}
