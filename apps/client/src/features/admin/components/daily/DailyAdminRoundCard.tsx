import { ArrowDown, ArrowUp, Pause, Play, Shuffle, TimerReset, Undo2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getVideoUrl } from '@/lib/video';
import { PrefVolumeVideo } from '@/features/settings/components/PrefVolumeVideo';
import {
  libraryDifficultyClass,
  libraryDifficultyLabel,
} from '@/features/library/lib/libraryStyles';
import type { DailyAdminRound, DailySongSearchHit } from '@/lib/adminApi';
import { DailySongSearch } from './DailySongSearch';
import { DAILY_ADMIN_COPY } from './dailyAdminCopy';
import { formatClipTimestamp, toLibraryDifficulty } from './dailyAdminFormat';

interface DailyAdminRoundCardProps {
  round: DailyAdminRound;
  index: number;
  total: number;
  excludeIds: number[];
  editable: boolean;
  canVoid: boolean;
  busy: boolean;
  onReplace: (song: DailySongSearchHit) => void;
  onShuffle: () => void;
  onReshuffleClip: () => void;
  onMove: (direction: -1 | 1) => void;
  onVoid: () => void;
  onRestore: () => void;
  preview: boolean;
  onTogglePreview: () => void;
  onClosePreview: () => void;
}

export function DailyAdminRoundCard({
  round,
  index,
  total,
  excludeIds,
  editable,
  canVoid,
  busy,
  onReplace,
  onShuffle,
  onReshuffleClip,
  onMove,
  onVoid,
  onRestore,
  preview,
  onTogglePreview,
  onClosePreview,
}: DailyAdminRoundCardProps) {
  const difficulty = toLibraryDifficulty(round.difficulty);
  const videoUrl = round.videoKey ? getVideoUrl(round.videoKey) : '';

  return (
    <li className={cn('glass-card overflow-hidden', round.voided && 'opacity-70')}>
      <div className="flex items-start gap-3 p-3">
        {round.cover ? (
          <img
            src={round.cover}
            alt=""
            className="h-24 w-16 shrink-0 rounded-lg border border-border/60 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-secondary/50 text-[10px] text-muted-foreground">
            —
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] text-muted-foreground">{round.position}</span>
            <span className="rounded border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[10px] font-black uppercase">
              {round.typeLabel}
            </span>
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                libraryDifficultyClass(difficulty),
              )}
            >
              {libraryDifficultyLabel(difficulty)}
            </span>
            {round.voided && (
              <Badge variant="outline" className="border-destructive/40 text-destructive">
                {DAILY_ADMIN_COPY.voided}
              </Badge>
            )}
          </div>
          <p className="truncate font-semibold leading-tight">{round.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {round.artist}
            <span className="text-muted-foreground/50"> · </span>
            {round.anime}
            {round.year ? ` · ${round.year}` : ''}
            {round.franchise && round.franchise !== round.anime ? ` · ${round.franchise}` : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-muted-foreground">
              {DAILY_ADMIN_COPY.clipStart} {formatClipTimestamp(round.videoStartTime)}
            </span>
            {editable && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={onReshuffleClip}
                className="h-7 gap-1 px-2 text-[11px]"
              >
                <TimerReset className="h-3.5 w-3.5" />
                {DAILY_ADMIN_COPY.reshuffleClip}
              </Button>
            )}
          </div>
          {round.choices.length > 0 && (
            <p className="truncate text-[11px] text-muted-foreground/80">
              {DAILY_ADMIN_COPY.qcm} : {round.choices.join(' · ')}
            </p>
          )}
          {editable && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground">{DAILY_ADMIN_COPY.changeSong}</p>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <DailySongSearch excludeIds={excludeIds} disabled={busy} onPick={onReplace} />
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={onShuffle}
                    className="gap-1"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    {DAILY_ADMIN_COPY.shuffle}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={busy || index === 0}
                    aria-label={DAILY_ADMIN_COPY.moveUp}
                    onClick={() => onMove(-1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={busy || index === total - 1}
                    aria-label={DAILY_ADMIN_COPY.moveDown}
                    onClick={() => onMove(1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          {canVoid && !round.voided && (
            <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={onVoid}>
              {DAILY_ADMIN_COPY.void}
            </Button>
          )}
          {canVoid && round.voided && (
            <Button size="sm" variant="outline" disabled={busy} className="gap-1" onClick={onRestore}>
              <Undo2 className="h-3.5 w-3.5" />
              {DAILY_ADMIN_COPY.restore}
            </Button>
          )}
        </div>
        {videoUrl && (
          <button
            type="button"
            aria-label={preview ? DAILY_ADMIN_COPY.stopPreview : DAILY_ADMIN_COPY.preview}
            onClick={onTogglePreview}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
              preview
                ? 'bg-primary text-primary-foreground'
                : 'bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground',
            )}
          >
            {preview ? (
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {preview && videoUrl && (
        <div className="relative border-t border-border/30 bg-secondary/20 px-3 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={DAILY_ADMIN_COPY.closePreview}
            onClick={onClosePreview}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
          <div className="flex justify-center pr-10">
            <PrefVolumeVideo
              key={`${round.id}-${round.videoStartTime}`}
              className="aspect-video w-full max-w-xl rounded-lg border border-border/50 bg-card shadow-sm"
              src={videoUrl}
              controls
              autoPlay
              playsInline
              preload="metadata"
              aria-label={`${DAILY_ADMIN_COPY.preview} — ${round.title}`}
              onLoadedMetadata={(event) => {
                event.currentTarget.currentTime = round.videoStartTime;
              }}
            />
          </div>
        </div>
      )}
    </li>
  );
}
