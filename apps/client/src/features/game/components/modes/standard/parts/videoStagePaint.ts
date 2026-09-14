import type { CurrentSong } from '@/features/game/state/gameReducer';
import type { GamePhase } from './types';

/**
 * Key that changes when the player loads a new guessing clip.
 * Reveal re-signs `videoKey` (new Worker token) without reloading `<video>` —
 * returning null keeps paint/ready flags so the clip can fade in.
 */
export function guessingClipPaintKey(phase: GamePhase, song: CurrentSong): string | null {
  if (phase !== 'guessing' || !song) return null;
  if ('id' in song) return null;
  return `${song.videoKey}:${song.videoStartTime || 0}`;
}
