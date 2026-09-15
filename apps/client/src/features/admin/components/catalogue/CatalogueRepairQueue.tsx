import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { adminApi, AdminApiError, type CatalogueRepairSong } from '@/lib/adminApi';
import { ADMIN_COPY } from '@/features/admin/copy/adminCopy';

const errorMessage = (e: unknown): string =>
  e instanceof AdminApiError ? e.message : ADMIN_COPY.genericError;

export function CatalogueRepairQueue({ onOpenSong }: { onOpenSong: (songId: number) => void }) {
  const [songs, setSongs] = useState<CatalogueRepairSong[] | null>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .catalogueRepair()
      .then((res) => {
        if (cancelled) return;
        setSongs(res.songs);
        setTruncated(res.truncated);
      })
      .catch((e) => {
        if (!cancelled) toast.error(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!songs) {
    return <p className="text-sm text-muted-foreground">{ADMIN_COPY.repair.load}</p>;
  }

  return (
    <section className="glass-card space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Wrench className="h-4 w-4 text-warning" aria-hidden />
        <h2 className="font-semibold">{ADMIN_COPY.repair.title}</h2>
        <Badge className="bg-secondary">{songs.length}</Badge>
      </div>
      {songs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{ADMIN_COPY.repair.empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {songs.map((song) => (
            <li key={song.id} className="flex flex-wrap items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {song.songType}
                  {song.sequence} — {song.title}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {song.anime.name}
                  {song.franchise ? ` · ${song.franchise.name}` : ''}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {song.reasons.map((reason) => (
                  <Badge
                    key={reason}
                    className={
                      reason === 'error'
                        ? 'bg-destructive/20 text-destructive'
                        : reason === 'missing_video'
                          ? 'bg-warning/20 text-warning'
                          : 'bg-secondary text-foreground'
                    }
                  >
                    {ADMIN_COPY.repair.reasons[reason]}
                  </Badge>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={() => onOpenSong(song.id)}>
                {ADMIN_COPY.repair.open}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {truncated && <p className="text-xs text-muted-foreground">{ADMIN_COPY.repair.truncated}</p>}
    </section>
  );
}
