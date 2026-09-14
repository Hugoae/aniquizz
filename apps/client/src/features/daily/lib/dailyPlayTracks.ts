import { DAILY_GUESS_MS, dailyPlayTracks, type DailySafeRoundDto, type DailyTrackState } from '@aniquizz/shared';

export function endsAtMs(iso: string): number {
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : Date.now() + DAILY_GUESS_MS;
}

export function tracksFromPrior(
  previous: DailyTrackState[],
  next: DailySafeRoundDto,
): DailyTrackState[] {
  if (next.reveal?.tracks?.length) return next.reveal.tracks;
  return dailyPlayTracks({
    total: next.total,
    currentPosition: next.position,
    answers: previous.map((track, index) => ({
      position: index + 1,
      correct: track === 'correct' ? true : track === 'wrong' ? false : null,
      voided: track === 'voided',
    })),
  });
}
