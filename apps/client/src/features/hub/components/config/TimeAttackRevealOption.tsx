import { Zap } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import { TIME_ATTACK_REVEAL_SECONDS } from '@aniquizz/shared';
import { pick, tx } from '@/lib/i18n/text';
import { SectionHeader, OptionButton } from './ConfigPrimitives';

interface TimeAttackRevealOptionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
}

/** Contre-la-montre only: keep or drop the short reveal after a found / missed title. */
export function TimeAttackRevealOption({ config, update }: TimeAttackRevealOptionProps) {
  const reveal = config.timeAttackReveal !== false;
  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/10 p-3">
      <SectionHeader
        icon={Zap}
        title={tx('hub', 'config.revealTitle')}
        tooltip={tx('hub', 'config.timeRevealHint', { seconds: TIME_ATTACK_REVEAL_SECONDS })}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <OptionButton
          active={reveal}
          onClick={() => update({ timeAttackReveal: true })}
          className="flex flex-col items-start gap-1 p-3 text-left"
        >
          <span className="text-[11px] font-bold uppercase">
            {pick(
              `Avec révélation (${TIME_ATTACK_REVEAL_SECONDS} s)`,
              `With reveal (${TIME_ATTACK_REVEAL_SECONDS} s)`,
            )}
          </span>
          <span className="text-[10px] leading-snug text-muted-foreground">
            {pick(
              'Le temps de voir la réponse, sans perdre de chrono.',
              'Time to see the answer, without losing clock time.',
            )}
          </span>
        </OptionButton>
        <OptionButton
          active={!reveal}
          onClick={() => update({ timeAttackReveal: false })}
          className="flex flex-col items-start gap-1 p-3 text-left"
        >
          <span className="text-[11px] font-bold uppercase">
            {pick('Sans révélation', 'No reveal')}
          </span>
          <span className="text-[10px] leading-snug text-muted-foreground">
            {pick(
              'Enchaînement immédiat, partie plus nerveuse.',
              'The next song starts at once. A tighter match.',
            )}
          </span>
        </OptionButton>
      </div>
    </div>
  );
}
