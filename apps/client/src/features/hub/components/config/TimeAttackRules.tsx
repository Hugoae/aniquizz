import { Timer } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import {
  TIME_ATTACK_BUDGETS_SECONDS,
  normalizeTimeBudgetSeconds,
  timeAttackPoolSize,
} from '@aniquizz/shared';
import { SectionHeader, OptionButton } from './ConfigPrimitives';

interface TimeAttackRulesProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
}

const BUDGET_HELP =
  'Le chrono ne tourne que pendant le guess. Un skip retire 5 secondes, une erreur 3 secondes.';

export function TimeAttackRules({ config, update }: TimeAttackRulesProps) {
  const budget = normalizeTimeBudgetSeconds(config.timeBudgetSeconds);

  return (
    <div className="space-y-3">
      <SectionHeader
        icon={Timer}
        title="Durée"
        tooltip="Budget de guess, hors intro, révélation et pause."
      />
      <div className="grid grid-cols-4 gap-2">
        {TIME_ATTACK_BUDGETS_SECONDS.map((seconds) => {
          const minutes = seconds / 60;
          const active = budget === seconds;
          return (
            <OptionButton
              key={seconds}
              active={active}
              onClick={() =>
                update({
                  timeBudgetSeconds: seconds,
                  soundCount: timeAttackPoolSize(seconds),
                })
              }
              className="flex flex-col items-center gap-0.5 p-2.5 text-center"
            >
              <span className="text-sm font-bold tabular-nums">{minutes} min</span>
            </OptionButton>
          );
        })}
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">{BUDGET_HELP}</p>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Typing obligatoire · départ au début du clip · {timeAttackPoolSize(budget)} titres préparés.
      </p>
      <div className="flex items-center gap-2 text-xs font-medium text-accent">
        <Timer className="h-3.5 w-3.5" aria-hidden="true" />
        <span>
          {budget / 60} min de chrono · {timeAttackPoolSize(budget)} titres max
        </span>
      </div>
    </div>
  );
}
