import { AlertTriangle, Clock, ListMusic, Mic2, Shuffle, Target, Trophy } from 'lucide-react';
import type { GameConfig } from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { getDifficultyBadge } from '@/features/hub/components/roomSettings';

interface MatchConfigHeaderProps {
  settings: Partial<
    Pick<GameConfig, 'soundCount' | 'guessDuration' | 'difficulty' | 'precision' | 'responseType' | 'soundSelection'>
  >;
  className?: string;
}

function responseTypeLabel(responseType?: GameConfig['responseType']): string {
  if (responseType === 'mix') return 'MIX';
  if (responseType === 'qcm') return 'QCM';
  return 'Typing';
}

/** Game-over settings strip — same chips as the room list / lobby (solo + multi). */
export function MatchConfigHeader({ settings, className }: MatchConfigHeaderProps) {
  const diffBadge = getDifficultyBadge(settings.difficulty || []);
  const soundCount = settings.soundCount ?? 10;
  const guessDuration = settings.guessDuration ?? 15;

  return (
    <div
      className={cn(
        'flex w-full overflow-hidden rounded-md border border-border/60 bg-secondary/20',
        className,
      )}
    >
      <div
        className="flex shrink-0 flex-col items-center justify-center gap-0.5 self-stretch bg-primary px-3 text-primary-foreground shadow-sm"
        aria-label="Mode Standard"
      >
        <Trophy className="h-4 w-4 fill-current" aria-hidden />
        <span className="text-[10px] font-black uppercase tracking-wider">STD</span>
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-2 px-4 py-3">
        <div className="flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/30 px-2.5 py-1 text-xs font-bold text-muted-foreground">
          <ListMusic className="h-3.5 w-3.5 text-accent" aria-hidden />
          <span className="text-foreground">{soundCount}</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-warning/20 bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          <span>{guessDuration}s</span>
        </div>

        <div
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold',
            diffBadge.className,
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          <span>{diffBadge.label}</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
          <Mic2 className="h-3.5 w-3.5" aria-hidden />
          <span>{responseTypeLabel(settings.responseType)}</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">
          <Target className="h-3.5 w-3.5" aria-hidden />
          <span>{settings.precision === 'exact' ? 'Exact' : 'Franchise'}</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-aqua/20 bg-aqua/10 px-2.5 py-1 text-xs font-bold text-aqua">
          <Shuffle className="h-3.5 w-3.5" aria-hidden />
          <span>{settings.soundSelection === 'watched' ? 'Ma liste' : 'Aléatoire'}</span>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use `MatchConfigHeader`. */
export const SoloConfigHeader = MatchConfigHeader;
