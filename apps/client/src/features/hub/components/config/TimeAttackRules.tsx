import { Timer } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import {
  TIME_ATTACK_BUDGET_STEP_SECONDS,
  TIME_ATTACK_MAX_BUDGET_SECONDS,
  TIME_ATTACK_MIN_BUDGET_SECONDS,
  normalizeTimeBudgetSeconds,
  timeAttackPoolSize,
} from '@aniquizz/shared';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { formatTimeAttackBudget } from './timeAttackBudgetLabel';
import { TimeAttackPunitiveSkipOption } from './TimeAttackPunitiveSkipOption';
import { TimeAttackStreakBonusOption } from './TimeAttackStreakBonusOption';

interface TimeAttackRulesProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
}

export function TimeAttackRules({ config, update }: TimeAttackRulesProps) {
  const budget = normalizeTimeBudgetSeconds(config.timeBudgetSeconds);
  const prime = config.timeAttackStreakBonus === true;
  const pool = timeAttackPoolSize(budget, prime);

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <Label>Durée</Label>
          <span className="font-mono font-bold text-primary">{formatTimeAttackBudget(budget)}</span>
        </div>
        <Slider
          aria-label="Durée du chrono"
          className="w-full"
          value={[budget]}
          min={TIME_ATTACK_MIN_BUDGET_SECONDS}
          max={TIME_ATTACK_MAX_BUDGET_SECONDS}
          step={TIME_ATTACK_BUDGET_STEP_SECONDS}
          onValueChange={(v) => {
            const seconds = v[0] ?? budget;
            update({
              timeBudgetSeconds: seconds,
              soundCount: timeAttackPoolSize(seconds, prime),
            });
          }}
        />
        <div className="flex items-center gap-2 text-xs font-medium text-accent">
          <Timer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">
            {formatTimeAttackBudget(budget)} de chrono · {pool} titres max
            {prime ? ` · prime jusqu'à +${formatTimeAttackBudget(budget)}` : ''}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 items-stretch gap-3">
        <TimeAttackPunitiveSkipOption config={config} update={update} />
        <TimeAttackStreakBonusOption config={config} update={update} />
      </div>
    </div>
  );
}
