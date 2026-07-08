import { Medal as MedalIcon } from 'lucide-react';
import {
  getMedalMeta,
  medalMarkerRatios,
  nextMedalGoal,
  type Medal,
  type MedalTier,
} from '@aniquizz/shared';
import { cn } from '@/lib/utils';

interface SoloMasteryBarProps {
  score: number;
  maxPossibleScore: number;
  isSuccess: boolean;
  soloMedal: MedalTier;
  songDifficulties: string[];
}

const MEDAL_ORDER: Medal[] = ['bronze', 'silver', 'gold', 'platinum'];

function goalMessage(
  score: number,
  maxPossibleScore: number,
  difficulties: string[],
  soloMedal: MedalTier,
): string | null {
  const goal = nextMedalGoal(score, maxPossibleScore, difficulties, soloMedal);
  if (goal) {
    const ptLabel = goal.pointsNeeded === 1 ? 'pt' : 'pts';
    return `Encore ${goal.pointsNeeded} ${ptLabel} pour la Médaille ${goal.label}`;
  }
  if (soloMedal === 'platinum') return 'Platine — performance maximale !';
  return null;
}

export function SoloMasteryBar({
  score,
  maxPossibleScore,
  isSuccess,
  soloMedal,
  songDifficulties,
}: SoloMasteryBarProps) {
  const scoreRatio = maxPossibleScore > 0 ? score / maxPossibleScore : 0;
  const progressPercent = Math.min(100, scoreRatio * 100);
  const markers = medalMarkerRatios(songDifficulties);
  const hint = goalMessage(score, maxPossibleScore, songDifficulties, soloMedal);

  return (
    <div className="z-10 w-full">
      <div className="relative w-full px-1 pt-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-4">
          {MEDAL_ORDER.map((tier) => {
            const pct = Math.min(100, markers[tier] * 100);
            const earned = scoreRatio >= markers[tier];
            const meta = getMedalMeta(tier);
            if (!meta) return null;
            return (
              <MedalIcon
                key={tier}
                className={cn(
                  'absolute top-0 h-3.5 w-3.5 -translate-x-1/2',
                  meta.textClass,
                  earned && 'drop-shadow-[0_0_6px_currentColor]',
                )}
                style={{ left: `${pct}%` }}
                aria-hidden
              />
            );
          })}
        </div>

        <div className="relative h-4 w-full overflow-hidden rounded-full border border-border/60 bg-secondary/50">
          <div
            className={cn(
              'relative h-full rounded-full transition-all duration-1000 ease-out',
              isSuccess ? 'bg-success' : 'bg-destructive/80',
            )}
            style={{ width: `${progressPercent}%` }}
          />

          {MEDAL_ORDER.map((tier) => {
            const pct = Math.min(100, markers[tier] * 100);
            const earned = scoreRatio >= markers[tier];
            return (
              <div
                key={tier}
                className={cn(
                  'absolute bottom-0 top-0 z-20 w-px',
                  earned ? 'bg-foreground/90 shadow-[0_0_8px_hsl(var(--foreground)/0.5)]' : 'bg-muted-foreground/35',
                )}
                style={{ left: `${pct}%` }}
                aria-hidden
              />
            );
          })}
        </div>

        <div className="pointer-events-none relative mt-0.5 h-3.5 w-full">
          <span className="absolute left-0 top-0 text-[9px] font-bold tabular-nums text-muted-foreground">
            0
          </span>
          {MEDAL_ORDER.map((tier) => {
            const pct = Math.min(100, markers[tier] * 100);
            const earned = scoreRatio >= markers[tier];
            const required = Math.round(markers[tier] * maxPossibleScore);
            const meta = getMedalMeta(tier);
            return (
              <span
                key={tier}
                className={cn(
                  'absolute top-0 -translate-x-1/2 text-[9px] font-black tabular-nums',
                  earned ? meta?.textClass : 'text-muted-foreground/50',
                )}
                style={{ left: `${pct}%` }}
              >
                {required}
              </span>
            );
          })}
          <span className="absolute right-0 top-0 text-[9px] font-bold tabular-nums text-muted-foreground">
            {maxPossibleScore}
          </span>
        </div>
      </div>

      {hint && (
        <p
          className={cn(
            'mt-2 text-center text-xs font-medium',
            isSuccess ? 'text-success/90' : 'text-muted-foreground',
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
