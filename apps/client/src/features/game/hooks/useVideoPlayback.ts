import { useCallback, useEffect, useRef, useState } from 'react';
import type { CurrentSong, GamePhase, GuessingSong } from '@/features/game/state/gameReducer';
import { getVideoUrl } from '@/lib/video';

interface UseVideoPlaybackArgs {
  /** Current round song (guessing or reveal) — drives the one-shot per-round load. */
  currentSong: CurrentSong;
  /** Match phase — used to reset clip cache when a new game intro starts. */
  phase: GamePhase;
  /** Whether the match is paused (pauses the media element). */
  isGamePaused: boolean;
  /** Initial volume, 0–100. */
  initialVolume?: number;
}

interface UseVideoPlaybackResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  /** Hidden element that warms an upcoming clip's buffer (see `warmVideo`). */
  preloadRef: React.RefObject<HTMLVideoElement>;
  /** Buffer a clip ahead of time so the main player starts it from cache. */
  warmVideo: (videoKey: string | null | undefined, startTime?: number) => void;
  volume: number;
  setVolume: (v: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  /** Autoplay was blocked by the browser — show the "activer le son" affordance. */
  autoplayBlocked: boolean;
  /** Resume the current video without reloading it (after autoplay was blocked). */
  resumeCurrent: () => void;
}

const roundClipKey = (videoKey: string, startTime: number) => `${videoKey}:${startTime}`;

const isGuessingSong = (song: CurrentSong): song is GuessingSong =>
  song !== null && 'videoKey' in song && !('id' in song);

const waitForMediaEvent = (
  el: HTMLVideoElement,
  event: keyof HTMLMediaElementEventMap,
  signal?: AbortSignal,
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const cleanup = () => {
      el.removeEventListener(event, onEvent);
      signal?.removeEventListener('abort', onAbort);
    };

    const onEvent = () => {
      cleanup();
      resolve();
    };

    const onAbort = () => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    el.addEventListener(event, onEvent, { once: true });
    signal?.addEventListener('abort', onAbort, { once: true });
  });

const waitForLoadedMetadata = (el: HTMLVideoElement, signal?: AbortSignal): Promise<void> => {
  if (el.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();
  return waitForMediaEvent(el, 'loadedmetadata', signal);
};

/** Seek and wait until the frame at `startTime` is ready — avoids audible playback at t=0. */
const seekTo = async (el: HTMLVideoElement, startTime: number, signal?: AbortSignal): Promise<void> => {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const maxStart = Number.isFinite(el.duration) && el.duration > 0 ? el.duration - 0.25 : startTime;
  const target = startTime <= 0 ? 0 : Math.min(startTime, Math.max(0, maxStart));

  if (Math.abs(el.currentTime - target) < 0.05) return;

  el.currentTime = target;
  await waitForMediaEvent(el, 'seeked', signal);
};

const loadClipAtOffset = async (
  el: HTMLVideoElement,
  videoKey: string,
  startTime: number,
  signal?: AbortSignal,
): Promise<void> => {
  el.src = getVideoUrl(videoKey);
  el.load();
  await waitForLoadedMetadata(el, signal);
  await seekTo(el, startTime, signal);
};

/**
 * Owns the game's `<video>` element lifecycle: per-round loading, volume/mute,
 * pause syncing and autoplay-blocked recovery. Extracted from the Game page so
 * the orchestrator stays focused on match state, not media plumbing.
 *
 * Each guessing round loads once (keyed on videoKey + server offset), seeks
 * before play(), then keeps playing through reveal without reload.
 */
export function useVideoPlayback({
  currentSong,
  phase,
  isGamePaused,
  initialVolume = 20,
}: UseVideoPlaybackArgs): UseVideoPlaybackResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const preloadRef = useRef<HTMLVideoElement>(null);
  const volumeRef = useRef(initialVolume);
  const isMutedRef = useRef(false);
  const loadedClipRef = useRef<string | null>(null);
  const warmedClipRef = useRef<string | null>(null);

  const [volume, setVolume] = useState(initialVolume);
  const [isMuted, setIsMuted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const applyVolume = (el: HTMLVideoElement) => {
    el.volume = isMutedRef.current ? 0 : volumeRef.current / 100;
  };

  const playElement = async (el: HTMLVideoElement, signal?: AbortSignal): Promise<void> => {
    applyVolume(el);
    try {
      await el.play();
      if (!signal?.aborted) setAutoplayBlocked(false);
    } catch (e) {
      if (signal?.aborted) return;
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setAutoplayBlocked(true);
    }
  };

  /**
   * Warm an upcoming clip in a hidden, muted element so the browser fetches and
   * buffers bytes near the play offset. Best-effort — failures are ignored.
   */
  const warmVideo = useCallback((videoKey: string | null | undefined, startTime = 0) => {
    const el = preloadRef.current;
    if (!el || !videoKey) return;

    const clipKey = roundClipKey(videoKey, startTime);
    if (warmedClipRef.current === clipKey) return;
    warmedClipRef.current = clipKey;

    void (async () => {
      try {
        el.preload = 'auto';
        el.muted = true;
        await loadClipAtOffset(el, videoKey, startTime);
      } catch {
        warmedClipRef.current = null;
      }
    })();
  }, []);

  /** Drop warm-cache when the active guessing clip changes. */
  useEffect(() => {
    if (!isGuessingSong(currentSong)) return;
    const clipKey = roundClipKey(currentSong.videoKey, currentSong.videoStartTime || 0);
    if (loadedClipRef.current === clipKey) return;
    warmedClipRef.current = null;
  }, [currentSong]);

  // New match intro — allow the same clip+offset to load again after solo replay.
  useEffect(() => {
    if (phase !== 'loading') return;
    loadedClipRef.current = null;
    warmedClipRef.current = null;
  }, [phase]);

  // Keep the live element volume in sync with state.
  useEffect(() => {
    volumeRef.current = volume;
    isMutedRef.current = isMuted;
    if (videoRef.current) videoRef.current.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  // Load once per guessing round; seek before play; skip reload on reveal (RevealSong).
  useEffect(() => {
    if (!isGuessingSong(currentSong)) return;

    const { videoKey } = currentSong;
    const startTime = currentSong.videoStartTime || 0;
    const clipKey = roundClipKey(videoKey, startTime);
    if (loadedClipRef.current === clipKey) return;

    const el = videoRef.current;
    if (!el) return;

    const controller = new AbortController();

    void (async () => {
      try {
        await loadClipAtOffset(el, videoKey, startTime, controller.signal);
        if (controller.signal.aborted) return;
        loadedClipRef.current = clipKey;
        await playElement(el, controller.signal);
      } catch (e) {
        if (controller.signal.aborted) return;
        if (e instanceof DOMException && e.name === 'AbortError') return;
        loadedClipRef.current = null;
      }
    })();

    return () => controller.abort();
  }, [currentSong]);

  // Pause the media element whenever the match is paused.
  useEffect(() => {
    if (isGamePaused) videoRef.current?.pause();
  }, [isGamePaused]);

  const toggleMute = () => setIsMuted((m) => !m);

  const resumeCurrent = () => {
    const el = videoRef.current;
    if (!el) return;
    el.play()
      .then(() => setAutoplayBlocked(false))
      .catch(() => {});
  };

  return { videoRef, preloadRef, warmVideo, volume, setVolume, isMuted, toggleMute, autoplayBlocked, resumeCurrent };
}
