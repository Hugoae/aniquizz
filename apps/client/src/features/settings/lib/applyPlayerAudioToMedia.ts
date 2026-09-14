import { clampAudioVolume } from '@aniquizz/shared';

/** Apply player prefs to any media element (game, library, profile, admin). */
export function applyPlayerAudioToMedia(
  el: HTMLMediaElement,
  volumePercent: number,
  muted: boolean,
): void {
  const nextVolume = clampAudioVolume(volumePercent) / 100;
  if (Math.abs(el.volume - nextVolume) > 0.001) el.volume = nextVolume;
  if (el.muted !== muted) el.muted = muted;
}

/** Read a media element back into prefs-shaped values. */
export function readPlayerAudioFromMedia(el: HTMLMediaElement): {
  audioVolume: number;
  audioMuted: boolean;
} {
  return {
    audioVolume: clampAudioVolume(el.volume * 100),
    audioMuted: el.muted,
  };
}
