import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { cn } from '@/lib/utils';
import { getVideoUrl } from '@/lib/video';
import { adminApi, AdminApiError, type AdminRoom } from '@/lib/adminApi';
import { ADMIN_COPY } from '@/features/admin/copy/adminCopy';
import { PrefVolumeVideo } from '@/features/settings/components/PrefVolumeVideo';

const errorMessage = (e: unknown): string =>
  e instanceof AdminApiError ? e.message : ADMIN_COPY.genericError;

const PHASE_LABEL = ADMIN_COPY.spectator.phase;

const SPECTATOR_POLL_MS = 2000;

export function RoomSpectatorDialog({
  roomId,
  onClose,
}: {
  roomId: string | null;
  onClose: () => void;
}) {
  const [room, setRoom] = useState<AdminRoom | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setMissing(false);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const { room: next } = await adminApi.getRoom(roomId);
        if (!cancelled) {
          setRoom(next);
          setMissing(false);
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof AdminApiError && e.status === 404) {
          setMissing(true);
          setRoom(null);
          return;
        }
        toast.error(errorMessage(e));
      }
    };
    void tick();
    const id = setInterval(() => {
      if (document.hidden) return;
      void tick();
    }, SPECTATOR_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [roomId]);

  const ranked = useMemo(() => {
    if (!room) return [];
    return [...room.players].sort(
      (a, b) => b.score - a.score || a.username.localeCompare(b.username),
    );
  }, [room]);

  const progress = room?.progress;
  const clipUrl = progress?.videoKey ? getVideoUrl(progress.videoKey) : '';
  const startAt = progress?.videoStartTime ?? 0;

  return (
    <Dialog open={!!roomId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {ADMIN_COPY.spectator.title}
            {room ? ` — ${room.name}` : ''}
          </DialogTitle>
        </DialogHeader>
        {missing ? (
          <p className="text-sm text-muted-foreground">{ADMIN_COPY.spectator.closed}</p>
        ) : !room ? (
          <p className="text-sm text-muted-foreground">{ADMIN_COPY.spectator.waiting}</p>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {progress ? (
                <>
                  Round {progress.currentRound}/{progress.totalRounds}
                  {progress.phase && (
                    <span> · {PHASE_LABEL[progress.phase] ?? progress.phase}</span>
                  )}
                </>
              ) : (
                ADMIN_COPY.spectator.waiting
              )}
            </div>

            {progress?.videoKey ? (
              clipUrl ? (
                <PrefVolumeVideo
                  key={`${progress.videoKey}-${startAt}`}
                  src={clipUrl}
                  controls
                  autoPlay
                  className="max-h-[40vh] w-full rounded bg-black"
                  onLoadedMetadata={(event) => {
                    if (startAt > 0) event.currentTarget.currentTime = startAt;
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{ADMIN_COPY.spectator.missingUrl}</p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">{ADMIN_COPY.spectator.noClip}</p>
            )}

            {progress?.anime && (
              <p className="text-sm">
                {progress.anime}
                {progress.title && (
                  <span className="text-muted-foreground"> — {progress.title}</span>
                )}
                {progress.artist && (
                  <span className="text-muted-foreground"> · {progress.artist}</span>
                )}
              </p>
            )}

            <div>
              <h3 className="mb-2 text-sm font-medium">{ADMIN_COPY.spectator.scores}</h3>
              <ol className="space-y-1">
                {ranked.map((p, i) => (
                  <li
                    key={p.userId}
                    className={cn(
                      'flex items-center gap-2 rounded-lg bg-secondary/50 px-2 py-1 text-sm',
                      !p.isConnected && 'opacity-60',
                    )}
                  >
                    <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                    <UserAvatar username={p.username} avatar={p.avatar} className="h-6 w-6" />
                    <span className="min-w-0 flex-1 truncate">{p.username}</span>
                    <span className="font-medium tabular-nums">{p.score}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
