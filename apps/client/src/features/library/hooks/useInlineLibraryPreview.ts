import { useCallback, useRef, useState } from 'react';

/** Options passed when opening the song modal while an inline preview was active. */
export type LibrarySongSelectOptions = {
  resumeAt?: number;
  autoPlay?: boolean;
};

/**
 * Shared inline preview state for library list views.
 * Captures currentTime (+ play state) so the modal can resume seamlessly.
 */
export function useInlineLibraryPreview() {
  const [playingId, setPlayingId] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const toggle = useCallback((songId: number) => {
    setPlayingId((prev) => (prev === songId ? null : songId));
  }, []);

  const stop = useCallback(() => {
    videoRef.current?.pause();
    setPlayingId(null);
  }, []);

  /** Stop inline preview; if it was this song, return resume options for the modal. */
  const stopAndCapture = useCallback(
    (songId: number): LibrarySongSelectOptions | undefined => {
      const el = videoRef.current;
      if (playingId === songId && el) {
        const opts: LibrarySongSelectOptions = {
          resumeAt: el.currentTime,
          autoPlay: !el.paused,
        };
        el.pause();
        setPlayingId(null);
        return opts;
      }
      el?.pause();
      setPlayingId(null);
      return undefined;
    },
    [playingId],
  );

  return { playingId, toggle, stop, stopAndCapture, videoRef };
}
