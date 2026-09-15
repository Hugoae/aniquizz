import { memo } from 'react';
import { Lock, LockOpen, Pencil, Play, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { CatalogueSong, SongDifficulty, SongStatus } from '@/lib/adminApi';
import { ADMIN_COPY } from '@/features/admin/copy/adminCopy';

const DIFFICULTIES: SongDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];
const STATUSES: SongStatus[] = ['PENDING', 'PROCESSING', 'COMPLETED', 'ERROR', 'SKIPPED'];

const statusBadge: Record<SongStatus, string> = {
  PENDING: 'bg-secondary text-foreground',
  PROCESSING: 'bg-info/20 text-info',
  COMPLETED: 'bg-success/20 text-success',
  ERROR: 'bg-destructive/20 text-destructive',
  SKIPPED: 'bg-warning/20 text-warning',
};

const selectCls = 'rounded border border-border bg-background px-2 py-1 text-xs';

export type CatalogueSongRowProps = {
  song: CatalogueSong;
  animeId: number;
  canManage: boolean;
  selected: boolean;
  highlighted?: boolean;
  onToggleSelect: (id: number) => void;
  onQuickPatch: (song: CatalogueSong, partial: Partial<CatalogueSong>) => void;
  onPreview: (song: CatalogueSong) => void;
  onEdit: (song: CatalogueSong, animeId: number) => void;
  onDelete: (song: CatalogueSong) => void;
};

export const CatalogueSongRow = memo(function CatalogueSongRow({
  song,
  animeId,
  canManage,
  selected,
  highlighted = false,
  onToggleSelect,
  onQuickPatch,
  onPreview,
  onEdit,
  onDelete,
}: CatalogueSongRowProps) {
  return (
    <div
      id={`admin-song-${song.id}`}
      className={cn(
        'flex items-center border-t border-border/50 text-sm hover:bg-secondary/50',
        highlighted && 'bg-primary/10 ring-1 ring-inset ring-primary/50',
      )}
    >
      {canManage && (
        <div className="w-10 shrink-0 p-2 align-middle">
          <Checkbox checked={selected} onCheckedChange={() => onToggleSelect(song.id)} />
        </div>
      )}
      <div className="min-w-0 flex-1 p-2">
        <div className="font-medium">
          {song.songType}
          {song.sequence} — {song.title}
        </div>
        <div className="text-xs text-muted-foreground">{song.artist}</div>
      </div>
      <div className="w-28 shrink-0 p-2">
        {canManage ? (
          <select
            className={selectCls}
            value={song.difficulty}
            onChange={(e) =>
              void onQuickPatch(song, { difficulty: e.target.value as SongDifficulty })
            }
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {ADMIN_COPY.difficulty[d]}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-muted-foreground">
            {ADMIN_COPY.difficulty[song.difficulty]}
          </span>
        )}
      </div>
      <div className="w-36 shrink-0 p-2">
        {canManage ? (
          <select
            className={cn(selectCls, statusBadge[song.downloadStatus])}
            value={song.downloadStatus}
            onChange={(e) =>
              void onQuickPatch(song, { downloadStatus: e.target.value as SongStatus })
            }
          >
            {STATUSES.map((st) => (
              <option key={st} value={st}>
                {ADMIN_COPY.downloadStatus[st]}
              </option>
            ))}
          </select>
        ) : (
          <span className={cn('rounded px-1.5 py-0.5 text-xs', statusBadge[song.downloadStatus])}>
            {ADMIN_COPY.downloadStatus[song.downloadStatus]}
          </span>
        )}
      </div>
      <div className="w-12 shrink-0 p-2">
        {canManage ? (
          <button
            type="button"
            onClick={() => void onQuickPatch(song, { isLocked: !song.isLocked })}
            aria-label={song.isLocked ? `Déverrouiller ${song.title}` : `Verrouiller ${song.title}`}
          >
            {song.isLocked ? (
              <Lock className="h-4 w-4 text-warning" />
            ) : (
              <LockOpen className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : song.isLocked ? (
          <Lock className="h-4 w-4 text-warning" aria-label="Verrouillé" />
        ) : (
          <LockOpen className="h-4 w-4 text-muted-foreground" aria-label="Non verrouillé" />
        )}
      </div>
      <div className="flex w-32 shrink-0 items-center justify-end gap-1 p-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={!song.videoKey}
          aria-label={`Prévisualiser ${song.title}`}
          onClick={() => onPreview(song)}
        >
          <Play className="h-3.5 w-3.5" aria-hidden />
        </Button>
        {canManage && (
          <>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Modifier ${song.title}`}
              onClick={() => onEdit(song, animeId)}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              aria-label={`Supprimer ${song.title}`}
              onClick={() => onDelete(song)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </>
        )}
      </div>
    </div>
  );
});
