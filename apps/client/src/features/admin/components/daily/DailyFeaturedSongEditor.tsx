import { useState } from 'react';
import { Dices } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { DailyAdminFeatured, DailySongSearchHit } from '@/lib/adminApi';
import { DailySongSearch } from './DailySongSearch';
import { DAILY_ADMIN_COPY } from './dailyAdminCopy';

interface DailyFeaturedSongEditorProps {
  featured: DailyAdminFeatured | null;
  locked: boolean;
  excludeIds: number[];
  busy: boolean;
  onSet: (songId: number) => void;
  onRedraw: () => void;
}

export function DailyFeaturedSongEditor({
  featured,
  locked,
  excludeIds,
  busy,
  onSet,
  onRedraw,
}: DailyFeaturedSongEditorProps) {
  const [pending, setPending] = useState<
    { kind: 'set'; songId: number } | { kind: 'redraw' } | null
  >(null);
  const blockedIds = featured ? [...excludeIds, featured.songId] : excludeIds;

  const askSet = (song: DailySongSearchHit) => {
    if (featured) setPending({ kind: 'set', songId: song.id });
    else onSet(song.id);
  };

  const askRedraw = () => {
    if (featured) setPending({ kind: 'redraw' });
    else onRedraw();
  };

  return (
    <section className="glass-card space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base">{DAILY_ADMIN_COPY.featuredTitle}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{DAILY_ADMIN_COPY.featuredHint}</p>
          {featured ? (
            <p className="mt-2 truncate text-sm">
              <span className="font-semibold">{featured.anime}</span>
              <span className="text-muted-foreground">
                {' · '}
                {featured.title}
                {' · '}
                {featured.typeLabel}
              </span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{DAILY_ADMIN_COPY.featuredEmpty}</p>
          )}
          {locked && <p className="mt-2 text-xs text-warning">{DAILY_ADMIN_COPY.featuredPast}</p>}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || locked}
          onClick={askRedraw}
        >
          <Dices className="mr-2 h-4 w-4" aria-hidden="true" />
          {DAILY_ADMIN_COPY.shuffle}
        </Button>
      </div>
      <DailySongSearch excludeIds={blockedIds} disabled={busy || locked} onPick={askSet} />

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === 'redraw'
                ? DAILY_ADMIN_COPY.featuredRedraw
                : DAILY_ADMIN_COPY.featuredReplace}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.kind === 'redraw'
                ? DAILY_ADMIN_COPY.featuredRedrawBody
                : DAILY_ADMIN_COPY.featuredReplaceBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{DAILY_ADMIN_COPY.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const next = pending;
                setPending(null);
                if (!next) return;
                if (next.kind === 'redraw') onRedraw();
                else onSet(next.songId);
              }}
            >
              {DAILY_ADMIN_COPY.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
