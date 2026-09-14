import type { DailyTrackState } from '@aniquizz/shared';
import { cn } from '@/lib/utils';

const LABELS: Record<DailyTrackState, string> = {
  empty: 'À venir',
  pending: 'En cours',
  correct: 'Trouvé',
  wrong: 'Raté',
  voided: 'Annulé',
};

interface DailyTracksProps {
  tracks: DailyTrackState[];
  className?: string;
  size?: 'sm' | 'lg' | 'xl';
}

const BAR: Record<'sm' | 'lg' | 'xl', Record<DailyTrackState, string>> = {
  sm: {
    empty: 'h-8 w-3',
    pending: 'h-12 w-3',
    correct: 'h-12 w-3',
    wrong: 'h-12 w-3',
    voided: 'h-6 w-3',
  },
  lg: {
    empty: 'h-12 w-4',
    pending: 'h-20 w-4',
    correct: 'h-20 w-4',
    wrong: 'h-20 w-4',
    voided: 'h-8 w-4',
  },
  xl: {
    empty: 'h-16 w-5',
    pending: 'h-28 w-5',
    correct: 'h-28 w-5',
    wrong: 'h-28 w-5',
    voided: 'h-12 w-5',
  },
};

/** Five-track tape meter — one segment per daily song. */
export function DailyTracks({ tracks, className, size = 'sm' }: DailyTracksProps) {
  return (
    <div
      className={cn(
        'flex items-end justify-center',
        size === 'xl' ? 'gap-4' : size === 'lg' ? 'gap-3' : 'gap-2',
        className,
      )}
      role="img"
      aria-label={`Progression : ${tracks.map((track, index) => `son ${index + 1} ${LABELS[track]}`).join(', ')}`}
    >
      {tracks.map((track, index) => (
        <div key={index} className="flex flex-col items-center gap-1.5">
          <div
            className={cn(
              'rounded-sm border transition-[height,background-color,border-color] duration-300 ease-out',
              BAR[size][track],
              track === 'empty' && 'border-border/70 bg-muted/40',
              track === 'pending' && 'border-warning/50 bg-warning/30',
              track === 'correct' && 'border-success/50 bg-success',
              track === 'wrong' && 'border-destructive/50 bg-destructive',
              track === 'voided' && 'border-dashed border-muted-foreground/40 bg-transparent',
            )}
          />
          <span
            className={cn(
              'font-mono text-muted-foreground',
              size === 'xl' ? 'text-sm' : 'text-xs',
            )}
          >
            {index + 1}
          </span>
        </div>
      ))}
    </div>
  );
}
