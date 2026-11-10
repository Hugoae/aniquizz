import { Medal as MedalIcon } from 'lucide-react';
import {
  getMedalMeta,
  medalMarkerScores,
  nextMedalGoal,
  normalizePrecision,
  timeAttackMedalTargets,
  timeAttackNextMedalGoal,
  type TimeAttackMedalRules,
  normalizeTimeBudgetSeconds,
  type Medal,
  type MedalTier,
  type Precision,
} from '@aniquizz/shared';
import { cn } from '@/lib/utils';

interface SoloMasteryBarProps {
  score: number;
  maxPossibleScore: number;
  isSuccess: boolean;
  soloMedal: MedalTier;
  songDifficulties: string[];
  precision?: Precision;
  timeAttack?: boolean;
  timeBudgetSeconds?: number;
  medalRules?: TimeAttackMedalRules | null;
  evolving?: boolean;
}

const MEDAL_ORDER: Medal[] = ['bronze', 'silver', 'gold', 'platinum'];

function goalMessage(
  score: number,
  maxPossibleScore: number,
  difficulties: string[],
  soloMedal: MedalTier,
  precision?: Precision,
  timeAttack?: boolean,
  timeBudgetSeconds?: number,
  medalRules?: TimeAttackMedalRules | null,
  evolving = false,
): string | null {
  const goal = timeAttack
    ? timeAttackNextMedalGoal(
        score,
        normalizeTimeBudgetSeconds(timeBudgetSeconds),
        difficulties,
        soloMedal,
        precision,
        medalRules,
      )
    : nextMedalGoal(score, maxPossibleScore, difficulties, soloMedal, precision, evolving);
  if (goal) {
    const unit = timeAttack
      ? goal.pointsNeeded === 1
        ? 'titre'
        : 'titres'
      : goal.pointsNeeded === 1
        ? 'pt'
        : 'pts';
    return `Encore ${goal.pointsNeeded} ${unit} pour la Médaille ${goal.label}`;
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
  precision,
  timeAttack = false,
  timeBudgetSeconds,
  medalRules,
  evolving = false,
}: SoloMasteryBarProps) {
  const resolvedPrecision = normalizePrecision(precision);
  const markerScores = timeAttack
    ? timeAttackMedalTargets(
        normalizeTimeBudgetSeconds(timeBudgetSeconds),
        songDifficulties,
        resolvedPrecision,
        medalRules,
      )
    : medalMarkerScores(maxPossibleScore, songDifficulties, resolvedPrecision, evolving);
  const hint = goalMessage(
    score,
    maxPossibleScore,
    songDifficulties,
    soloMedal,
    resolvedPrecision,
    timeAttack,
    timeBudgetSeconds,
    medalRules,
    evolving,
  );

  return (
    <div className="z-10 w-full">
      <div className="grid grid-cols-4 gap-2">
        {MEDAL_ORDER.map((tier) => {
          const required = markerScores[tier];
          const earned = score >= required;
          const meta = getMedalMeta(tier);
          return (
            <div key={tier} className="flex min-w-0 flex-col items-center gap-1 text-center">
              <MedalIcon
                className={cn('h-5 w-5', earned ? meta?.textClass : 'text-muted-foreground/35')}
                aria-hidden
              />
              <span className="text-[11px] font-medium leading-none text-muted-foreground">
                {meta?.label ?? tier}
              </span>
              <span
                className={cn(
                  'font-mono text-sm font-bold tabular-nums leading-none',
                  earned ? meta?.textClass : 'text-muted-foreground',
                )}
              >
                {required}
              </span>
            </div>
          );
        })}
      </div>

      {hint && (
        <p
          className={cn(
            'mt-3 text-center text-xs font-medium',
            isSuccess ? 'text-success/90' : 'text-muted-foreground',
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
