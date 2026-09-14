import {
  useCallback,
  useLayoutEffect,
  useRef,
  type MutableRefObject,
  type RefObject,
  type SyntheticEvent,
} from 'react';
import { usePlayerPrefs } from '@/features/settings/context/PlayerPrefsContext';
import {
  applyPlayerAudioToMedia,
  readPlayerAudioFromMedia,
} from '@/features/settings/lib/applyPlayerAudioToMedia';

/**
 * Keeps one HTMLMediaElement in sync with player audio prefs.
 * Native control changes write back so library/profile sliders share the game setting.
 */
export function usePlayerMediaVolume(externalRef?: RefObject<HTMLVideoElement | null>) {
  const { audioVolume, audioMuted, setAudioVolume, setAudioMuted } = usePlayerPrefs();
  const elRef = useRef<HTMLVideoElement | null>(null);
  const applyingRef = useRef(false);
  const readyRef = useRef(false);
  const prefsRef = useRef({ audioVolume, audioMuted, setAudioVolume, setAudioMuted });
  prefsRef.current = { audioVolume, audioMuted, setAudioVolume, setAudioMuted };

  const apply = useCallback((el: HTMLVideoElement) => {
    const { audioVolume: volume, audioMuted: muted } = prefsRef.current;
    applyingRef.current = true;
    applyPlayerAudioToMedia(el, volume, muted);
    readyRef.current = true;
    queueMicrotask(() => {
      applyingRef.current = false;
    });
  }, []);

  useLayoutEffect(() => {
    if (elRef.current) apply(elRef.current);
  }, [audioVolume, audioMuted, apply]);

  const ref = useCallback(
    (node: HTMLVideoElement | null) => {
      elRef.current = node;
      if (externalRef) {
        (externalRef as MutableRefObject<HTMLVideoElement | null>).current = node;
      }
      if (!node) {
        readyRef.current = false;
        return;
      }
      apply(node);
    },
    [apply, externalRef],
  );

  const onLoadedMetadata = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
      apply(event.currentTarget);
    },
    [apply],
  );

  const onVolumeChange = useCallback((event: SyntheticEvent<HTMLVideoElement>) => {
    if (applyingRef.current || !readyRef.current) return;
    const next = readPlayerAudioFromMedia(event.currentTarget);
    const current = prefsRef.current;
    if (next.audioMuted !== current.audioMuted) current.setAudioMuted(next.audioMuted);
    if (next.audioVolume !== current.audioVolume) current.setAudioVolume(next.audioVolume);
  }, []);

  return { ref, onLoadedMetadata, onVolumeChange };
}
