import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CatalogueSong } from '@/lib/adminApi';
import { getVideoUrl } from '@/lib/video';
import { PrefVolumeVideo } from '@/features/settings/components/PrefVolumeVideo';

// --- Video preview ----------------------------------------------------------

export function VideoPreviewDialog({
  song,
  onOpenChange,
}: {
  song: CatalogueSong | null;
  onOpenChange: (v: boolean) => void;
}) {
  const url = song ? getVideoUrl(song.videoKey) : '';
  return (
    <Dialog open={!!song} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-card">
        <DialogHeader>
          <DialogTitle>{song ? `${song.title} — ${song.artist}` : ''}</DialogTitle>
          <DialogDescription className="font-mono text-xs">{song?.videoKey}</DialogDescription>
        </DialogHeader>
        {url ? (
          <PrefVolumeVideo
            src={url}
            controls
            autoPlay
            className="max-h-[70vh] w-full rounded bg-black"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            URL vidéo indisponible (VITE_R2_PUBLIC_URL manquant).
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
