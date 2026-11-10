import { Medal } from 'lucide-react';
import { getMedalMeta, type Medal as MedalTier, type SoloMedalTargets } from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { GAME_COPY } from '@/features/game/copy/gameCopy';

const MEDAL_ORDER: MedalTier[] = ['bronze', 'silver', 'gold', 'platinum'];

export interface SoloMedalRailModel {
  /** Chrono counts titles. The other solo modes count points. */
  unit: 'found' | 'points';
  current: number;
  targets: SoloMedalTargets;
}

/**
 * Solo medal ladder under the player card. Only the next locked tier shows its
 * threshold. Later tiers stay a question mark until the one before them is earned.
 */
export function SoloMedalRail({ rail }: { rail: SoloMedalRailModel }) {
  const nextIndex = MEDAL_ORDER.findIndex((tier) => rail.current < rail.targets[tier]);

  return (
    <div
      className="mt-3 flex w-full max-w-[850px] items-start justify-center gap-4 sm:gap-6"
      aria-label={GAME_COPY.soloMedals.rail}
    >
      {MEDAL_ORDER.map((tier, index) => {
        const meta = getMedalMeta(tier);
        const target = rail.targets[tier];
        const name = meta?.label ?? tier;
        const earned = rail.current >= target;
        const revealed = nextIndex === -1 || index <= nextIndex;
        const at =
          rail.unit === 'found'
            ? GAME_COPY.soloMedals.atFound(target, name)
            : GAME_COPY.soloMedals.atPoints(target, name);
        const label = !revealed
          ? GAME_COPY.soloMedals.hidden(name)
          : earned
            ? `${GAME_COPY.soloMedals.earned(name)}, ${at}`
            : at;
        return (
          <span
            key={tier}
            className="flex min-w-[4.25rem] flex-col items-center gap-1"
            aria-label={label}
            title={label}
          >
            <Medal
              className={cn('h-8 w-8', earned ? meta?.textClass : 'text-muted-foreground/35')}
              aria-hidden
            />
            <span className="text-xs font-medium text-muted-foreground">{name}</span>
            <span
              className={cn(
                'h-5 font-mono text-sm font-bold tabular-nums',
                earned ? meta?.textClass : 'text-muted-foreground',
              )}
            >
              {revealed ? target : '?'}
            </span>
          </span>
        );
      })}
    </div>
  );
}
