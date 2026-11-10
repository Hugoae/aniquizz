import { SkipForward, X } from 'lucide-react';
import { formatEvolvingSeconds, type EvolvingRoundCue } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface EvolvingLadderProps {
  cue: EvolvingRoundCue;
  onSkip: () => void;
  onAbandon: () => void;
}

/** One track. The fill stops on the current duration notch and eases forward. */
function notchPercent(index: number, count: number): number {
  if (count <= 1) return 50;
  const inset = 8;
  return inset + (index / (count - 1)) * (100 - inset * 2);
}

export function EvolvingLadder({ cue, onSkip, onAbandon }: EvolvingLadderProps) {
  const count = cue.steps.length;
  const fill = notchPercent(cue.stepIndex, count);
  const current = formatEvolvingSeconds(cue.clipSeconds);
  const next = cue.nextClipSeconds != null ? formatEvolvingSeconds(cue.nextClipSeconds) : null;

  return (
    <div className="mb-1 mt-3 w-full max-w-[850px] shrink-0">
      <div className="flex items-start gap-2">
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              onClick={onAbandon}
              aria-label="Abandonner le titre"
              className="h-9 w-9 shrink-0 px-0 text-muted-foreground hover:border-destructive hover:bg-destructive/15 hover:text-destructive focus-visible:border-destructive focus-visible:text-destructive"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Abandonner le titre</TooltipContent>
        </Tooltip>

        <div className="min-w-0 flex-1 pt-2.5">
          <div
            className="relative h-4 overflow-hidden rounded-full bg-muted"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={count}
            aria-valuenow={cue.stepIndex + 1}
            aria-label={`Marche ${cue.stepIndex + 1} sur ${count}, ${current}, ${cue.points} points`}
          >
            <div
              className="absolute inset-y-0 left-0 bg-primary shadow-glow motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-out"
              style={{ width: `${fill}%` }}
            />
            {cue.steps.map((step, index) => {
              const reached = index <= cue.stepIndex;
              return (
                <span
                  key={step.seconds}
                  className={cn(
                    'absolute inset-y-0 w-px -translate-x-1/2',
                    reached ? 'bg-primary-foreground/80' : 'bg-foreground/30',
                  )}
                  style={{ left: `${notchPercent(index, count)}%` }}
                />
              );
            })}
          </div>
          <div className="relative mt-1.5 h-4">
            {cue.steps.map((step, index) => {
              const active = index === cue.stepIndex;
              return (
                <span
                  key={step.seconds}
                  className={cn(
                    'absolute -translate-x-1/2 font-mono text-[10px] leading-none',
                    active ? 'font-bold text-primary' : 'text-muted-foreground',
                  )}
                  style={{ left: `${notchPercent(index, count)}%` }}
                >
                  {formatEvolvingSeconds(step.seconds)}
                </span>
              );
            })}
          </div>
        </div>

        <Button
          type="button"
          onClick={onSkip}
          aria-label={next ? `Passer, extrait de ${next}` : 'Passer'}
          className="h-9 shrink-0 gap-1.5 px-3 shadow-glow"
        >
          <SkipForward className="h-4 w-4" aria-hidden="true" />
          Passer
        </Button>
      </div>
    </div>
  );
}
