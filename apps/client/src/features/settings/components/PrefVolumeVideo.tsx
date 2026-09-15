import type { RefObject, VideoHTMLAttributes } from 'react';
import { usePlayerMediaVolume } from '@/features/settings/lib/usePlayerMediaVolume';

type PrefVolumeVideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, 'ref'> & {
  /** Optional extra ref (library resume handoff). */
  mediaRef?: RefObject<HTMLVideoElement | null>;
};

/** `<video>` that follows (and writes back to) the global player volume/mute prefs. */
export function PrefVolumeVideo({
  mediaRef,
  onLoadedMetadata,
  onVolumeChange,
  ...props
}: PrefVolumeVideoProps) {
  const sync = usePlayerMediaVolume(mediaRef);
  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption -- preview clip has no caption track
    <video
      {...props}
      ref={sync.ref}
      onLoadedMetadata={(event) => {
        sync.onLoadedMetadata(event);
        onLoadedMetadata?.(event);
      }}
      onVolumeChange={(event) => {
        sync.onVolumeChange(event);
        onVolumeChange?.(event);
      }}
    />
  );
}
