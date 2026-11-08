import { TrendingUp } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import { SectionHeader, OptionButton } from './ConfigPrimitives';

interface TimeAttackPunitiveSkipOptionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
}

/** Contre-la-montre only: escalating skip tax, on by default. */
export function TimeAttackPunitiveSkipOption({
  config,
  update,
}: TimeAttackPunitiveSkipOptionProps) {
  const punitive = config.timeAttackPunitiveSkip !== false;
  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/10 p-3">
      <SectionHeader
        icon={TrendingUp}
        title="Skip punitif"
        tooltip="Activé, chaque skip coûte 2 secondes de plus (5, puis 7, 9… jusqu’à 15). Désactivé, chaque skip retire 5 secondes."
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <OptionButton
          active={punitive}
          onClick={() => update({ timeAttackPunitiveSkip: true })}
          className="flex flex-col items-start gap-1 p-3 text-left"
        >
          <span className="text-[11px] font-bold uppercase">Activé</span>
          <span className="text-[10px] leading-snug text-muted-foreground">
            5 s, puis 7, 9… jusqu’à 15 s.
          </span>
        </OptionButton>
        <OptionButton
          active={!punitive}
          onClick={() => update({ timeAttackPunitiveSkip: false })}
          className="flex flex-col items-start gap-1 p-3 text-left"
        >
          <span className="text-[11px] font-bold uppercase">Désactivé</span>
          <span className="text-[10px] leading-snug text-muted-foreground">
            Chaque skip retire 5 secondes.
          </span>
        </OptionButton>
      </div>
    </div>
  );
}
