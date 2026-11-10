import {
  evolvingCanAdvance,
  evolvingCue,
  evolvingPointsForStep,
  isEvolvingSettings,
  type EvolvingRoundCue,
} from '@aniquizz/shared';
import type { MatchEngineHost } from './matchEngineHost';
import type { PlaylistItem } from './types';

export function isEvolvingHost(host: MatchEngineHost): boolean {
  return isEvolvingSettings(host.room.settings);
}

export function evolvingRoundCue(host: MatchEngineHost, item: PlaylistItem): EvolvingRoundCue {
  return evolvingCue(host.evolvingStep, item.clipDurationSeconds, item.videoStartTime);
}

/** Passer, or a wrong answer: a longer excerpt of the same title, or the reveal if it cannot grow. */
export function advanceEvolvingStep(host: MatchEngineHost): void {
  if (
    !isEvolvingHost(host) ||
    host.phase !== 'guessing' ||
    host.isRoundEnded ||
    host.isRoundLoading
  ) {
    return;
  }
  const item = host.playlist[host.currentRoundIndex];
  if (!item) return;

  const cue = evolvingRoundCue(host, item);
  if (!evolvingCanAdvance(cue)) {
    for (const player of host.room.players.values()) {
      player.hasAnswered = true;
      player.isCorrect = false;
      player.roundPoints = 0;
    }
    host.endRound('reveal');
    return;
  }

  host.evolvingStep += 1;
  for (const player of host.room.players.values()) host.resetRoundState(player);
  host.channel.emit('round_start', host.buildRoundStartPayload(item));
}

/** Drop the title without walking the remaining steps. */
export function abandonEvolvingRound(host: MatchEngineHost): void {
  if (
    !isEvolvingHost(host) ||
    host.phase !== 'guessing' ||
    host.isRoundEnded ||
    host.isRoundLoading
  ) {
    return;
  }
  for (const player of host.room.players.values()) {
    player.hasAnswered = true;
    player.isCorrect = false;
    player.roundPoints = 0;
    player.currentAnswer = '';
  }
  host.endRound('reveal');
}

export function evolvingPoints(host: MatchEngineHost): number {
  return evolvingPointsForStep(host.evolvingStep);
}
