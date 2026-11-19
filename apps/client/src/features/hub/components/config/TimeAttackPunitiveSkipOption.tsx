import { Minus, TrendingUp } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import { pick, tx } from '@/lib/i18n/text';
import { SectionHeader, OptionButton } from './ConfigPrimitives';

interface TimeAttackPunitiveSkipOptionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
}

/** Contre-la-montre only: escalating skip tax, on by default. Same height as a Standard option row. */
export function TimeAttackPunitiveSkipOption({
  config,
  update,
}: TimeAttackPunitiveSkipOptionProps) {
  const punitive = config.timeAttackPunitiveSkip !== false;
  return (
    <div className="space-y-2">
      <SectionHeader
        icon={TrendingUp}
        title={tx('hub', 'config.skipTitle')}
        tooltip={tx('hub', 'config.skipHint')}
      />
      <div className="grid grid-cols-2 gap-2">
        <OptionButton
          active={punitive}
          aria-label={pick('Skip punitif activé', 'Escalating skip on')}
          onClick={() => update({ timeAttackPunitiveSkip: true })}
          className="flex flex-col items-center gap-1 p-2 text-center"
        >
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase">{pick('Activé', 'On')}</span>
          <span className="text-[9px] leading-tight text-muted-foreground">5, 7, 9… s</span>
        </OptionButton>
        <OptionButton
          active={!punitive}
          aria-label={pick('Skip punitif désactivé', 'Escalating skip off')}
          onClick={() => update({ timeAttackPunitiveSkip: false })}
          className="flex flex-col items-center gap-1 p-2 text-center"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase">{pick('Désactivé', 'Off')}</span>
          <span className="text-[9px] leading-tight text-muted-foreground">
            {pick('5 s fixes', 'Fixed 5 s')}
          </span>
        </OptionButton>
      </div>
    </div>
  );
}
