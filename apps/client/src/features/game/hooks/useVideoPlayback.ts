import { useCallback, useEffect, useRef, useState } from 'react';
import type { CurrentSong } from '@/features/game/state/gameReducer';
import { getVideoUrl } from '@/lib/video';

interface UseVideoPlaybackArgs {
  /** Current round song (guessing or reveal) — drives the one-shot per-round load. */
  currentSong: CurrentSong;
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

/**
 * Owns the game's `<video>` element lifecycle: per-round loading, volume/mute,
 * pause syncing and autoplay-blocked recovery. Extracted from the Game page so
 * the orchestrator stays focused on match state, not media plumbing.
 *
 * The video is loaded ONCE per round (keyed on `videoKey`) and deliberately kept
 * playing through the reveal phase for visual continuity — it is never reloaded
 * when the phase flips.
 */
export function useVideoPlayback({
  currentSong,
  isGamePaused,
  initialVolume = 20,
}: UseVideoPlaybackArgs): UseVideoPlaybackResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const preloadRef = useRef<HTMLVideoElement>(null);
  const volumeRef = useRef(initialVolume);
  const isMutedRef = useRef(false);
  const loadedVideoKeyRef = useRef<string | null>(null);
  const warmedVideoKeyRef = useRef<string | null>(null);

  const [volume, setVolume] = useState(initialVolume);
  const [isMuted, setIsMuted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const playVideoSafe = (videoKey: string | null | undefined, startTime = 0) => {
    if (!videoRef.current || !videoKey) return;
    videoRef.current.src = `${getVideoUrl(videoKey)}#t=${startTime}`;
    videoRef.current.load();
    videoRef.current.volume = isMutedRef.current ? 0 : volumeRef.current / 100;
    const playPromise = videoRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setAutoplayBlocked(false))
        .catch((e: DOMException) => {
          if (e.name !== 'AbortError') setAutoplayBlocked(true);
        });
    }
  };

  /**
   * Warm an upcoming clip in a hidden, muted element so the browser fetches and
   * buffers the bytes at the exact play offset. When the main player later loads
   * the same URL it hits the HTTP cache and starts without cold buffering. Used
   * for round 1 (during the intro) and each next round (during the reveal).
   */
  const warmVideo = useCallback((videoKey: string | null | undefined, startTime = 0) => {
    const el = preloadRef.current;
    if (!el || !videoKey) return;
    if (warmedVideoKeyRef.current === videoKey) return;
    warmedVideoKeyRef.current = videoKey;
    el.preload = 'auto';
    el.muted = true;
    const url = `${getVideoUrl(videoKey)}#t=${startTime}`;
    el.src = url;
    el.load();
  }, []);

  /** Drop warm-cache when the active round changes so the next clip can prefetch. */
  useEffect(() => {
    if (!currentSong || !('videoKey' in currentSong)) return;
    if (loadedVideoKeyRef.current === currentSong.videoKey) return;
    warmedVideoKeyRef.current = null;
  }, [currentSong]);

  // Keep the live element volume in sync with state.
  useEffect(() => {
    volumeRef.current = volume;
    isMutedRef.current = isMuted;
    if (videoRef.current) videoRef.current.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  // Load the video once per round; never restart it on reveal.
  useEffect(() => {
    if (!currentSong || !('videoKey' in currentSong)) return;
    if (loadedVideoKeyRef.current === currentSong.videoKey) return;
    loadedVideoKeyRef.current = currentSong.videoKey;
    playVideoSafe(currentSong.videoKey, currentSong.videoStartTime || 0);
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
