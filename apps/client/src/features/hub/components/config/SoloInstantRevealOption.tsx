import { Zap } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import { SectionHeader, OptionButton } from './ConfigPrimitives';

interface SoloInstantRevealOptionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
}

/** Solo Standard only: reveal the clip as soon as the answer is sent. */
export function SoloInstantRevealOption({ config, update }: SoloInstantRevealOptionProps) {
  const instant = config.soloInstantReveal === true;
  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/10 p-3">
      <SectionHeader
        icon={Zap}
        title="Révélation"
        tooltip="Après l'envoi, le clip et la réponse s'affichent sans attendre le bouton. Sinon, la révélation attend la fin du temps ou le bouton."
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <OptionButton
          active={!instant}
          onClick={() => update({ soloInstantReveal: false })}
          className="flex flex-col items-start gap-1 p-3 text-left"
        >
          <span className="text-[11px] font-bold uppercase">Attendre</span>
          <span className="text-[10px] leading-snug text-muted-foreground">
            La réponse s'affiche à la fin du temps, ou quand vous le demandez.
          </span>
        </OptionButton>
        <OptionButton
          active={instant}
          onClick={() => update({ soloInstantReveal: true })}
          className="flex flex-col items-start gap-1 p-3 text-left"
        >
          <span className="text-[11px] font-bold uppercase">Tout de suite</span>
          <span className="text-[10px] leading-snug text-muted-foreground">
            Dès l'envoi, le clip et la réponse s'affichent.
          </span>
        </OptionButton>
      </div>
    </div>
  );
}
