import { Medal } from 'lucide-react';
import { getMedalMeta, type Medal as MedalTier, type TimeAttackNextMedal } from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { GAME_COPY } from '@/features/game/copy/gameCopy';

const MEDAL_ORDER: MedalTier[] = ['bronze', 'silver', 'gold', 'platinum'];

/** Next time-attack medal, or `'max'` once platinum is already reached. */
export type TimeAttackMedalCueState = TimeAttackNextMedal | 'max';

/**
 * Quiet medal progress for the solo header: the four medal icons, the next
 * one carrying how many titles are left. The sentence stays on the tooltip
 * and the accessible name.
 */
export function TimeAttackMedalCue({ medal }: { medal: TimeAttackMedalCueState }) {
  const nextIndex = medal === 'max' ? MEDAL_ORDER.length : MEDAL_ORDER.indexOf(medal.tier);
  const label =
    medal === 'max'
      ? GAME_COPY.timeAttack.topMedal
      : GAME_COPY.timeAttack.nextMedal(medal.pointsNeeded, medal.tier);

  return (
    <span className="inline-flex items-center gap-1.5" title={label} aria-label={label}>
      {MEDAL_ORDER.map((tier, index) => {
        const meta = getMedalMeta(tier);
        const earned = index < nextIndex;
        const current = index === nextIndex;
        return (
          <span key={tier} className="inline-flex items-center gap-0.5">
            <Medal
              className={cn(
                'h-3.5 w-3.5',
                earned || current ? meta?.textClass : 'text-muted-foreground/35',
              )}
              aria-hidden
            />
            {current && medal !== 'max' && (
              <span className="font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">
                {medal.pointsNeeded}
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
