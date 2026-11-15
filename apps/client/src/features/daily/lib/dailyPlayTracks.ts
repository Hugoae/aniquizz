import {
  DAILY_GUESS_MS,
  dailyPlayTracks,
  type DailySafeRoundDto,
  type DailyTrackState,
} from '@aniquizz/shared';

export function endsAtMs(iso: string): number {
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : Date.now() + DAILY_GUESS_MS;
}

/**
 * Deadline on this device. `serverNow` cancels a clock that is ahead of the
 * server, which otherwise paints 0 for the whole 15 s round.
 */
export function localPhaseEndsAt(
  iso: string,
  serverNow: number | undefined,
  now = Date.now(),
): number {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return endsAtMs(iso);
  if (serverNow == null || !Number.isFinite(serverNow)) return parsed;
  return now + (parsed - serverNow);
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
