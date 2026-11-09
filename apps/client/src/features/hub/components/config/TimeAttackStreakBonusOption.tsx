import { Flame } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import {
  TIME_ATTACK_STREAK_BONUS_MAX_SECONDS,
  TIME_ATTACK_STREAK_BONUS_MIN_SECONDS,
  TIME_ATTACK_STREAK_MAX,
  TIME_ATTACK_STREAK_MIN,
  normalizeTimeAttackStreakBonusSeconds,
  normalizeTimeAttackStreakLength,
  normalizeTimeBudgetSeconds,
  timeAttackPoolSize,
} from '@aniquizz/shared';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { SectionHeader } from './ConfigPrimitives';

interface TimeAttackStreakBonusOptionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
}

/** Contre-la-montre only. Off by default. Stays as tall as the skip row beside it. */
export function TimeAttackStreakBonusOption({ config, update }: TimeAttackStreakBonusOptionProps) {
  const enabled = config.timeAttackStreakBonus === true;
  const length = normalizeTimeAttackStreakLength(config.timeAttackStreakLength);
  const seconds = normalizeTimeAttackStreakBonusSeconds(config.timeAttackStreakBonusSeconds);
  const budget = normalizeTimeBudgetSeconds(config.timeBudgetSeconds);

  const apply = (patch: Partial<RoomConfig>) => {
    const next = { ...config, ...patch };
    update({
      ...patch,
      soundCount: timeAttackPoolSize(budget, next.timeAttackStreakBonus === true),
    });
  };

  return (
    <div className="flex h-full flex-col space-y-2">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <SectionHeader
          icon={Flame}
          title="Prime de série"
          className="mb-0 min-w-0 [&_h3]:truncate"
          tooltip="Activée, chaque série de titres trouvés d'affilée rend du temps. Le compteur ne retombe pas après la prime. Passer et un titre raté cassent la série. Une mauvaise réponse sur le titre en cours retire 3 secondes sans la casser. Plafond : l'équivalent de la durée choisie, en plus."
        />
        <Switch
          checked={enabled}
          onCheckedChange={(checked) =>
            checked
              ? apply({
                  timeAttackStreakBonus: true,
                  timeAttackStreakLength: length,
                  timeAttackStreakBonusSeconds: seconds,
                })
              : apply({ timeAttackStreakBonus: false })
          }
          aria-label={enabled ? 'Prime de série activée' : 'Prime de série désactivée'}
        />
      </div>
      <div
        className={cn(
          'flex flex-1 flex-col justify-center gap-2',
          !enabled && 'pointer-events-none opacity-50',
        )}
      >
        <div className="flex items-center gap-2">
          <span className="w-11 shrink-0 text-[11px] font-medium text-muted-foreground">Série</span>
          <Slider
            aria-label="Titres trouvés d'affilée pour la prime"
            disabled={!enabled}
            value={[length]}
            min={TIME_ATTACK_STREAK_MIN}
            max={TIME_ATTACK_STREAK_MAX}
            step={1}
            onValueChange={(v) => apply({ timeAttackStreakLength: v[0] ?? length })}
          />
          <span className="w-12 shrink-0 text-right font-mono text-xs font-bold tabular-nums text-primary">
            {length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-11 shrink-0 text-[11px] font-medium text-muted-foreground">Temps</span>
          <Slider
            aria-label="Secondes gagnées par prime"
            disabled={!enabled}
            value={[seconds]}
            min={TIME_ATTACK_STREAK_BONUS_MIN_SECONDS}
            max={TIME_ATTACK_STREAK_BONUS_MAX_SECONDS}
            step={1}
            onValueChange={(v) => apply({ timeAttackStreakBonusSeconds: v[0] ?? seconds })}
          />
          <span className="w-12 shrink-0 text-right font-mono text-xs font-bold tabular-nums text-aqua">
            +{seconds} s
          </span>
        </div>
      </div>
    </div>
  );
}
